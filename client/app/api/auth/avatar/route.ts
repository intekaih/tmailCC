/**
 * POST /api/auth/avatar - Upload user avatar to Supabase Storage
 * DELETE /api/auth/avatar - Remove user avatar
 *
 * Uses Supabase Storage bucket 'avatars' with path: {user_id}/avatar.{ext}
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyToken } from '@/lib/auth';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return map[mimeType] || 'jpg';
}

async function authenticateUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'No token provided', status: 401 };
  }

  const decoded = verifyToken(authHeader.slice(7));
  if (!decoded) {
    return { error: 'Invalid or expired token', status: 401 };
  }

  if (!supabaseAdmin) {
    return { error: 'Database not configured', status: 503 };
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, is_active')
    .eq('id', decoded.sub)
    .maybeSingle();

  if (!profile?.is_active) {
    return { error: 'Account not found or disabled', status: 403 };
  }

  return { userId: decoded.sub };
}

/**
 * POST /api/auth/avatar
 * Accepts multipart/form-data with 'avatar' file field
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateUser(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { userId } = auth;

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size: 2MB' },
        { status: 400 }
      );
    }

    const ext = getExtension(file.type);
    const storagePath = `${userId}/avatar.${ext}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Delete old avatar files (any extension) before uploading new one
    const { data: existingFiles } = await supabaseAdmin!.storage
      .from('avatars')
      .list(userId);

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map((f) => `${userId}/${f.name}`);
      await supabaseAdmin!.storage.from('avatars').remove(filesToDelete);
    }

    // Upload new avatar to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin!.storage
      .from('avatars')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: true,
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('[Avatar] Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload avatar' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin!.storage
      .from('avatars')
      .getPublicUrl(storagePath);

    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    // Update profile with avatar URL
    const { error: updateError } = await supabaseAdmin!
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId);

    if (updateError) {
      console.error('[Avatar] Profile update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    console.log(`[Avatar] Uploaded for user ${userId}: ${storagePath}`);

    return NextResponse.json({
      message: 'Avatar uploaded successfully',
      avatarUrl,
    });
  } catch (err) {
    console.error('[Avatar] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Failed to upload avatar' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/avatar
 * Remove user avatar from Storage and clear profile URL
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateUser(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { userId } = auth;

    // List and delete all files in user's avatar folder
    const { data: existingFiles } = await supabaseAdmin!.storage
      .from('avatars')
      .list(userId);

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map((f) => `${userId}/${f.name}`);
      await supabaseAdmin!.storage.from('avatars').remove(filesToDelete);
    }

    // Clear avatar URL in profile
    const { error: updateError } = await supabaseAdmin!
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', userId);

    if (updateError) {
      console.error('[Avatar] Profile clear error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    console.log(`[Avatar] Removed for user ${userId}`);

    return NextResponse.json({ message: 'Avatar removed successfully' });
  } catch (err) {
    console.error('[Avatar] Delete error:', err);
    return NextResponse.json(
      { error: 'Failed to remove avatar' },
      { status: 500 }
    );
  }
}
