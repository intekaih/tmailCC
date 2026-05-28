/**
 * One-time migration: Encrypt all existing plaintext webhook secrets
 * Run with: node scripts/encrypt-webhook-secrets.mjs
 */
import crypto from 'crypto';
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
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const ENCRYPTION_KEY = env.APP_ENCRYPTION_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !ENCRYPTION_KEY) {
  console.error('[!] Missing env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getKey() {
  if (ENCRYPTION_KEY.length === 64) return Buffer.from(ENCRYPTION_KEY, 'hex');
  if (ENCRYPTION_KEY.length === 32) return Buffer.from(ENCRYPTION_KEY, 'utf-8');
  throw new Error('Invalid key length');
}

function encrypt(plaintext) {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

function isEncrypted(value) {
  if (!value || value.length < 44) return false;
  try {
    const buf = Buffer.from(value, 'base64');
    return buf.length >= IV_LENGTH + AUTH_TAG_LENGTH + 1;
  } catch {
    return false;
  }
}

async function main() {
  console.log('[*] Encrypting webhook secrets...\n');

  const { data: webhooks, error } = await supabase
    .from('webhooks')
    .select('id, url, secret');

  if (error) {
    console.error('[!] Error:', error.message);
    process.exit(1);
  }

  if (!webhooks || webhooks.length === 0) {
    console.log('[i] No webhooks found.');
    return;
  }

  console.log(`[i] Found ${webhooks.length} webhook(s)\n`);

  let encrypted = 0, skipped = 0;

  for (const wh of webhooks) {
    if (isEncrypted(wh.secret)) {
      console.log(`  [skip] ${wh.url} - already encrypted`);
      skipped++;
      continue;
    }

    const enc = encrypt(wh.secret);
    const { error: updateError } = await supabase
      .from('webhooks')
      .update({ secret: enc })
      .eq('id', wh.id);

    if (updateError) {
      console.error(`  [FAIL] ${wh.url} - ${updateError.message}`);
    } else {
      console.log(`  [OK]   ${wh.url} - encrypted`);
      encrypted++;
    }
  }

  console.log(`\n[*] Done: ${encrypted} encrypted, ${skipped} skipped`);
}

main().catch(err => {
  console.error('[!] Error:', err);
  process.exit(1);
});
