'use server';

/**
 * tmailCC - Server Actions
 * 
 * Server Actions cho các mutations chính của ứng dụng.
 * Sử dụng Supabase Admin client trực tiếp (server-side).
 * 
 * Đây là Next.js Server Actions (React Server Functions) -
 * chạy server-side, có thể gọi từ Client Components.
 */
import { supabaseAdmin } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { generateGuestToken } from '@/lib/guestAuth';

// ============================================
// TYPES
// ============================================

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

interface AccountData {
  _id: string;
  id: string;
  address: string;
  localPart: string;
  domain: string;
  user?: string;
  createdAt: string;
  lastActivity: string;
  emailCount: number;
}

// ============================================
// HELPERS
// ============================================

/**
 * Get authenticated user from Supabase session (cookie-based)
 */
async function getAuthenticatedUser() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    // Get profile
    if (!supabaseAdmin) return null;
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, username, role, is_active')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || !profile.is_active) return null;
    return profile;
  } catch {
    return null;
  }
}

function generateRandomString(length = 12): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function formatAccountRow(row: any): AccountData {
  return {
    _id: row.id,
    id: row.id,
    address: row.address,
    localPart: row.local_part,
    domain: row.domain,
    user: row.user_id,
    createdAt: row.created_at,
    lastActivity: row.last_activity,
    emailCount: row.email_count || 0,
  };
}

// ============================================
// ACCOUNT ACTIONS
// ============================================

/**
 * Server Action: Create a new email account
 */
export async function createAccountAction(
  localPart: string,
  domain: string
): Promise<ActionResult<AccountData>> {
  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Database not configured' };
    }

    const user = await getAuthenticatedUser();
    const userId = user?.id || null;

    // Verify domain exists and is active
    const { data: domainDoc, error: domainError } = await supabaseAdmin
      .from('domains')
      .select('id, domain')
      .eq('domain', domain.toLowerCase())
      .eq('is_active', true)
      .maybeSingle();

    if (domainError || !domainDoc) {
      return { success: false, error: 'Domain not available or inactive' };
    }

    const safePart = localPart.trim() || generateRandomString(12);
    const address = `${safePart}@${domain}`.toLowerCase();

    // Check if already exists
    const { data: existing } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('address', address)
      .maybeSingle();

    if (existing) {
      return { success: true, data: formatAccountRow(existing) };
    }

    // Create account with guest token if not authenticated
    const isGuestAccount = userId === null;
    const guestTokenData = isGuestAccount ? generateGuestToken() : null;

    const { data: account, error: insertError } = await supabaseAdmin
      .from('accounts')
      .insert({
        address,
        local_part: safePart,
        domain: domain.toLowerCase(),
        user_id: userId,
        guest_owner_token_hash: guestTokenData?.hash || null,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return { success: false, error: 'Address already exists' };
      }
      return { success: false, error: 'Failed to create account' };
    }

    revalidatePath('/');
    const formatted = formatAccountRow(account);
    return {
      success: true,
      data: guestTokenData
        ? { ...formatted, guestToken: guestTokenData.token } as any
        : formatted,
    };
  } catch (err) {
    console.error('[ServerAction] createAccount error:', err);
    return { success: false, error: 'Failed to create account' };
  }
}

/**
 * Server Action: Delete an email account
 */
export async function deleteAccountAction(
  address: string
): Promise<ActionResult> {
  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Database not configured' };
    }

    const user = await getAuthenticatedUser();

    const { data: account, error: lookupError } = await supabaseAdmin
      .from('accounts')
      .select('id, user_id')
      .eq('address', address.toLowerCase())
      .maybeSingle();

    if (lookupError || !account) {
      return { success: false, error: 'Account not found' };
    }

    // Check access - deny-by-default
    if (account.user_id) {
      // Registered user account → must be owner or admin
      if (!user || (user.role !== 'admin' && account.user_id !== user.id)) {
        return { success: false, error: 'Access denied' };
      }
    } else {
      // Guest account (user_id = NULL) → Server Actions cannot verify guest tokens
      // Only allow if a logged-in admin is performing the action
      if (!user || user.role !== 'admin') {
        return { success: false, error: 'Access denied. Use API with guest token.' };
      }
    }

    // Delete emails first, then account
    await supabaseAdmin.from('emails').delete().eq('account_id', account.id);
    const { error: deleteError } = await supabaseAdmin
      .from('accounts')
      .delete()
      .eq('id', account.id);

    if (deleteError) {
      return { success: false, error: 'Failed to delete account' };
    }

    revalidatePath('/');
    return { success: true };
  } catch (err) {
    console.error('[ServerAction] deleteAccount error:', err);
    return { success: false, error: 'Failed to delete account' };
  }
}

/**
 * Helper to check email ownership/access
 */
