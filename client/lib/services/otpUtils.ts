/**
 * OTP Detection Utilities
 * Centralized OTP pattern matching — single source of truth
 */

const OTP_PATTERNS = [
  /\b(\d{4,8})\b/g,
  /\b([A-Z0-9]{4,8})\b/gi,
  /your code is[:\s]*([A-Z0-9]{4,8})/gi,
  /verification code[:\s]*([A-Z0-9]{4,8})/gi,
  /mã xác minh[:\s]*([A-Z0-9]{4,8})/gi,
  /mã xác thực[:\s]*([A-Z0-9]{4,8})/gi,
  /code[:\s]+(\d{4,8})/gi,
  /code is[:\s]+(\d{4,8})/gi,
  /otp[:\s]+(\d{4,8})/gi,
];

/**
 * Extract OTP codes from text content
 * @returns Array of detected OTP codes or null if none found
 */
export function extractOtp(text: string): string[] | null {
  if (!text) return null;

  const allMatches = new Set<string>();

  for (const pattern of OTP_PATTERNS) {
    // Reset lastIndex for global regex patterns
    pattern.lastIndex = 0;
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(m => {
        const code = m.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        if (code.length >= 4) {
          allMatches.add(code);
        }
      });
    }
  }

  return allMatches.size > 0 ? Array.from(allMatches) : null;
}

/**
 * Simple HTML sanitizer - removes dangerous elements
 * For production, consider using DOMPurify
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\bon\w+\s*=/gi, 'data-removed=')
    .replace(/javascript:/gi, '')
    .replace(/<iframe/gi, '<removed-iframe')
    .replace(/<object/gi, '<removed-object')
    .replace(/<embed/gi, '<removed-embed')
    .replace(/<form/gi, '<removed-form')
    .replace(/<input/gi, '<removed-input')
    .replace(/<button/gi, '<removed-button');
}
