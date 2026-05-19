/**
 * tmailCC - Main Page (Server Component)
 * 
 * Đây là Server Component - chạy server-side, thực hiện:
 * - Server-side data fetching (session, domains)
 * - Truyền initial data xuống Client Component
 * - Không có 'use client' → tận dụng Server Components của Next.js
 */
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import HomeClient from './HomeClient';
import type { InitialServerData } from './types';

// Re-export the type so existing consumers still work
export type { InitialServerData };


// ============================================
// SERVER-SIDE DATA FETCHING
// ============================================

/**
 * Fetch initial data on the server before rendering.
 * This runs server-side during SSR/RSC.
 */
async function getInitialData(): Promise<InitialServerData> {
  let session: InitialServerData['session'] = null;
  let domains: InitialServerData['domains'] = [];

  try {
    // Fetch user session server-side via cookies
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      session = {
        userId: user.id,
        email: user.email || '',
      };
    }
  } catch (err) {
    console.error('[Server] Failed to fetch session:', err);
  }

  try {
    // Fetch active domains server-side
    if (supabaseAdmin) {
      const { data: domainRows } = await supabaseAdmin
        .from('domains')
        .select('id, domain, label, is_active, is_default')
        .eq('is_active', true)
        .order('is_default', { ascending: false });

      domains = (domainRows || []).map((d) => ({
        id: d.id,
        domain: d.domain,
        label: d.label || d.domain,
        isActive: d.is_active,
        isDefault: d.is_default,
      }));
    }
  } catch (err) {
    console.error('[Server] Failed to fetch domains:', err);
  }

  return { session, domains };
}

// ============================================
// PAGE COMPONENT (Server Component)
// ============================================

/**
 * Server Component page - fetches initial data then 
 * passes it to the Client Component for interactivity.
 */
export default async function HomePage() {
  const initialData = await getInitialData();

  return <HomeClient initialData={initialData} />;
}
