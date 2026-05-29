---
name: tmailCC-api-routes
description: Create, modify, and debug tmailCC Next.js API route handlers. Use when adding new endpoints, modifying auth flows, or implementing webhooks.
version: 1.0.0
---

# tmailCC API Routes Development

## Route Location

All API routes are in `client/app/api/`.

## Standard Route Handler Pattern

```typescript
// client/app/api/accounts/route.ts
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  // 1. Extract auth header
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  // 2. Verify token
  const user = verifyToken(token || '');
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } },
      { status: 401 }
    );
  }

  // 3. Check admin if needed
  if (user.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Admin required' } },
      { status: 403 }
    );
  }

  // 4. Query database
  const { data, error } = await supabaseAdmin
    .from('accounts')
    .select('*')
    .eq('user_id', user.sub);

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 }
    );
  }

  // 5. Return response
  return NextResponse.json({ success: true, data });
}
```

## Response Format

### Success
```typescript
NextResponse.json({ success: true, data: { ... } })
NextResponse.json({ success: true, data: [...] })
```

### Error
```typescript
NextResponse.json(
  { success: false, error: { code: 'ERROR_CODE', message: 'Human readable' } },
  { status: 400 | 401 | 403 | 404 | 500 }
)
```

## Common Error Codes

| Code | HTTP | Usage |
|------|------|-------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `RATE_LIMITED` | 429 | Too many requests |
| `DB_ERROR` | 500 | Database error |

## Admin Routes

Admin routes check the `role` field in the JWT:

```typescript
if (user.role !== 'admin') {
  return NextResponse.json(
    { success: false, error: { code: 'FORBIDDEN', message: 'Admin required' } },
    { status: 403 }
  );
}
```

## OTP Verification Flow

```typescript
// POST /api/otp/verify
// Body: { address: string, code: string }
export async function POST(request: Request) {
  const { address, code } = await request.json();
  
  // 1. Extract token
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  // 2. Verify user owns this address (or guest token)
  // 3. Check code matches and not expired
  // 4. Return success
}
```

## Webhook Endpoint

```typescript
// client/app/api/webhook/inbound/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // 1. Verify webhook secret
  const signature = request.headers.get('x-tmailcc-signature');
  const webhookSecret = process.env.WEBHOOK_SECRET;
  
  // 2. Parse email payload
  const payload = await request.json();
  
  // 3. Store email in database
  // 4. Return success
  return NextResponse.json({ success: true });
}
```

## Rate Limiting

For rate limiting, track requests in-memory or use a cache:

```typescript
// Simple in-memory rate limiter
const rateLimit = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimit.get(key);
  
  if (!record || now > record.resetAt) {
    rateLimit.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (record.count >= limit) return false;
  record.count++;
  return true;
}
```

## Request Validation

```typescript
import Joi from 'joi';

const createAccountSchema = Joi.object({
  localPart: Joi.string().min(1).max(64).pattern(/^[a-zA-Z0-9]+$/),
  domain: Joi.string().min(1).max(255),
});

export async function POST(request: Request) {
  const body = await request.json();
  const { error, value } = createAccountSchema.validate(body);
  
  if (error) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: error.message } },
      { status: 400 }
    );
  }
  
  // Use validated value
}
```

## CORS

API routes in `client/app/api/` don't need CORS for same-origin calls. For cross-origin, add:

```typescript
export async function GET(request: Request) {
  // ...
  return NextResponse.json(data, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}
```

## Testing API Routes

```typescript
// client/app/api/test/send-email/route.ts
// Test endpoint for sending test emails
export async function POST(request: Request) {
  // Only in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
  }
  // Test logic...
}
```
