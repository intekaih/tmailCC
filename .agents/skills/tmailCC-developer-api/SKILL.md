---
name: tmailCC-developer-api
description: Integrate with tmailCC as an external developer — API keys, rate limits, webhooks, and code examples. Use when building apps that use tmailCC API or automating email workflows.
version: 1.0.0
---

# tmailCC Developer API

## Overview

tmailCC provides a REST API for external developers to create temporary emails, read messages, and integrate OTP verification into applications.

**Base URL:** `https://tmailcc.kaih.co.uk/api/v1`

## Getting an API Key

1. Log in to tmailCC
2. Go to **Menu** > **Developer API**
3. Click **Create Key**
4. Enter a name (e.g. "My App")
5. Select the required scopes
6. Copy the API key (shown only once!)

## Available Scopes

| Scope | Description |
|-------|-------------|
| `accounts:create` | Create new email account |
| `accounts:read` | List email accounts |
| `accounts:delete` | Delete email account |
| `emails:read` | Read email content |
| `otp:read` | Wait for OTP codes |
| `domains:read` | List available domains |
| `webhooks:manage` | Manage webhooks |
| `usage:read` | View API usage stats |

## Endpoints

### Create Email

```bash
curl -X POST https://tmailcc.kaih.co.uk/api/v1/accounts \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"domain": "kaih.co.uk"}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "abc123@kaih.co.uk",
    "localPart": "abc123",
    "domain": "kaih.co.uk",
    "createdAt": "2026-05-23T12:00:00Z"
  }
}
```

### List Accounts

```bash
curl https://tmailcc.kaih.co.uk/api/v1/accounts \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Get Inbox

```bash
curl "https://tmailcc.kaih.co.uk/api/v1/accounts/abc123@kaih.co.uk/emails" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Read Email

```bash
curl https://tmailcc.kaih.co.uk/api/v1/emails/EMAIL_ID \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Wait for OTP

```bash
curl "https://tmailcc.kaih.co.uk/api/v1/accounts/abc123@kaih.co.uk/wait-otp?timeout=120" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response (when OTP found):**
```json
{
  "success": true,
  "data": {
    "email": {
      "from": {"address": "google.com", "name": "Google"},
      "subject": "Verification code"
    },
    "otpCodes": ["123456"],
    "waitTimeMs": 5000
  }
}
```

### Delete Account

```bash
curl -X DELETE "https://tmailcc.kaih.co.uk/api/v1/accounts/abc123@kaih.co.uk" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### List Domains

```bash
curl https://tmailcc.kaih.co.uk/api/v1/domains \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## JavaScript Examples

### Create Email and Get Inbox

```javascript
const API_KEY = 'YOUR_API_KEY';
const BASE = 'https://tmailcc.kaih.co.uk/api/v1';

async function createEmail(domain = 'kaih.co.uk') {
  const res = await fetch(`${BASE}/accounts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ domain })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error.message);
  return data.data.address;
}

async function getEmails(address) {
  const res = await fetch(
    `${BASE}/accounts/${encodeURIComponent(address)}/emails`,
    { headers: { 'Authorization': `Bearer ${API_KEY}` } }
  );
  const data = await res.json();
  if (!data.success) throw new Error(data.error.message);
  return data.data.emails;
}

// Usage
const email = await createEmail();
console.log('Email:', email);
const emails = await getEmails(email);
console.log('Emails:', emails);
```

### Wait for OTP

```javascript
async function waitForOTP(address, timeoutSec = 120) {
  const start = Date.now();
  
  while (Date.now() - start < timeoutSec * 1000) {
    const res = await fetch(
      `${BASE}/accounts/${encodeURIComponent(address)}/wait-otp?timeout=10`,
      { headers: { 'Authorization': `Bearer ${API_KEY}` } }
    );
    const data = await res.json();
    
    if (data.success && data.data?.otpCodes?.length > 0) {
      return data.data.otpCodes[0];
    }
    
    await new Promise(r => setTimeout(r, 3000));
  }
  
  throw new Error('Timeout - no OTP found');
}

// Usage
const code = await waitForOTP('test@kaih.co.uk');
console.log('OTP:', code);
```

### Node.js Express Webhook Handler

```javascript
const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json());

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

function verifySignature(payload, signature, timestamp) {
  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(`${timestamp}.${JSON.stringify(payload)}`)
    .digest('hex');
  
  const sig = signature.replace('sha256=', '');
  return crypto.timingSafeEqual(
    Buffer.from(sig, 'hex'),
    Buffer.from(expected, 'hex')
  );
}

app.post('/webhook', (req, res) => {
  const sig = req.headers['x-tmailcc-signature'];
  const ts = req.headers['x-tmailcc-timestamp'];
  const event = req.headers['x-tmailcc-event'];
  
  if (!verifySignature(req.body, sig, ts)) {
    return res.status(401).send('Invalid');
  }
  
  if (event === 'email.received') {
    console.log('New email:', req.body.data);
  }
  
  if (event === 'otp.detected') {
    console.log('OTP:', req.body.data.otpCodes);
  }
  
  res.send('OK');
});

app.listen(3000);
```

## Webhooks

### Create Webhook

```bash
curl -X POST https://tmailcc.kaih.co.uk/api/v1/webhooks \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.com/webhook",
    "events": ["email.received", "otp.detected"],
    "name": "My Webhook"
  }'
```

### Webhook Events

| Event | Payload |
|-------|---------|
| `email.received` | Full email data |
| `otp.detected` | Email with extracted OTP |

### Webhook Payload (email.received)

```json
{
  "event": "email.received",
  "timestamp": "2026-05-23T12:00:00Z",
  "data": {
    "id": "email-uuid",
    "from": {"address": "sender@example.com", "name": "Sender"},
    "to": "abc123@kaih.co.uk",
    "subject": "Test",
    "text": "Body...",
    "receivedAt": "2026-05-23T12:00:00Z"
  }
}
```

### Verifying Webhook Signatures

Always verify webhook signatures to ensure authenticity:

```typescript
import crypto from 'crypto';

export function verifyWebhookSignature(
  payload: object,
  signature: string,
  timestamp: string
): boolean {
  const secret = process.env.WEBHOOK_SECRET!;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${JSON.stringify(payload)}`)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature.replace('sha256=', ''), 'hex'),
    Buffer.from(expected, 'hex')
  );
}
```

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing API key |
| `FORBIDDEN` | 403 | Missing required scope |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMITED` | 429 | Too many requests |
| `OTP_TIMEOUT` | 408 | Wait for OTP timed out |
| `VALIDATION_ERROR` | 400 | Invalid request data |

## Rate Limits

- **100 requests/minute** per API key
- Response headers:
  - `X-RateLimit-Limit`: Max requests allowed
  - `X-RateLimit-Remaining`: Requests left

## Security Best Practices

1. **Never commit API keys** to version control
2. Use environment variables for secrets
3. Request only the scopes you need
4. Rotate keys periodically
5. Verify webhook signatures
6. Use HTTPS for all API calls
7. Implement proper error handling
8. Add rate limiting on your side too
