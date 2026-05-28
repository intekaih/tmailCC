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

  // Limit input length to prevent ReDoS on large payloads
  const truncated = text.length > 10000 ? text.substring(0, 10000) : text;

  const allMatches = new Set<string>();

  for (const pattern of OTP_PATTERNS) {
    // Create a new regex instance to avoid shared lastIndex state
    const regex = new RegExp(pattern.source, pattern.flags);
    regex.lastIndex = 0;
    const matches = truncated.match(regex);
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
