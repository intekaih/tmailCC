/**
 * Admin Dotmail Management API Routes
 * 
 * GET    /api/admin/dotmails                      - List parents + dotmails
 * GET    /api/admin/dotmails?action=otp&address=x  - Fetch OTP via IMAP
 * POST   /api/admin/dotmails                      - Actions: add-parent, delete-parent, generate, delete-dotmail
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyToken, getProfile } from '@/lib/auth';

async function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'No token provided', status: 401 };
  }
  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return { error: 'Invalid or expired token', status: 401 };
  }
  const profile = await getProfile(decoded.sub);
  if (!profile) {
    return { error: 'User not found', status: 401 };
  }
  if (!profile.is_active) {
    return { error: 'Account is disabled', status: 403 };
  }
  if (profile.role !== 'admin') {
    return { error: 'Admin access required', status: 403 };
  }
  return { user: { ...decoded, ...profile } };
}

// ============================================
// OTP Extraction Helpers
// ============================================
function stripHtml(html: string): string {
  return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractOTP(text: string): string | null {
  // Support 4-8 digit OTP codes from any service
  const patterns = [
    /(?:verification|verify|code|mã|xác minh|xác nhận|confirm)[^\d]{0,30}(\d{4,8})/i,
    /(\d{4,8})[^\d]{0,30}(?:verification|verify|code|mã|xác minh)/i,
    /\b(\d{6})\b/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1];
  }
  return null;
}

// ============================================
// Gmail Dotmail Generator (single dot only)
// ============================================
function generateSingleDotVariants(email: string): string[] {
  const [local, domain] = email.toLowerCase().split('@');
  if (!domain || !domain.includes('gmail.com')) {
    throw new Error('Only Gmail (@gmail.com) is supported');
  }
  const cleanLocal = local.replace(/\./g, '');
  if (cleanLocal.length < 2) return [];

  const variants: string[] = [];
  for (let i = 1; i < cleanLocal.length; i++) {
    const variant = cleanLocal.slice(0, i) + '.' + cleanLocal.slice(i);
    variants.push(`${variant}@${domain}`);
  }
  return variants;
}

function normalizeDotmail(email: string): string {
  const [local, domain] = email.toLowerCase().split('@');
  if (!domain) return email;
  return `${local.replace(/\./g, '')}@${domain}`;
}

// ============================================
// IMAP OTP Fetcher
// ============================================
async function fetchOTPFromGmail(parentEmail: string, appPassword: string, dotmailAddress: string): Promise<{ otp: string | null; from: string; subject: string }> {
  // Dynamic require to avoid webpack bundling these Node.js-only modules
  const { ImapFlow } = require('imapflow');
  const { simpleParser } = require('mailparser');

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user: parentEmail, pass: appPassword },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      const sinceDate = new Date(Date.now() - 30 * 60 * 1000); // last 30 minutes
      const messages = client.fetch(
        { since: sinceDate },
        { source: true, uid: true, envelope: true }
      );

      const emails: any[] = [];
      for await (const msg of messages) {
        try {
          const parsed = await simpleParser(msg.source);
          const emailDate = parsed.date || new Date();
          if (emailDate < sinceDate) continue;

          // Check that the email was actually sent to the specific dotmail
          const toHeader = (parsed.to?.text || '').toLowerCase();
          const deliveredTo = (parsed.headers?.get('delivered-to') || '').toString().toLowerCase();
          const headersStr = JSON.stringify(parsed.headers || {}).toLowerCase();
          const dotmailLower = dotmailAddress.toLowerCase();
          
          const isTargetDotmail = 
            toHeader.includes(dotmailLower) || 
            deliveredTo.includes(dotmailLower) ||
            headersStr.includes(dotmailLower) ||
            dotmailLower === parentEmail.toLowerCase();
            
          if (!isTargetDotmail) continue;

          const textContent = parsed.text || '';
          const htmlContent = parsed.html || '';
          const strippedHtml = stripHtml(htmlContent);
          const combinedText = `${parsed.subject || ''}\n${textContent}\n${strippedHtml}`;
          const otp = extractOTP(combinedText);

          if (otp) {
            emails.push({
              otp,
              from: parsed.from?.text || '',
              subject: parsed.subject || '',
              date: emailDate,
            });
          }
        } catch { /* skip unparseable */ }
      }

      // Sort newest first
      emails.sort((a, b) => b.date.getTime() - a.date.getTime());

      if (emails.length > 0) {
        return { otp: emails[0].otp, from: emails[0].from, subject: emails[0].subject };
      }
      return { otp: null, from: '', subject: '' };
    } finally {
      lock.release();
    }
  } catch (err: any) {
    console.error('[Dotmail OTP] IMAP error:', err.message);
    return { otp: null, from: '', subject: '' };
  } finally {
    await client.logout().catch(() => {});
  }
}

