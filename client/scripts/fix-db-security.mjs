/**
 * Apply critical security fixes directly to Supabase DB
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

async function runSQL(sql) {
  // Use Supabase Management API / pg_net or direct REST SQL endpoint
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ sql }),
  });
  
  if (!response.ok) {
    const text = await response.text();
    return { error: text };
  }
  return { data: await response.json() };
}

async function main() {
  console.log('=== Applying Security Fixes ===\n');

  // Test: Check if the anon policy on emails is actually blocking
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const anonClient = createClient(SUPABASE_URL, anonKey);

  // Check current anon access
  console.log('[1] Testing anon access to emails...');
  const { data: testEmails, error: testErr } = await anonClient
    .from('emails')
    .select('id', { count: 'exact', head: true });

  if (testErr) {
    console.log('  [OK] Anon BLOCKED from emails:', testErr.message);
  } else {
    console.log('  [!!] Anon can still access emails table!');
    console.log('  Attempting to fix via SQL...');
    
    // Try to apply the fix using the Supabase SQL endpoint
    const fixSQL = `
      DROP POLICY IF EXISTS "emails_select_anon" ON public.emails;
      DROP POLICY IF EXISTS "emails_select_anon_safe" ON public.emails;
      DROP POLICY IF EXISTS "emails_select_anon_blocked" ON public.emails;
      CREATE POLICY "emails_select_anon_blocked" ON public.emails
        FOR SELECT TO anon USING (false);
    `;
    
    const result = await runSQL(fixSQL);
    if (result.error) {
      console.log('  [!] Cannot apply via RPC. Error:', result.error);
      console.log('  >> You MUST run this SQL manually on Supabase Dashboard:');
      console.log('  ---');
      console.log(fixSQL);
      console.log('  ---');
    } else {
      console.log('  [OK] Applied emails_select_anon_blocked policy!');
    }
  }

  // Check anon access to accounts
  console.log('\n[2] Testing anon access to accounts...');
  const { data: testAccounts, error: testAccErr } = await anonClient
    .from('accounts')
    .select('id, address, user_id')
    .not('user_id', 'is', null)
    .limit(1);
  
  if (testAccErr || !testAccounts || testAccounts.length === 0) {
    console.log('  [OK] Anon cannot read non-guest accounts');
  } else {
    console.log('  [!!] Anon can read non-guest accounts!');
  }

  // Check what fields anon can see on guest accounts
  const { data: guestFields } = await anonClient
    .from('accounts')
    .select('*')
    .limit(1);
  
  if (guestFields && guestFields.length > 0) {
    const fields = Object.keys(guestFields[0]);
    const sensitiveFields = fields.filter(f => 
      ['guest_owner_token_hash', 'user_id'].includes(f)
    );
    if (sensitiveFields.length > 0) {
      console.log(`  [!] Anon can see sensitive fields: ${sensitiveFields.join(', ')}`);
    }
    console.log(`  [i] Anon visible fields on guest accounts: ${fields.join(', ')}`);
  }

  // Test Realtime subscription capability
  console.log('\n[3] Testing Realtime subscription (emails)...');
  const channel = anonClient.channel('test-security');
  let realtimeResult = 'unknown';
  
  await new Promise((resolve) => {
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'emails' }, () => {})
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          realtimeResult = 'subscribed';
        } else if (status === 'CHANNEL_ERROR') {
          realtimeResult = 'blocked';
        }
        resolve();
      });
    
    // Timeout after 5s
    setTimeout(() => {
      realtimeResult = realtimeResult === 'unknown' ? 'timeout' : realtimeResult;
      resolve();
    }, 5000);
  });

  anonClient.removeChannel(channel);

  if (realtimeResult === 'subscribed') {
    console.log('  [!!] Anon CAN subscribe to Realtime emails! (RLS may not fully block Realtime)');
    console.log('  >> Note: Even with RLS USING(false), Supabase Realtime may still allow subscription');
    console.log('  >> but no data will be delivered due to RLS filtering.');
  } else {
    console.log(`  [OK] Realtime result: ${realtimeResult}`);
  }

  console.log('\n=== Done ===');
  process.exit(0);
}

main().catch(err => {
  console.error('[!]', err.message);
  process.exit(1);
});
