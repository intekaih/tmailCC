/**
 * DB Health Check & Migration Runner
 * Checks RLS policies, applies rate_limits migration
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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('=== tmailCC DB Security Check ===\n');

  // 1. Check RLS policies on accounts and emails
  console.log('[1] Checking RLS policies...');
  const { data: policies, error: polErr } = await supabase.rpc('exec_sql', {
    sql: `SELECT policyname, tablename, roles::text, cmd, qual::text 
          FROM pg_policies 
          WHERE tablename IN ('accounts', 'emails') 
          ORDER BY tablename, policyname`
  });

  if (polErr) {
    // RPC may not exist, try direct query via REST
    console.log('  [!] Cannot query pg_policies via RPC, checking via table access...');
    
    // Test anon access to emails
    const anonClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
    
    const { data: anonEmails, error: anonErr } = await anonClient
      .from('emails')
      .select('id')
      .limit(1);
    
    if (anonErr) {
      console.log('  [OK] Anon cannot read emails:', anonErr.message);
    } else {
      console.log(`  [!!] CRITICAL: Anon CAN read emails! Found ${anonEmails?.length || 0} rows`);
    }

    const { data: anonAccounts, error: anonAccErr } = await anonClient
      .from('accounts')
      .select('id, address')
      .limit(3);
    
    if (anonAccErr) {
      console.log('  [OK] Anon cannot read accounts:', anonAccErr.message);
    } else {
      console.log(`  [i] Anon can read ${anonAccounts?.length || 0} guest accounts (expected for guest flow)`);
    }
  } else {
    console.log('  Policies found:');
    for (const p of (policies || [])) {
      console.log(`    ${p.tablename}.${p.policyname} [${p.cmd}] roles=${p.roles}`);
    }
  }

  // 2. Check if rate_limits table exists
  console.log('\n[2] Checking rate_limits table...');
  const { data: rlData, error: rlErr } = await supabase
    .from('rate_limits')
    .select('key')
    .limit(1);
  
  if (rlErr && rlErr.message.includes('relation')) {
    console.log('  [!] rate_limits table does NOT exist. Creating...');
    
    // Create table via SQL
    const createSQL = readFileSync(resolve(__dirname, '../../supabase/create_rate_limits.sql'), 'utf-8');
    
    // Execute SQL statements one by one via rpc
    const { error: createErr } = await supabase.rpc('exec_sql', { sql: createSQL });
    if (createErr) {
      console.log('  [!] Cannot create via RPC. Please run create_rate_limits.sql manually on Supabase Dashboard.');
      console.log('  Error:', createErr.message);
    } else {
      console.log('  [OK] rate_limits table and RPC created successfully!');
    }
  } else if (rlErr) {
    console.log('  [!] Error checking rate_limits:', rlErr.message);
    console.log('  Please run create_rate_limits.sql on Supabase Dashboard.');
  } else {
    console.log('  [OK] rate_limits table exists');
  }

  // 3. Check gmail_parents encryption status
  console.log('\n[3] Checking gmail_parents encryption...');
  const { data: parents } = await supabase
    .from('gmail_parents')
    .select('id, address, app_password');
  
  if (parents && parents.length > 0) {
    for (const p of parents) {
      const isEnc = p.app_password && p.app_password.length >= 44;
      console.log(`  ${p.address}: ${isEnc ? '[OK] encrypted' : '[!!] PLAINTEXT'}`);
    }
  } else {
    console.log('  [i] No gmail parents found');
  }

  // 4. Check webhook secrets encryption
  console.log('\n[4] Checking webhook secrets...');
  const { data: webhooks } = await supabase
    .from('webhooks')
    .select('id, url, secret');
  
  if (webhooks && webhooks.length > 0) {
    for (const w of webhooks) {
      const isEnc = w.secret && w.secret.length >= 44;
      console.log(`  ${w.url}: ${isEnc ? '[OK] encrypted' : '[!!] PLAINTEXT'}`);
    }
  } else {
    console.log('  [i] No webhooks found');
  }

  // 5. Check profiles for security
  console.log('\n[5] Checking user profiles...');
  const { data: profiles, count } = await supabase
    .from('profiles')
    .select('id, username, role, is_active', { count: 'exact' });
  
  console.log(`  Total users: ${count || profiles?.length || 0}`);
  const admins = (profiles || []).filter(p => p.role === 'admin');
  console.log(`  Admins: ${admins.map(a => a.username).join(', ') || 'none'}`);
  const inactive = (profiles || []).filter(p => !p.is_active);
  if (inactive.length > 0) {
    console.log(`  Inactive accounts: ${inactive.map(a => a.username).join(', ')}`);
  }

  // 6. Check guest accounts with token hashes
  console.log('\n[6] Checking guest account security...');
  const { data: guestAccounts } = await supabase
    .from('accounts')
    .select('id, address, guest_owner_token_hash')
    .is('user_id', null);
  
  if (guestAccounts && guestAccounts.length > 0) {
    const withHash = guestAccounts.filter(a => a.guest_owner_token_hash);
    const withoutHash = guestAccounts.filter(a => !a.guest_owner_token_hash);
    console.log(`  Guest accounts: ${guestAccounts.length}`);
    console.log(`  With token hash: ${withHash.length}`);
    if (withoutHash.length > 0) {
      console.log(`  [!] Without token hash: ${withoutHash.length} (unprotected)`);
    }
  } else {
    console.log('  [i] No guest accounts');
  }

  console.log('\n=== Check complete ===');
}

main().catch(err => {
  console.error('[!] Fatal error:', err.message);
  process.exit(1);
});
