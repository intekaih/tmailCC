import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const processEnv = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
  if (match) {
    const key = match[1].trim();
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    processEnv[key] = val;
  }
});

const supabaseUrl = processEnv.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = processEnv.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('ERROR: Supabase credentials missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function listUsers() {
  const { data: profiles, error: err } = await supabase.from('profiles').select('*');
  if (err) {
    console.error('Failed to get profiles:', err);
    process.exit(1);
  }
  console.log('--- PROFILES ---');
  console.log(JSON.stringify(profiles, null, 2));

  const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) {
    console.error('Failed to list auth users:', authErr);
  } else {
    console.log('--- AUTH USERS ---');
    console.log(JSON.stringify(authUsers.users.map(u => ({ id: u.id, email: u.email, user_metadata: u.user_metadata })), null, 2));
  }
}

listUsers();