// ============================================
// GET Handler
// ============================================
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    // --- Fetch OTP for a dotmail ---
    if (action === 'otp') {
      const address = searchParams.get('address');
      if (!address) {
        return NextResponse.json({ error: 'address is required' }, { status: 400 });
      }

      // Find parent Gmail for this dotmail
      const normalized = normalizeDotmail(address);
      const { data: parent } = await supabaseAdmin!
        .from('gmail_parents')
        .select('address, app_password')
        .eq('address', normalized)
        .maybeSingle();

      if (!parent) {
        return NextResponse.json({ error: 'Parent Gmail not found for this dotmail' }, { status: 404 });
      }

      const result = await fetchOTPFromGmail(parent.address, parent.app_password, address);
      return NextResponse.json(result);
    }

    // --- Default: List all parents with nested dotmails ---
    const { data: parents, error: pErr } = await supabaseAdmin!
      .from('gmail_parents')
      .select('*')
      .order('created_at', { ascending: false });

    if (pErr) {
      return NextResponse.json({ error: 'Failed to fetch parents' }, { status: 500 });
    }

    const result = [];
    for (const parent of (parents || [])) {
      const { data: dotmails } = await supabaseAdmin!
        .from('gmail_dotmails')
        .select('*')
        .eq('parent_id', parent.id)
        .order('created_at', { ascending: true });

      result.push({
        ...parent,
        dotmails: dotmails || [],
      });
    }

    return NextResponse.json({ parents: result });
  } catch (err: any) {
    console.error('[Dotmail] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================
// POST Handler
// ============================================
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const action = body.action;

    // --- Add parent Gmail ---
    if (action === 'add-parent') {
      const { address, app_password } = body;
      if (!address || !app_password) {
        return NextResponse.json({ error: 'address and app_password are required' }, { status: 400 });
      }

      const [localPart, domainPart] = address.toLowerCase().split('@');
      const cleanAddress = `${localPart.replace(/\./g, '')}@${domainPart || 'gmail.com'}`;

      const { data, error } = await supabaseAdmin!
        .from('gmail_parents')
        .upsert({ address: cleanAddress, app_password }, { onConflict: 'address' })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: 'Failed to add parent' }, { status: 500 });
      }
      return NextResponse.json({ parent: data }, { status: 201 });
    }

    // --- Delete parent Gmail ---
    if (action === 'delete-parent') {
      const { id } = body;
      if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

      const { error } = await supabaseAdmin!
        .from('gmail_parents')
        .delete()
        .eq('id', id);

      if (error) {
        return NextResponse.json({ error: 'Failed to delete parent' }, { status: 500 });
      }
      return NextResponse.json({ message: 'Parent deleted' });
    }

    // --- Generate single-dot dotmails ---
    if (action === 'generate') {
      const { parent_id } = body;
      if (!parent_id) return NextResponse.json({ error: 'parent_id is required' }, { status: 400 });

      const { data: parent } = await supabaseAdmin!
        .from('gmail_parents')
        .select('address')
        .eq('id', parent_id)
        .single();

      if (!parent) {
        return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
      }

      const variants = generateSingleDotVariants(parent.address);
      const rows = variants.map(v => ({
        parent_id,
        address: v,
      }));

      // Upsert to avoid duplicates
      const { data: inserted, error } = await supabaseAdmin!
        .from('gmail_dotmails')
        .upsert(rows, { onConflict: 'address', ignoreDuplicates: true })
        .select();

      if (error) {
        console.error('[Dotmail] Generate error:', error);
        return NextResponse.json({ error: 'Failed to generate dotmails' }, { status: 500 });
      }

      return NextResponse.json({ dotmails: inserted || [], total: variants.length });
    }

    // --- Delete a dotmail ---
    if (action === 'delete-dotmail') {
      const { id } = body;
      if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

      const { error } = await supabaseAdmin!
        .from('gmail_dotmails')
        .delete()
        .eq('id', id);

      if (error) {
        return NextResponse.json({ error: 'Failed to delete dotmail' }, { status: 500 });
      }
      return NextResponse.json({ message: 'Dotmail deleted' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('[Dotmail] POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
