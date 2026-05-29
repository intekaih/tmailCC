# Developer API Documentation

> **tmailCC Developer API v1**
> Last updated: May 23, 2026
> Base URL: `https://tmailcc.app/api/v1`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Scopes](#3-scopes)
4. [Endpoints](#4-endpoints)
5. [Webhooks](#5-webhooks)
6. [Error Codes](#6-error-codes)
7. [Code Examples](#7-code-examples)
8. [Security Best Practices](#8-security-best-practices)

---

## 1. Overview

The tmailCC Developer API allows third-party applications, scripts, and external tools to integrate with tmailCC for:

- Creating temporary email addresses
- Reading inbox and emails
- Waiting for OTP/verification codes
- Receiving webhook notifications
- Managing webhooks programmatically

### Base URL

```
Production: https://tmailcc.app/api/v1
```

### Request Format

All API requests must include:

- `Authorization: Bearer <api_key>` header
- `Content-Type: application/json` for POST/PATCH requests

### Response Format

**Success Response:**

```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response:**

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

---

## 2. Authentication

### API Key Format

API keys are prefixed with `tmail_` followed by 64 random hex characters:

```
tmail_abc123def456...
```

### Creating an API Key

1. Log in to your tmailCC account
2. Go to **Developer Settings** (menu)
3. Click **Create API Key**
4. Enter a name for your key
5. Select the required scopes
6. Optionally set an expiration date
7. Copy your API key (shown only once!)

### Using the API Key

Include the API key in every request:

```bash
curl -H "Authorization: Bearer tmail_abc123..." \
     https://tmailcc.app/api/v1/domains
```

---

## 3. Scopes

Scopes define what your API key can do. Request only the scopes you need.

| Scope | Description |
|-------|-------------|
| `accounts:create` | Create new email accounts |
| `accounts:read` | List and view email accounts |
| `accounts:delete` | Delete email accounts |
| `emails:read` | Read inbox and email content |
| `emails:delete` | Delete emails |
| `otp:read` | Wait for OTP/verification codes |
| `domains:read` | List available domains |
| `webhooks:manage` | Create and manage webhooks |
| `usage:read` | View API usage statistics |

**Note:** `accounts:read` is automatically included when `accounts:create` is selected.

---

## 4. Endpoints

### Domains

#### `GET /domains`

List all available domains for creating email accounts.

**Scopes Required:** `domains:read`

**Response:**

```json
{
  "success": true,
  "data": {
    "domains": [
      {
        "id": "uuid",
        "domain": "tmailcc.app",
        "label": "Primary",
        "isDefault": true
      }
    ]
  }
}
```

**Example:**

```bash
curl -H "Authorization: Bearer <key>" \
     https://tmailcc.app/api/v1/domains
```

---

### Accounts

#### `POST /accounts`

Create a new temporary email account.

**Scopes Required:** `accounts:create`, `accounts:read`

**Request Body:**

```json
{
  "localPart": "myuser",     // Optional: custom username
  "domain": "tmailcc.app"     // Optional: specific domain
}
```

If `localPart` is not provided, a random 12-character address is generated.

**Response:**

```json
{
  "success": true,
  "data": {
    "address": "myuser@tmailcc.app",
    "localPart": "myuser",
    "domain": "tmailcc.app",
    "createdAt": "2026-05-23T10:00:00.000Z"
  }
}
```

**Example:**

```bash
# Random address
curl -X POST -H "Authorization: Bearer <key>" \
     -H "Content-Type: application/json" \
     -d '{}' \
     https://tmailcc.app/api/v1/accounts

# Custom address
curl -X POST -H "Authorization: Bearer <key>" \
     -H "Content-Type: application/json" \
     -d '{"localPart": "test123", "domain": "tmailcc.app"}' \
     https://tmailcc.app/api/v1/accounts
```

---

#### `GET /accounts`

List all email accounts belonging to the authenticated user.

**Scopes Required:** `accounts:read`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `domain` | string | - | Filter by domain |
| `search` | string | - | Search in address |
| `limit` | number | 50 | Max results |
| `skip` | number | 0 | Pagination offset |

**Response:**

```json
{
  "success": true,
  "data": {
    "accounts": [
      {
        "address": "abc123@tmailcc.app",
        "localPart": "abc123",
        "domain": "tmailcc.app",
        "emailCount": 5,
        "createdAt": "2026-05-23T10:00:00.000Z",
        "lastActivity": "2026-05-23T12:00:00.000Z"
      }
    ],
    "total": 1,
    "skip": 0,
    "limit": 50
  }
}
```

---

#### `DELETE /accounts/:address`

Delete an email account and all its emails.

**Scopes Required:** `accounts:delete`

**Parameters:**

- `address` - The email address to delete (URL encoded)

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Account deleted",
    "address": "abc123@tmailcc.app"
  }
}
```

**Example:**

```bash
curl -X DELETE -H "Authorization: Bearer <key>" \
     https://tmailcc.app/api/v1/accounts/abc123%40tmailcc.app
```

---

### Emails

#### `GET /accounts/:address/emails`

List emails in an account's inbox.

**Scopes Required:** `emails:read`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Max results |
| `skip` | number | 0 | Pagination offset |
| `unreadOnly` | boolean | false | Only unread emails |

**Response:**

```json
{
  "success": true,
  "data": {
    "emails": [
      {
        "id": "uuid",
        "from": {
          "address": "sender@example.com",
          "name": "Sender"
        },
        "to": "abc123@tmailcc.app",
        "subject": "Your verification code",
        "isRead": false,
        "isStarred": false,
        "receivedAt": "2026-05-23T12:00:00.000Z",
        "hasAttachments": false
      }
    ],
    "total": 1,
    "skip": 0,
    "limit": 50
  }
}
```

---

#### `GET /emails/:id`

Get full email details including content.

**Scopes Required:** `emails:read`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sanitize` | boolean | true | Sanitize HTML content |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "from": {
      "address": "sender@example.com",
      "name": "Sender"
    },
    "to": "abc123@tmailcc.app",
    "subject": "Your verification code",
    "text": "Your code is 123456",
    "html": "<html>...</html>",
    "headers": {},
    "attachments": [
      {
        "filename": "document.pdf",
        "contentType": "application/pdf",
        "size": 1024
      }
    ],
    "isRead": true,
    "isStarred": false,
    "receivedAt": "2026-05-23T12:00:00.000Z"
  }
}
```

---

### OTP / Verification Codes

#### `GET /accounts/:address/wait-otp`

Long-polling endpoint to wait for an OTP/verification code.

**Scopes Required:** `otp:read`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `timeout` | number | 120 | Max wait time in seconds (max 300) |
| `interval` | number | 2 | Poll interval in seconds (max 30) |

**OTP Detection Patterns:**

The endpoint automatically detects common OTP formats:
- 4-8 digit codes: `1234`, `123456`
- Alphanumeric codes: `ABC123`
- Text patterns: "Your code is 123456", "Mã xác minh: 123456"

**Response (OTP Found):**

```json
{
  "success": true,
  "data": {
    "email": {
      "id": "uuid",
      "from": {
        "address": "noreply@google.com",
        "name": "Google"
      },
      "subject": "Your Google verification code",
      "receivedAt": "2026-05-23T12:00:00.000Z"
    },
    "otpCodes": ["123456", "789012"],
    "waitTimeMs": 5000
  }
}
```

**Response (Timeout):**

```json
{
  "success": false,
  "error": {
    "code": "OTP_TIMEOUT",
    "message": "No OTP code detected within timeout period"
  }
}
```

**Example (JavaScript):**

```javascript
async function waitForOTP(address, timeout = 120) {
  const startTime = Date.now();
  const maxTime = timeout * 1000;

  while (Date.now() - startTime < maxTime) {
    const response = await fetch(
      `https://tmailcc.app/api/v1/accounts/${address}/wait-otp?timeout=10`,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`
        }
      }
    );

    const data = await response.json();

    if (data.success && data.data.otpCodes) {
      return data.data.otpCodes[0]; // Return first detected OTP
    }

    // Wait 3 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  throw new Error('OTP timeout - no code detected');
}

// Usage
const code = await waitForOTP('test@tmailcc.app');
console.log('OTP:', code);
```

---

### Usage Statistics

#### `GET /usage`

Get API usage statistics.

**Scopes Required:** `usage:read`

**Response:**

```json
{
  "success": true,
  "data": {
    "api": {
      "totalRequests": 150,
      "byEndpoint": {
        "GET /domains": 50,
        "POST /accounts": 30
      },
      "byDay": [
        { "date": "2026-05-23", "count": 50 }
      ]
    },
    "accounts": {
      "count": 5
    },
    "emails": {
      "count": 25
    }
  }
}
```

---

### Webhooks

#### `POST /webhooks`

Create a new webhook.

**Scopes Required:** `webhooks:manage`

**Request Body:**

```json
{
  "url": "https://your-server.com/webhook",
  "events": ["email.received", "otp.detected"],
  "name": "My Webhook"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "url": "https://your-server.com/webhook",
    "name": "My Webhook",
    "events": ["email.received", "otp.detected"],
    "secretHint": "****abcd",
    "isActive": true,
    "createdAt": "2026-05-23T10:00:00.000Z"
  }
}
```

**Important:** Save the webhook secret immediately - it's only shown once!

---

#### `GET /webhooks`

List all webhooks.

**Scopes Required:** `webhooks:manage`

---

#### `DELETE /webhooks/:id`

Delete a webhook.

**Scopes Required:** `webhooks:manage`

---

## 5. Webhooks

### Event Types

| Event | Description | Payload |
|-------|-------------|---------|
| `email.received` | New email received | Email details |
| `otp.detected` | OTP code found in email | Email + OTP codes |

### Webhook Payload

```json
{
  "event": "email.received",
  "timestamp": "2026-05-23T12:00:00.000Z",
  "data": {
    "id": "uuid",
    "from": {
      "address": "sender@example.com",
      "name": "Sender"
    },
    "to": "abc123@tmailcc.app",
    "subject": "Test Email",
    "text": "Email body...",
    "receivedAt": "2026-05-23T12:00:00.000Z"
  }
}
```

For `otp.detected` events, the payload includes detected codes:

```json
{
  "event": "otp.detected",
  "timestamp": "2026-05-23T12:00:00.000Z",
  "data": {
    "email": { ... },
    "otpCodes": ["123456"]
  }
}
```

### Webhook Headers

| Header | Description |
|--------|-------------|
| `X-TmailCC-Event` | Event type (e.g., `email.received`) |
| `X-TmailCC-Signature` | HMAC signature (format: `sha256=...`) |
| `X-TmailCC-Timestamp` | Unix timestamp of the request |

### Signature Verification

Verify webhook authenticity using HMAC-SHA256:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, timestamp, secret) {
  // Create expected signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${JSON.stringify(payload)}`)
    .digest('hex');

  // Compare signatures (timing-safe)
  const sig = signature.replace('sha256=', '');
  return crypto.timingSafeEqual(
    Buffer.from(sig, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

// Example Express handler
app.post('/webhook', express.json(), (req, res) => {
  const signature = req.headers['x-tmailcc-signature'];
  const timestamp = req.headers['x-tmailcc-timestamp'];

  if (!verifyWebhookSignature(req.body, signature, timestamp, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  console.log('Webhook received:', req.body);
  res.send('OK');
});
```

### Retry Behavior

Failed webhook deliveries are retried up to 3 times with exponential backoff:
- 1st retry: 1 second
- 2nd retry: 5 seconds
- 3rd retry: 15 seconds

---

## 6. Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing API key |
| `FORBIDDEN` | 403 | Valid key but insufficient permissions |
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMITED` | 429 | Too many requests |
| `QUOTA_EXCEEDED` | 429 | Quota exceeded |
| `CONFLICT` | 409 | Resource already exists |
| `OTP_TIMEOUT` | 408 | OTP wait timeout (no code found) |
| `INTERNAL_ERROR` | 500 | Server error |

### Rate Limits

- **Default:** 100 requests per minute per API key
- Rate limit headers are included in responses:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining in window
  - `Retry-After`: Seconds until rate limit resets (when limited)

---

## 7. Code Examples

### JavaScript (fetch)

```javascript
const API_KEY = 'tmail_abc123...';
const BASE_URL = 'https://tmailcc.app/api/v1';

// Create email account
async function createAccount() {
  const response = await fetch(`${BASE_URL}/accounts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  if (data.success) {
    return data.data.address;
  }
  throw new Error(data.error.message);
}

// List emails
async function getEmails(address) {
  const response = await fetch(
    `${BASE_URL}/accounts/${encodeURIComponent(address)}/emails`,
    {
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    }
  );

  const data = await response.json();
  return data.success ? data.data.emails : [];
}

// Usage
const email = await createAccount();
console.log('Created:', email);
const emails = await getEmails(email);
console.log('Emails:', emails);
```

### Python

```python
import requests

API_KEY = 'tmail_abc123...'
BASE_URL = 'https://tmailcc.app/api/v1'
headers = {'Authorization': f'Bearer {API_KEY}'}

# Create account
response = requests.post(f'{BASE_URL}/accounts', headers=headers)
data = response.json()
email = data['data']['address']

# Get domains
response = requests.get(f'{BASE_URL}/domains', headers=headers)
domains = response.json()['data']['domains']

# List emails
response = requests.get(
    f'{BASE_URL}/accounts/{email}/emails',
    headers=headers
)
emails = response.json()['data']['emails']
```

### Node.js OTP Wait Example

```javascript
async function waitForOTP(address, timeout = 120) {
  const startTime = Date.now();
  const maxTime = timeout * 1000;

  while (Date.now() - startTime < maxTime) {
    try {
      const response = await fetch(
        `https://tmailcc.app/api/v1/accounts/${address}/wait-otp?timeout=10`,
        {
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (data.success && data.data.otpCodes) {
        console.log(`OTP found after ${data.data.waitTimeMs}ms`);
        return data.data.otpCodes[0];
      }

      if (!data.success && data.error.code === 'OTP_TIMEOUT') {
        console.log('Timeout, continuing to wait...');
      }
    } catch (error) {
      console.error('Error:', error.message);
    }

    // Wait 2 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error('OTP timeout - no code detected within timeout period');
}

// Complete verification flow
async function verifyWithOTP(email, service) {
  console.log(`Waiting for OTP from ${service}...`);

  const code = await waitForOTP(email, 180);
  console.log(`Got OTP: ${code}`);

  // Now verify with the service
  // await service.verify(code);

  return code;
}
```

### Express Webhook Handler

```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const WEBHOOK_SECRET = 'your-webhook-secret';

function verifySignature(payload, signature, timestamp) {
  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(`${timestamp}.${JSON.stringify(payload)}`)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature.replace('sha256=', ''), 'hex'),
    Buffer.from(expected, 'hex')
  );
}

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-tmailcc-signature'];
  const timestamp = req.headers['x-tmailcc-timestamp'];
  const event = req.headers['x-tmailcc-event'];

  // Verify signature
  if (!verifySignature(req.body, signature, timestamp)) {
    console.error('Invalid webhook signature');
    return res.status(401).send('Invalid signature');
  }

  // Handle event
  switch (event) {
    case 'email.received':
      console.log('New email:', req.body.data);
      break;
    case 'otp.detected':
      console.log('OTP found:', req.body.data.otpCodes);
      break;
  }

  res.send('OK');
});

app.listen(3000, () => {
  console.log('Webhook server running on port 3000');
});
```

---

## 8. Security Best Practices

### 1. Keep API Keys Secure

- Never commit API keys to version control
- Use environment variables
- Rotate keys regularly
- Set expiration dates when possible

### 2. Use Minimal Scopes

Request only the scopes your application needs. This limits the damage if a key is compromised.

### 3. Verify Webhook Signatures

Always verify the HMAC signature on webhook requests to ensure they're from tmailCC.

### 4. Use HTTPS

All API requests must use HTTPS. HTTP requests will be rejected.

### 5. Handle Rate Limits

Implement exponential backoff when receiving 429 responses:

```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || Math.pow(2, i);
      await new Promise(r => setTimeout(r, retryAfter * 1000));
      continue;
    }

    return response;
  }
  throw new Error('Max retries exceeded');
}
```

### 6. Don't Log Sensitive Data

Never log raw API keys or email content that may contain sensitive information.

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| All endpoints | 100 | 1 minute |
| `/accounts` POST | 10 | 1 minute |
| `/accounts/:address/wait-otp` | 30 | 1 minute |

Rate limit headers are included in every response:
- `X-RateLimit-Limit`: Requests allowed per window
- `X-RateLimit-Remaining`: Requests remaining

---

## Support

For issues or questions:
- GitHub Issues: [tmailCC Issues](https://github.com/your-repo/issues)
- Email: support@tmailcc.app

---

**Document Version:** 1.0
**Last Updated:** May 23, 2026
