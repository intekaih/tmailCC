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
import { encrypt, decrypt, isEncrypted } from '@/lib/encryption';

// Static imports with graceful fallback for serverless environments
let ImapFlowModule: any = null;
let mailparserModule: any = null;
try {
  ImapFlowModule = require('imapflow');
  mailparserModule = require('mailparser');
} catch {
  // imapflow/mailparser not available in this environment
}

async function requireAuth(request: NextRequest) {
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
  if (!text) return null;

  // Clean URLs, email addresses, and markdown link formats to avoid matching random tokens inside URLs/headers
  let content = text.replace(/https?:\/\/[^\s\]\)]+/gi, ' ');
  content = content.replace(/\[([^\]]*)\]\([^\)]*\)/g, ' $1 '); // convert [text](url) to text
  content = content.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, ' '); // remove emails

  // Normalize all unicode hyphens/dashes (like non-breaking hyphen, en-dash, em-dash) to standard ASCII hyphen
  content = content.replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212–—]/g, '-');

  // 1. Check for alphanumeric codes with a hyphen (e.g. F2P-6WP, CJN-I33, BWC-JRX)
  const hyphenMatch = content.match(/\b([A-Z0-9]{2,5}-[A-Z0-9]{2,5})\b/i);
  if (hyphenMatch) {
    const code = hyphenMatch[1].toUpperCase();
    const exclusions = ['OPT-IN', 'OPT-OUT', 'ADD-ON', 'PRE-AMP', 'E-MAIL', 'X-AI'];
    if (code.length >= 5 && code.length <= 11 && !exclusions.includes(code)) {
      return code;
    }
  }

  // 2. Pure digits of length 6 (highest priority standard numeric OTP)
  const sixDigitMatch = content.match(/\b(\d{6})\b/);
  if (sixDigitMatch) {
    return sixDigitMatch[1];
  }

  // 3. Pure digits of length 4 to 8
  const digitsMatch = content.match(/\b(\d{4,8})\b/);
  if (digitsMatch) {
    const code = digitsMatch[1];
    // Exclude years (2024-2030) to avoid false positive matching with copyright year
    if (!(code.length === 4 && /^202[4-9]|2030$/.test(code))) {
      return code;
    }
  }

  // 4. Context-based alphanumeric code matching (e.g. code: A1B2, verification: 4910)
  const contextPatterns = [
    /(?:code|mã|otp|verification|xác\s*minh|confirm|security)[:\s]+([A-Z0-9-]{4,8})/i,
    /([A-Z0-9-]{4,8})[:\s]+(?:is\s+your\s+code|là\s+mã\s+xác\s+minh)/i
  ];
  for (const pattern of contextPatterns) {
    const match = content.match(pattern);
    if (match) {
      const code = match[1];
      if (code && code.length >= 4 && code.length <= 8 && /[0-9]/.test(code)) {
        return code.toUpperCase();
      }
    }
  }

  // 5. Alphanumeric of length 4 to 8 containing both letters and digits (e.g. A1B2C3, GROK12)
  const alphaNumMatch = content.match(/\b([A-Z0-9]{4,8})\b/i);
  if (alphaNumMatch) {
    const code = alphaNumMatch[1];
    // Must contain both letters and digits to be classified as an OTP (prevent matching words like 'EMAIL')
    if (/[A-Z]/i.test(code) && /[0-9]/.test(code)) {
      return code.toUpperCase();
    }
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
async function fetchOTPFromGmail(parentEmail: string, appPassword: string, dotmailAddress: string): Promise<{ emails: any[] }> {
  // Dynamic require to avoid webpack bundling these Node.js-only modules
  if (!ImapFlowModule || !mailparserModule) {
    throw new Error('IMAP modules not available in this environment');
  }
  const { ImapFlow } = ImapFlowModule;
  const { simpleParser } = mailparserModule;

    const client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: { user: parentEmail, pass: isEncrypted(appPassword) ? decrypt(appPassword) : appPassword },
      logger: false,
    });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      const status = await client.status('INBOX', { messages: true });
      const totalMessages = status.messages || 0;

      let messages;
      if (totalMessages > 0) {
        const startSeq = Math.max(1, totalMessages - 50 + 1);
        messages = client.fetch(
          `${startSeq}:${totalMessages}`,
          { source: true, uid: true, envelope: true }
        );
      } else {
        messages = [];
      }

      const emails: any[] = [];
      for await (const msg of messages) {
        try {
          const parsed = await simpleParser(msg.source);
          const emailDate = parsed.date || new Date();

          // Parse recipient headers directly from raw message source to avoid simpleParser anomalies
          const rawSource = msg.source.toString('utf-8');
          const headerEnd = rawSource.indexOf('\r\n\r\n');
          const headersText = headerEnd !== -1 ? rawSource.substring(0, headerEnd).toLowerCase() : rawSource.toLowerCase();

          const toHeaderMatch = headersText.match(/^to:\s*([\s\S]*?)(?=\r?\n[^\s]|$)/m);
          const ccHeaderMatch = headersText.match(/^cc:\s*([\s\S]*?)(?=\r?\n[^\s]|$)/m);
          
          const toText = toHeaderMatch ? toHeaderMatch[1] : '';
          const ccText = ccHeaderMatch ? ccHeaderMatch[1] : '';
          const extractEmails = (text: string): string[] => {
            const regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            const matches = text.match(regex);
            return matches ? matches.map(m => m.toLowerCase().trim()) : [];
          };

          const targetEmail = dotmailAddress.toLowerCase().trim();
          const cleanParent = parentEmail.toLowerCase().trim();
          const recipientEmails = [...extractEmails(toText), ...extractEmails(ccText)];
          
          let isTargetDotmail = false;
          if (targetEmail === cleanParent) {
            // Mail cha có thể xem email của chính nó và toàn bộ các mail con (dotmail)
            const normalizedTarget = normalizeDotmail(targetEmail);
            isTargetDotmail = recipientEmails.some(rec => normalizeDotmail(rec) === normalizedTarget);
          } else {
            // Mail con chỉ được phép xem email gửi chính xác đến địa chỉ của nó
            isTargetDotmail = recipientEmails.includes(targetEmail);
          }
          
          console.log('[Dotmail OTP] Checking email:', {
            subject: parsed.subject,
            toHeader: toText.trim(),
            ccHeader: ccText.trim(),
            targetEmail,
            parentEmail: cleanParent,
            recipientEmails,
            isTargetDotmail
          });

          if (!isTargetDotmail) continue;

          const textContent = parsed.text || '';
          const htmlContent = parsed.html || '';
          const strippedHtml = stripHtml(htmlContent);
          const combinedText = `${parsed.subject || ''}\n${textContent}\n${strippedHtml}`;
          const otp = extractOTP(combinedText);

          const fromName = parsed.from?.value?.[0]?.name || '';
          const fromAddress = parsed.from?.value?.[0]?.address || parsed.from?.text || '';

          emails.push({
            id: msg.uid.toString(),
            otp: otp || null,
            from: fromAddress,
            fromName: fromName,
            subject: parsed.subject || '',
            body: textContent,
            html: htmlContent || textContent,
            date: emailDate.toISOString(),
          });
        } catch { /* skip unparseable */ }
      }

      // Sort newest first
      emails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return { emails };
    } finally {
      lock.release();
    }
  } catch (err: any) {
    console.error('[Dotmail OTP] IMAP error:', err.message);
    throw err;
  } finally {
    await client.logout().catch(() => {});
  }
}

