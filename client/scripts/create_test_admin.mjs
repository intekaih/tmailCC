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

async function main() {
  const username = 'testadmin';
  const email = 'testadmin@tmail.local';
  const password = 'TestAdmin123!';

  console.log(`Checking if user ${username} already exists...`);
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  let existingUser = authUsers?.users.find(u => u.email === email);

  let userId;
  if (existingUser) {
    console.log(`User already exists, updating password...`);
    userId = existingUser.id;
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: password
    });
    if (updateError) {
      console.error('Failed to update password:', updateError);
      process.exit(1);
    }
  } else {
    console.log(`Creating user in auth...`);
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username }
    });
    if (createError) {
      console.error('Failed to create auth user:', createError);
      process.exit(1);
    }
    userId = created.user.id;
    console.log(`Created auth user with ID: ${userId}`);
  }

  // Wait a short bit for database trigger to create profile if new
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log(`Updating profile to role='admin' for ${username}...`);
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role: 'admin', is_active: true })
    .eq('id', userId);

  if (profileError) {
    console.error('Failed to update profile role:', profileError);
    // If profiles row doesn't exist yet, insert it
    console.log('Attempting to insert profile...');
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        username,
        role: 'admin',
        is_active: true
      });
    if (insertError) {
      console.error('Insert also failed:', insertError);
      process.exit(1);
    }
  }

  console.log(`✅ Success! testadmin is setup with password: ${password}`);
}

main();
