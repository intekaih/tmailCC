---
name: tmailCC-otp-flow
description: Implement and debug tmailCC OTP (one-time password) verification flow. Use when adding OTP features, modifying wait/polling logic, or troubleshooting verification code.
version: 1.0.0
---

# tmailCC OTP Verification Flow

## Overview

tmailCC supports OTP (one-time password) verification — users can view emails containing verification codes without logging in, using a secure token-based OTP page.

## OTP Page

The OTP page is at `/otp` in the Next.js app (`client/app/otp/page.tsx`).

### How It Works

1. User enters their email address
2. System generates a one-time token valid for 3 minutes
3. User is redirected to `/otp?token=xxx&address=yyy`
4. The page polls for emails containing OTP codes
5. When found, codes are displayed automatically

## API Endpoints

### Verify OTP

```typescript
// POST /api/otp/verify
// Body: { address: string, code: string }

export async function POST(request: Request) {
  const { address, code } = await request.json();
  
  // 1. Validate address and code format
  // 2. Extract token from auth header (or guest token)
  // 3. Verify the token matches the address
  // 4. Check if code matches email OTP
  // 5. Return success/failure
}
```

### Refresh OTP Token

```typescript
// POST /api/otp/refresh
// Body: { address: string }

export async function POST(request: Request) {
  // Generate a new OTP token for the address
  // Valid for 3 minutes
  // Return new token
}
```

### Wait for OTP (Polling)

```typescript
// GET /api/otp/wait?address=xxx&timeout=120
// Returns when an email with OTP is received, or timeout

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const timeout = parseInt(searchParams.get('timeout') || '60');
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout * 1000) {
    // Query emails for this address
    const emails = await supabaseAdmin
      .from('emails')
      .select('*')
      .eq('to_address', address)
      .order('received_at', { ascending: false })
      .limit(10);
    
    // Extract OTP codes from email text
    const otpCodes = extractOTPCodes(emails.data);
    
    if (otpCodes.length > 0) {
      return NextResponse.json({
        success: true,
        data: {
          otpCodes,
          email: emails.data[0],
        }
      });
    }
    
    await sleep(3000); // Wait 3 seconds
  }
  
  return NextResponse.json({
    success: false,
    error: { code: 'OTP_TIMEOUT', message: 'Timeout waiting for OTP' }
  }, { status: 408 });
}
```

## OTP Code Extraction

Regex patterns for extracting OTP codes:

```typescript
function extractOTPCodes(emails: Email[]): string[] {
  const patterns = [
    /\b(\d{4,8})\b/,           // 4-8 digit codes
    /code[:\s]*(\d{4,8})/i,   // "code: 123456"
    /mã[:\s]*(\d{4,8})/i,     // Vietnamese "mã: 123456"
    /verification[:\s]*(\d{4,8})/i,
    /verify[:\s]*(\d{4,8})/i,
    /\b(\d{6})\b/,             // 6-digit common in 2FA
  ];
  
  const codes = new Set<string>();
  
  for (const email of emails) {
    const text = `${email.subject} ${email.text_body}`.substring(0, 500);
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        codes.add(match[1]);
      }
    }
  }
  
  return Array.from(codes);
}
```

## Token Generation

```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET!;

function generateOTPToken(address: string): string {
  return jwt.sign(
    {
      type: 'otp',
      address,
      exp: Math.floor(Date.now() / 1000) + 180, // 3 min expiry
    },
    JWT_SECRET
  );
}

function verifyOTPToken(token: string): { address: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.type !== 'otp') return null;
    return { address: decoded.address };
  } catch {
    return null;
  }
}
```

## Client-Side Polling

```typescript
// client/app/otp/page.tsx
'use client';

import { useState, useEffect } from 'react';

export default function OTPPage() {
  const [codes, setCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const address = params.get('address');
    
    if (!token || !address) {
      setLoading(false);
      return;
    }
    
    async function poll() {
      const res = await fetch(`/api/otp/wait?address=${address}&timeout=180`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setCodes(data.data.otpCodes);
      }
      setLoading(false);
    }
    
    poll();
  }, []);
  
  // Render codes...
}
```

## Security Considerations

1. **Token expiry**: OTP tokens expire after 3 minutes
2. **One-time use**: Tokens can only be used once for verification
3. **Address binding**: Token is bound to a specific email address
4. **Rate limiting**: Prevent brute-force by rate-limiting verify endpoint
5. **Audit logging**: Log OTP verification attempts

## Common Issues

### OTP codes not detected
- Check email body is not empty
- Verify regex patterns match the email format
- Some emails use images for codes (OCR not supported)

### Token expired
- Redirect back to home with error message
- Auto-refresh token before expiry (optional)

### Email not received
- Check webhook is working (inbound emails)
- Verify email is being stored in database
- Check spam/junk filters
