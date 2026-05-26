/**
 * Run Gmail Dotmail Migration
 * Executes gmail_dotmail_migration.sql on the Supabase Postgres database.
 * Usage: node run_migration.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('[Migration] ERROR: DATABASE_URL not found in .env');
    process.exit(1);
  }

  const sqlFile = path.join(__dirname, 'gmail_dotmail_migration.sql');
  if (!fs.existsSync(sqlFile)) {
    console.error('[Migration] ERROR: gmail_dotmail_migration.sql not found');
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlFile, 'utf8');
  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

  try {
    console.log('[Migration] Connecting to database...');
    await client.connect();
    console.log('[Migration] Connected. Running migration...');
    await client.query(sql);
    console.log('[Migration] ✓ Gmail Dotmail migration completed successfully!');
  } catch (err) {
    console.error('[Migration] ERROR:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
