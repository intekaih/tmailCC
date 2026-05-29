/**
 * OTP Detection Utilities
 * Centralized OTP pattern matching — single source of truth.
 * Used by: webhookService, otp/verify, otp/refresh, admin/dotmails
 */

const MAX_INPUT_LENGTH = 10_000;
const EXCLUDED_CODES = new Set(['OPT-IN', 'OPT-OUT', 'ADD-ON', 'PRE-AMP', 'E-MAIL', 'X-AI']);

function isYearCode(code: string): boolean {
  return code.length === 4 && /^202[4-9]$/.test(code) || code === '2030';
}

/**
 * Core OTP extractor — returns the FIRST valid OTP code found.
 * Uses 8 prioritized patterns:
 *   1. Hyphenated alphanumeric (e.g. F2P-6WP)
 *   2. 6-digit pure digits
 *   3. 4-8 digit pure digits (excluding year codes)
 *   4. Context-based alphanumeric (e.g. "code: A1B2")
 *   5. Alphanumeric with both letters and digits
 *
 * Pre-processing (strips noise to reduce false positives):
 *   - URLs
 *   - Email addresses
 *   - Markdown [text](url) links
 *   - Unicode hyphens/dashes (en-dash, em-dash, etc.)
 */
export function extractOtp(text: string): string | null {
  if (!text) return null;

  // Pre-process: strip URLs, emails, markdown links to avoid false positives
  let content = text
    .replace(/https?:\/\/[^\s\]\)]+/gi, ' ')
    .replace(/\[([^\]]*)\]\([^\)]*\)/g, ' $1 ')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, ' ')
    // Normalize unicode hyphens → ASCII hyphen
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, '-');

  // Truncate to prevent ReDoS on large payloads
  if (content.length > MAX_INPUT_LENGTH) {
    content = content.substring(0, MAX_INPUT_LENGTH);
  }

  // 1. Hyphenated alphanumeric codes (e.g. F2P-6WP, CJN-I33)
  const hyphenMatch = content.match(/\b([A-Z0-9]{2,5}-[A-Z0-9]{2,5})\b/i);
  if (hyphenMatch) {
    const code = hyphenMatch[1].toUpperCase();
    if (code.length >= 5 && code.length <= 11 && !EXCLUDED_CODES.has(code)) {
      return code;
    }
  }

  // 2. Pure 6-digit digits (highest priority numeric OTP)
  const sixDigitMatch = content.match(/\b(\d{6})\b/);
  if (sixDigitMatch) return sixDigitMatch[1];

  // 3. Pure 4-8 digit codes (excluding year-like codes)
  const digitsMatch = content.match(/\b(\d{4,8})\b/);
  if (digitsMatch) {
    if (!isYearCode(digitsMatch[1])) return digitsMatch[1];
  }

  // 4. Context-based alphanumeric (e.g. "code: A1B2" or "mã xác minh: 4910")
  const contextPatterns = [
    /(?:code|mã|otp|verification|xác\s*minh|confirm|security)[:\s]+([A-Z0-9-]{4,8})/i,
    /([A-Z0-9-]{4,8})[:\s]+(?:is\s+your\s+code|là\s+mã\s+xác\s*minh)/i,
  ];
  for (const pattern of contextPatterns) {
    const match = content.match(pattern);
    if (match) {
      const code = match[1];
      if (code && code.length >= 4 && code.length <= 8 && /[0-9]/.test(code)) {
        return code.toUpperCase();
      }
    }
  }

  // 5. Alphanumeric with both letters AND digits (e.g. A1B2C3, GROK12)
  const alphaNumMatch = content.match(/\b([A-Z0-9]{4,8})\b/i);
  if (alphaNumMatch) {
    const code = alphaNumMatch[1];
    if (/[A-Z]/i.test(code) && /[0-9]/.test(code)) {
      return code.toUpperCase();
    }
  }

  return null;
}

/**
 * Multi-extractor — returns ALL valid OTP codes found.
 * Used by webhook inbound handler for the otp.detected webhook event.
 */
export function extractAllOtps(text: string): string[] | null {
  if (!text) return null;

  let content = text
    .replace(/https?:\/\/[^\s\]\)]+/gi, ' ')
    .replace(/\[([^\]]*)\]\([^\)]*\)/g, ' $1 ')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, ' ')
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, '-');

  if (content.length > MAX_INPUT_LENGTH) {
    content = content.substring(0, MAX_INPUT_LENGTH);
  }

  const allMatches = new Set<string>();

  // Hyphenated
  for (const match of content.matchAll(/\b([A-Z0-9]{2,5}-[A-Z0-9]{2,5})\b/gi)) {
    const code = match[1].toUpperCase();
    if (code.length >= 5 && code.length <= 11 && !EXCLUDED_CODES.has(code)) {
      allMatches.add(code);
    }
  }

  // Numeric (4-8 digits, no year codes)
  for (const match of content.matchAll(/\b(\d{4,8})\b/g)) {
    if (!isYearCode(match[1])) allMatches.add(match[1]);
  }

  // Context-based
  const contextPatterns = [
    /(?:code|mã|otp|verification|xác\s*minh|confirm|security)[:\s]+([A-Z0-9-]{4,8})/gi,
    /([A-Z0-9-]{4,8})[:\s]+(?:is\s+your\s+code|là\s+mã\s+xác\s*minh)/gi,
  ];
  for (const pattern of contextPatterns) {
    for (const match of content.matchAll(pattern)) {
      const code = match[1];
      if (code && code.length >= 4 && code.length <= 8 && /[0-9]/.test(code)) {
        allMatches.add(code.toUpperCase());
      }
    }
  }

  // Alphanumeric with both letters and digits
  for (const match of content.matchAll(/\b([A-Z0-9]{4,8})\b/gi)) {
    const code = match[1];
    if (/[A-Z]/i.test(code) && /[0-9]/.test(code)) {
      allMatches.add(code.toUpperCase());
    }
  }

  return allMatches.size > 0 ? Array.from(allMatches) : null;
}

/**
 * Server-side HTML sanitizer - strips ALL HTML for safe text extraction.
 * For display rendering, client-side EmailView.tsx has a DOM-based sanitizer.
 * This function is used only for OTP extraction from email content on the server.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  return html
    // Remove all script/style/svg/math blocks with their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/<math\b[^<]*(?:(?!<\/math>)<[^<]*)*<\/math>/gi, '')
    // Remove all HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}
