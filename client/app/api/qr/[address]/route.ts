/**
 * QR Code Generation Route
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyToken, getProfile } from '@/lib/auth';
import { generateQRCode } from '@/lib/qrService';
import os from 'os';

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const networkInterface = interfaces[name];
    if (networkInterface) {
      for (const iface of networkInterface) {
        if ((iface.family === 'IPv4' || (iface.family as any) === 4) && !iface.internal) {
          return iface.address;
        }
      }
    }
  }
  return 'localhost';
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

  return { user: { ...decoded, ...profile, role: profile.role } };
}

/**
 * GET /api/qr/[address]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { address } = await params;
    const decodedAddress = decodeURIComponent(address).toLowerCase();
    const user = auth.user!;

    const { data: account, error } = await supabaseAdmin!.from('accounts').select('user_id').eq('address', decodedAddress).maybeSingle();

    if (error) {
      console.error('[QR] Account lookup error:', error);
      return NextResponse.json({ error: 'Failed to verify access' }, { status: 500 });
    }

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (user.role !== 'admin' && account.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    let origin = request.nextUrl.searchParams.get('origin') || request.headers.get('origin') || new URL(request.url).origin;
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      const localIp = getLocalIpAddress();
      origin = origin.replace('localhost', localIp).replace('127.0.0.1', localIp);
    }
    const quickAccessUrl = `${origin}/quick-access?addr=${encodeURIComponent(decodedAddress)}`;
    const dataUrl = await generateQRCode(quickAccessUrl);
    if (!dataUrl) {
      return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 });
    }

    return NextResponse.json({ address: decodedAddress, qrCode: dataUrl });
  } catch (err) {
    console.error('[QR] Error:', err);
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 });
  }
}