// ============================================
// GET Handler
// ============================================
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const user = auth.user!;

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
        .select('address, app_password, user_id')
        .eq('address', normalized)
        .maybeSingle();

      if (!parent) {
        return NextResponse.json({ error: 'Parent Gmail not found for this dotmail' }, { status: 404 });
      }

      // Check ownership
      if (parent.user_id && parent.user_id !== user.id && user.role !== 'admin') {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      try {
        const result = await fetchOTPFromGmail(parent.address, parent.app_password, address);
        return NextResponse.json(result);
      } catch (err: any) {
        return NextResponse.json({ error: `Lỗi kết nối IMAP: ${err.message}` }, { status: 500 });
      }
    }

    // --- Default: List all parents with nested dotmails ---
    let query = supabaseAdmin!.from('gmail_parents').select('*');
    if (user.role !== 'admin') {
      query = query.eq('user_id', user.id);
    }
    const { data: parents, error: pErr } = await query.order('created_at', { ascending: false });

    if (pErr) {
      console.error('[Dotmail] pErr:', pErr);
      if (pErr.message?.includes('user_id') || pErr.code === '42703') {
        return NextResponse.json({ 
          error: 'Vui lòng chạy file di trú `supabase/user_dotmail_migration.sql` trong SQL Editor của Supabase để thêm cột `user_id` vào bảng `gmail_parents`.' 
        }, { status: 500 });
      }
      return NextResponse.json({ error: 'Failed to fetch parents', details: pErr }, { status: 500 });
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
        app_password: '********',  // Never expose password in API response
        dotmails: dotmails || [],
      });
    }

    return NextResponse.json({ parents: result });
  } catch (err: any) {
    console.error('[Dotmail] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const user = auth.user!;

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

      // Prevent regular users from hijacking or overwriting others' or admin's Gmail parents
      const { data: existingParent } = await supabaseAdmin!
        .from('gmail_parents')
        .select('user_id')
        .eq('address', cleanAddress)
        .maybeSingle();

      if (existingParent && existingParent.user_id !== user.id && user.role !== 'admin') {
        return NextResponse.json({ error: 'Địa chỉ Gmail này đã được đăng ký bởi người dùng khác' }, { status: 403 });
      }

      // Encrypt app password before storing
      const encryptedPassword = encrypt(app_password);

      const { data, error } = await supabaseAdmin!
        .from('gmail_parents')
        .upsert({ 
          address: cleanAddress, 
          app_password: encryptedPassword,
          user_id: user.id
        }, { onConflict: 'address' })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: 'Failed to add parent' }, { status: 500 });
      }
      return NextResponse.json({ parent: { ...data, app_password: '********' } }, { status: 201 });
    }

    // --- Delete parent Gmail ---
    if (action === 'delete-parent') {
      const { id } = body;
      if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

      // Verify ownership
      const { data: parent } = await supabaseAdmin!
        .from('gmail_parents')
        .select('user_id')
        .eq('id', id)
        .maybeSingle();
      if (!parent) return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
      if (parent.user_id !== user.id && user.role !== 'admin') {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      const { error } = await supabaseAdmin!
        .from('gmail_parents')
        .delete()
        .eq('id', id);

      if (error) {
        return NextResponse.json({ error: 'Failed to delete parent' }, { status: 500 });
      }
      return NextResponse.json({ message: 'Parent deleted' });
    }

    // --- Update parent Gmail ---
    if (action === 'update-parent') {
      const { id, app_password } = body;
      if (!id || !app_password) {
        return NextResponse.json({ error: 'id and app_password are required' }, { status: 400 });
      }

      // Verify ownership
      const { data: parent } = await supabaseAdmin!
        .from('gmail_parents')
        .select('user_id')
        .eq('id', id)
        .maybeSingle();
      if (!parent) return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
      if (parent.user_id !== user.id && user.role !== 'admin') {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      // Encrypt app password before updating
      const encryptedPassword = encrypt(app_password);

      const { data, error } = await supabaseAdmin!
        .from('gmail_parents')
        .update({ app_password: encryptedPassword })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: 'Failed to update parent' }, { status: 500 });
      }
      return NextResponse.json({ parent: { ...data, app_password: '********' } });
    }

    // --- Check parent Gmail live status ---
    if (action === 'check-parent') {
      const { id } = body;
      if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

      const { data: parent } = await supabaseAdmin!
        .from('gmail_parents')
        .select('address, app_password, user_id')
        .eq('id', id)
        .single();

      if (!parent) {
        return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
      }
      if (parent.user_id !== user.id && user.role !== 'admin') {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      if (!ImapFlowModule) {
        return NextResponse.json({ error: 'IMAP modules not available' }, { status: 503 });
      }
      const { ImapFlow } = ImapFlowModule;

      const client = new ImapFlow({
        host: 'imap.gmail.com',
        port: 993,
        secure: true,
        auth: { user: parent.address, pass: isEncrypted(parent.app_password) ? decrypt(parent.app_password) : parent.app_password },
        logger: false,
      });

      try {
        await client.connect();
        await client.logout().catch(() => {});
        return NextResponse.json({ success: true, message: 'Kết nối IMAP thành công! Tài khoản sẵn sàng.' });
      } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message });
      }
    }

    // --- Generate single-dot dotmails ---
    if (action === 'generate') {
      const { parent_id } = body;
      if (!parent_id) return NextResponse.json({ error: 'parent_id is required' }, { status: 400 });

      const { data: parent } = await supabaseAdmin!
        .from('gmail_parents')
        .select('address, user_id')
        .eq('id', parent_id)
        .single();

      if (!parent) {
        return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
      }
      if (parent.user_id !== user.id && user.role !== 'admin') {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      const variants = [parent.address, ...generateSingleDotVariants(parent.address)];
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

      // Verify ownership of the dotmail
      const { data: dotmail } = await supabaseAdmin!
        .from('gmail_dotmails')
        .select('parent_id')
        .eq('id', id)
        .maybeSingle();

      if (!dotmail) {
        return NextResponse.json({ error: 'Dotmail not found' }, { status: 404 });
      }

      const { data: parent } = await supabaseAdmin!
        .from('gmail_parents')
        .select('user_id')
        .eq('id', dotmail.parent_id)
        .maybeSingle();

      if (!parent || (parent.user_id !== user.id && user.role !== 'admin')) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

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