async function checkEmailAccess(emailId: string, user: any): Promise<{ success: boolean; error?: string; email?: any }> {
  if (!supabaseAdmin) {
    return { success: false, error: 'Database not configured' };
  }

  const { data: email, error: emailError } = await supabaseAdmin
    .from('emails')
    .select('id, account_id')
    .eq('id', emailId)
    .maybeSingle();

  if (emailError || !email) {
    return { success: false, error: 'Email not found' };
  }

  const { data: account, error: accountError } = await supabaseAdmin
    .from('accounts')
    .select('id, user_id')
    .eq('id', email.account_id)
    .maybeSingle();

  if (accountError || !account) {
    return { success: false, error: 'Account not found' };
  }

  // Check access for registered user accounts
  if (account.user_id) {
    if (!user || (user.role !== 'admin' && account.user_id !== user.id)) {
      return { success: false, error: 'Access denied' };
    }
  } else {
    // Guest account → only admins can act via Server Actions
    if (!user || user.role !== 'admin') {
      return { success: false, error: 'Access denied. Use API with guest token.' };
    }
  }

  return { success: true, email };
}

/**
 * Server Action: Mark email as read/unread
 */
export async function markEmailReadAction(
  emailId: string,
  isRead: boolean
): Promise<ActionResult> {
  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Database not configured' };
    }

    const user = await getAuthenticatedUser();
    const access = await checkEmailAccess(emailId, user);
    if (!access.success) {
      return { success: false, error: access.error };
    }

    const { error } = await supabaseAdmin
      .from('emails')
      .update({ is_read: isRead })
      .eq('id', emailId);

    if (error) {
      return { success: false, error: 'Failed to update email' };
    }

    return { success: true };
  } catch (err) {
    console.error('[ServerAction] markEmailRead error:', err);
    return { success: false, error: 'Failed to update email' };
  }
}

/**
 * Server Action: Toggle star on email
 */
export async function toggleEmailStarAction(
  emailId: string,
  isStarred: boolean
): Promise<ActionResult> {
  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Database not configured' };
    }

    const user = await getAuthenticatedUser();
    const access = await checkEmailAccess(emailId, user);
    if (!access.success) {
      return { success: false, error: access.error };
    }

    const { error } = await supabaseAdmin
      .from('emails')
      .update({ is_starred: isStarred })
      .eq('id', emailId);

    if (error) {
      return { success: false, error: 'Failed to update email' };
    }

    return { success: true };
  } catch (err) {
    console.error('[ServerAction] toggleEmailStar error:', err);
    return { success: false, error: 'Failed to update email' };
  }
}

/**
 * Server Action: Delete an email (soft delete)
 */
export async function deleteEmailAction(
  emailId: string
): Promise<ActionResult> {
  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Database not configured' };
    }

    const user = await getAuthenticatedUser();
    const access = await checkEmailAccess(emailId, user);
    if (!access.success) {
      return { success: false, error: access.error };
    }

    const { error } = await supabaseAdmin
      .from('emails')
      .update({ is_deleted: true })
      .eq('id', emailId);

    if (error) {
      return { success: false, error: 'Failed to delete email' };
    }

    return { success: true };
  } catch (err) {
    console.error('[ServerAction] deleteEmail error:', err);
    return { success: false, error: 'Failed to delete email' };
  }
}

/**
 * Server Action: Clear all emails for an account
 */
export async function clearAllEmailsAction(
  address: string
): Promise<ActionResult<{ deleted: number }>> {
  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Database not configured' };
    }

    const user = await getAuthenticatedUser();

    const { data: account } = await supabaseAdmin
      .from('accounts')
      .select('id, user_id')
      .eq('address', address.toLowerCase())
      .maybeSingle();

    if (!account) {
      return { success: false, error: 'Account not found' };
    }

    // Check access
    if (account.user_id) {
      if (!user || (user.role !== 'admin' && account.user_id !== user.id)) {
        return { success: false, error: 'Access denied' };
      }
    } else {
      // Guest account → only admins can act via Server Actions
      if (!user || user.role !== 'admin') {
        return { success: false, error: 'Access denied. Use API with guest token.' };
      }
    }

    const { error, count } = await supabaseAdmin
      .from('emails')
      .update({ is_deleted: true })
      .eq('account_id', account.id)
      .eq('is_deleted', false);

    if (error) {
      return { success: false, error: 'Failed to clear emails' };
    }

    revalidatePath('/');
    return { success: true, data: { deleted: count || 0 } };
  } catch (err) {
    console.error('[ServerAction] clearAllEmails error:', err);
    return { success: false, error: 'Failed to clear emails' };
  }
}

/**
 * Server Action: Update user preferences
 */
export async function updatePreferencesAction(
  preferences: {
    darkMode?: boolean | null;
    soundEnabled?: boolean;
    notificationsEnabled?: boolean;
    displayName?: string;
  }
): Promise<ActionResult> {
  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Database not configured' };
    }

    const user = await getAuthenticatedUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Fetch current preferences to merge
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('preferences')
      .eq('id', user.id)
      .maybeSingle();

    const currentPreferences = profile?.preferences || {};
    const updatedPreferences = {
      ...currentPreferences,
      ...preferences,
    };

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ preferences: updatedPreferences })
      .eq('id', user.id);

    if (error) {
      return { success: false, error: 'Failed to update preferences' };
    }

    return { success: true };
  } catch (err) {
    console.error('[ServerAction] updatePreferences error:', err);
    return { success: false, error: 'Failed to update preferences' };
  }
}

/**
 * Server Action: Get current user session (server-side)
 */
export async function getSessionAction(): Promise<ActionResult<{
  id: string;
  username: string;
  role: string;
} | null>> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return { success: true, data: null };
    }

    return {
      success: true,
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  } catch {
    return { success: true, data: null };
  }
}
