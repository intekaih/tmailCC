/**
 * Developer API Routes - Delete API Key
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyToken, getProfile } from '@/lib/auth';
import { encrypt } from '@/lib/encryption';

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

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function generateApiKey(): { raw: string; prefix: string; hash: string; hint: string } {
  const raw = 'tmail_' + crypto.randomBytes(24).toString('hex');
  const hash = hashApiKey(raw);
  const prefix = raw.slice(0, 12);
  const hint = '****' + raw.slice(-4);
  return { raw, prefix, hash, hint };
}

/**
 * DELETE /api/developer/keys/[id] - Revoke API key
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const user = auth.user!;
  const { id } = await params;

  try {
    // First verify the key belongs to this user
    const { data: existingKey, error: fetchError } = await supabaseAdmin!
      .from('api_keys')
      .select('id, user_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      console.error('[Developer] Failed to fetch API key:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch API key' }, { status: 500 });
    }

    if (!existingKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    if (existingKey.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const action = request.nextUrl.searchParams.get('action') || 'delete';

    if (action === 'revoke') {
      // Revoke by setting is_active to false
      const { error: updateError } = await supabaseAdmin!
        .from('api_keys')
        .update({ is_active: false })
        .eq('id', id);

      if (updateError) {
        console.error('[Developer] Failed to revoke API key:', updateError);
        return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 });
      }

      return NextResponse.json({ message: 'API key revoked' });
    } else {
      // Permanent delete from database
      const { error: deleteError } = await supabaseAdmin!
        .from('api_keys')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('[Developer] Failed to delete API key:', deleteError);
        return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 });
      }

      return NextResponse.json({ message: 'API key deleted permanently' });
    }
  } catch (err) {
    console.error('[Developer] DELETE /keys/:id error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/developer/keys/[id] - Rotate API key
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const user = auth.user!;
  const { id } = await params;

  try {
    // First verify the key belongs to this user
    const { data: existingKey, error: fetchError } = await supabaseAdmin!
      .from('api_keys')
      .select('id, user_id, name')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      console.error('[Developer] Failed to fetch API key:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch API key' }, { status: 500 });
    }

    if (!existingKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    if (existingKey.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { raw, prefix, hash, hint } = generateApiKey();
    const encryptedKey = encrypt(raw);

    // Update prefix, key_hash, key_hint, and restore active status
    const { data: updatedKey, error: updateError } = await supabaseAdmin!
      .from('api_keys')
      .update({
        prefix: encryptedKey,
        key_hash: hash,
        key_hint: hint,
        is_active: true,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[Developer] Failed to rotate API key:', updateError);
      return NextResponse.json({ error: 'Failed to rotate API key' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedKey.id,
        name: updatedKey.name,
        key: raw,
        prefix: updatedKey.key_hint,
        scopes: updatedKey.scopes,
        expiresAt: updatedKey.expires_at,
        createdAt: updatedKey.created_at,
      }
    });
  } catch (err) {
    console.error('[Developer] PATCH /keys/:id error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
