import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
console.log('Loading env from:', envPath);
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
const processToken = processEnv.CLOUDFLARE_API_TOKEN;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('ERROR: Supabase URL or Service Role Key not found in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function test() {
  console.log('Testing Database Connection...');
  const { data: configData, error: configError } = await supabase
    .from('config')
    .select('key, value');

  if (configError) {
    console.error('Database connection failed:', configError);
    process.exit(1);
  }

  console.log('Successfully connected to database.');
  console.log('Config rows in database:');
  console.log(configData);

  // Find Cloudflare configuration
  let cfApiToken = processToken || '';
  let cfAccountId = processEnv.CLOUDFLARE_ACCOUNT_ID || '';

  if (configData) {
    for (const row of configData) {
      if (row.key === 'cloudflareApiToken') {
        cfApiToken = row.value || cfApiToken;
      }
      if (row.key === 'cloudflareAccountId') {
        cfAccountId = row.value || cfAccountId;
      }
    }
  }

  console.log('\nCloudflare Configuration resolved:');
  console.log('API Token (truncated):', cfApiToken ? `${cfApiToken.substring(0, 10)}...` : 'Not configured');
  console.log('Account ID:', cfAccountId || 'Not configured');

  if (!cfApiToken) {
    console.warn('\nWarning: No Cloudflare API Token found. Cannot test Cloudflare API.');
    return;
  }

  console.log('\nTesting Cloudflare API token status...');
  try {
    const res = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
      headers: {
        'Authorization': `Bearer ${cfApiToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await res.json();
    console.log('Cloudflare Token Verification Response status:', res.status);
    console.log('Response body:', JSON.stringify(data, null, 2));

    if (res.ok && data.success) {
      console.log('✅ Cloudflare API Token is VALID and working!');
    } else {
      console.error('❌ Cloudflare API Token verification FAILED.');
    }
  } catch (err) {
    console.error('Error connecting to Cloudflare API:', err);
  }
}

test();
