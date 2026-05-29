/**
 * tmailCC - App Workspace Page (Server Component)
 * 
 * Đây là Server Component cho route /app - chạy server-side, thực hiện:
 * - Server-side data fetching (session, domains)
 * - Truyền initial data xuống HomeClient Component
 */
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import HomeClient from '../HomeClient';
import type { InitialServerData } from '../types';

export type { InitialServerData };

// Fetch initial data on the server before rendering
async function getInitialData(): Promise<InitialServerData> {
  let session: InitialServerData['session'] = null;
  let domains: InitialServerData['domains'] = [];

  try {
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

export default async function AppPage() {
  const initialData = await getInitialData();

  return <HomeClient initialData={initialData} />;
}
