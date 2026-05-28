/**
 * One-time migration script: Encrypt all existing plaintext Gmail app passwords
 * 
 * Run with: node scripts/encrypt-existing-passwords.mjs
 */
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ── Load .env.local manually ────────────────────────
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

// ── Config ──────────────────────────────────────────
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const ENCRYPTION_KEY = env.APP_ENCRYPTION_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Thieu NEXT_PUBLIC_SUPABASE_URL hoac SUPABASE_SERVICE_ROLE_KEY trong .env.local');
  process.exit(1);
}
if (!ENCRYPTION_KEY) {
  console.error('Thieu APP_ENCRYPTION_KEY trong .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Encryption ──────────────────────────────────────
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getKey() {
  if (ENCRYPTION_KEY.length === 64) return Buffer.from(ENCRYPTION_KEY, 'hex');
  if (ENCRYPTION_KEY.length === 32) return Buffer.from(ENCRYPTION_KEY, 'utf-8');
  throw new Error('APP_ENCRYPTION_KEY phai la 32 bytes (hoac 64 hex chars)');
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

// ── Main ────────────────────────────────────────────
async function main() {
  console.log('[*] Bat dau ma hoa Gmail app passwords...\n');

  const { data: parents, error } = await supabase
    .from('gmail_parents')
    .select('id, address, app_password');

  if (error) {
    console.error('[!] Loi doc gmail_parents:', error.message);
    process.exit(1);
  }

  if (!parents || parents.length === 0) {
    console.log('[i] Khong co Gmail parent nao trong database. Khong can lam gi.');
    return;
  }

  console.log(`[i] Tim thay ${parents.length} Gmail parent(s)\n`);

  let encrypted = 0;
  let skipped = 0;

  for (const parent of parents) {
    const addr = parent.address;

    if (isEncrypted(parent.app_password)) {
      console.log(`  [skip] ${addr} - da encrypted`);
      skipped++;
      continue;
    }

    const encryptedPassword = encrypt(parent.app_password);

    const { error: updateError } = await supabase
      .from('gmail_parents')
      .update({ app_password: encryptedPassword })
      .eq('id', parent.id);

    if (updateError) {
      console.error(`  [FAIL] ${addr} - loi: ${updateError.message}`);
    } else {
      console.log(`  [OK]   ${addr} - da ma hoa`);
      encrypted++;
    }
  }

  console.log(`\n[*] Hoan tat: ${encrypted} ma hoa, ${skipped} bo qua`);
}

main().catch(err => {
  console.error('[!] Loi:', err);
  process.exit(1);
});
