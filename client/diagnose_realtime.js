/**
 * Diagnose Supabase Realtime Configuration
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load env from .env.local
const envPath = path.join(__dirname, '.env.local');
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

const databaseUrl = processEnv.DATABASE_URL;

if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL not found in .env.local');
  process.exit(1);
}

const client = new Client({ 
  connectionString: databaseUrl, 
  ssl: { rejectUnauthorized: false } 
});

async function run() {
  try {
    console.log('Connecting to PostgreSQL database...');
    await client.connect();
    console.log('Connected.');

    // 1. Check publication
    console.log('\n--- 1. Checking supabase_realtime publication tables ---');
    const pubRes = await client.query(`
      SELECT pubname, schemaname, tablename 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime';
    `);
    console.log(pubRes.rows);

    // 2. Check emails table replica identity
    console.log('\n--- 2. Checking emails table replica identity ---');
    const replRes = await client.query(`
      SELECT relname, relreplident 
      FROM pg_class 
      WHERE relname = 'emails';
    `);
    // d = default, n = nothing, f = full, i = index
    console.log(replRes.rows);

    // 3. Check RLS status
    console.log('\n--- 3. Checking RLS status on accounts and emails ---');
    const rlsRes = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE tablename IN ('accounts', 'emails');
    `);
    console.log(rlsRes.rows);

    // 4. Check RLS policies
    console.log('\n--- 4. Checking RLS policies on accounts and emails ---');
    const polRes = await client.query(`
      SELECT policyname, tablename, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename IN ('accounts', 'emails')
      ORDER BY tablename, policyname;
    `);
    console.log(polRes.rows);

  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await client.end();
  }
}

run();
