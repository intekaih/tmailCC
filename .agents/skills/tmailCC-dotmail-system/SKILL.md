---
name: tmailCC-dotmail-system
description: Understand and extend the tmailCC dotmail system — Gmail dot-variants generation, IMAP polling, and admin management. Use when modifying dotmail logic, adding new providers, or troubleshooting Gmail integration.
version: 1.0.0
---

# tmailCC Dotmail System

## Overview

The dotmail system generates unique email variants from a parent Gmail account by inserting dots (`.`) in different positions. For example, `testuser@gmail.com` can have variants like:
- `t.estuser@gmail.com`
- `te.stuser@gmail.com`
- `test.user@gmail.com`
- `test.usr@gmail.com`

All variants forward to the parent Gmail account. tmailCC can then read OTP codes from the parent Gmail via IMAP.

## Database Schema

### dotmail_parents

Stores the parent Gmail accounts:

| Column | Type | Description |
|--------|-------|-------------|
| `id` | uuid | Primary key |
| `address` | text | Full Gmail address (e.g. `user@gmail.com`) |
| `app_password` | text | Gmail App Password (not regular password) |
| `created_at` | timestamptz | Creation timestamp |
| `updated_at` | timestamptz | Last update |
| `last_checked` | timestamptz | Last IMAP poll |

### dotmails

Stores generated dotmail variants:

| Column | Type | Description |
|--------|-------|-------------|
| `id` | uuid | Primary key |
| `parent_id` | uuid | FK to dotmail_parents |
| `address` | text | Full dotmail address |
| `created_at` | timestamptz | Creation timestamp |

## API Endpoints (Admin)

### List All Dotmails

```bash
GET /api/admin/dotmails
Authorization: Bearer <admin-token>

Response:
{
  "parents": [
    {
      "id": "uuid",
      "address": "user@gmail.com",
      "app_password": "encrypted-password",
      "dotmails": [
        { "id": "uuid", "address": "u.ser@gmail.com" },
        { "id": "uuid", "address": "us.er@gmail.com" }
      ]
    }
  ]
}
```

### Add Parent Gmail

```bash
POST /api/admin/dotmails
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "action": "add-parent",
  "address": "user@gmail.com",
  "app_password": "app-password"
}
```

### Generate Dotmail

```bash
POST /api/admin/dotmails
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "action": "generate",
  "parent_id": "parent-uuid"
}
```

### Check IMAP Connection

```bash
POST /api/admin/dotmails
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "action": "check-parent",
  "id": "parent-uuid"
}
```

### Delete Parent

```bash
POST /api/admin/dotmails
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "action": "delete-parent",
  "id": "parent-uuid"
}
```

### Delete Dotmail

```bash
POST /api/admin/dotmails
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "action": "delete-dotmail",
  "id": "dotmail-uuid"
}
```

### Fetch OTP from Gmail

```bash
GET /api/admin/dotmails?action=otp&address=0.0user@gmail.com
Authorization: Bearer <admin-token>

Response:
{
  "otp": "123456",
  "from": "noreply@example.com",
  "subject": "Your verification code"
}
```

## IMAP Polling

The dotmail system uses IMAP to poll Gmail for new emails containing OTP codes.

### IMAP Connection

```typescript
import Imap from 'imap';

const imap = new Imap({
  user: 'user@gmail.com',
  password: 'app-password',
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
});

function connectToGmail(parent: DotmailParent) {
  imap.once('ready', () => {
    imap.openBox('INBOX', true, (err, box) => {
      if (err) throw err;
      
      // Search for recent emails
      imap.search(['UNSEEN', ['SINCE', new Date()]], (err, results) => {
        if (err) throw err;
        // Process emails...
      });
    });
  });
  
  imap.connect();
}
```

### OTP Extraction from Gmail

```typescript
async function fetchOTPFromGmail(address: string): Promise<string | null> {
  const parent = await getParentByAddress(address);
  if (!parent) return null;
  
  const imap = new Imap({
    user: parent.address,
    password: parent.app_password,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
  });
  
  return new Promise((resolve) => {
    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err) => {
        const searchCriteria = ['UNSEEN', ['SINCE', new Date(Date.now() - 5 * 60 * 1000)]];
        
        imap.search(searchCriteria, (err, results) => {
          if (err || results.length === 0) {
            imap.end();
            resolve(null);
            return;
          }
          
          const fetch = imap.fetch(results, { bodies: '' });
          
          fetch.on('message', (msg) => {
            msg.on('body', (stream) => {
              let text = '';
              stream.on('data', (chunk) => { text += chunk.toString('utf8'); });
              stream.once('end', () => {
                const otp = extractOTPCode(text);
                if (otp) resolve(otp);
              });
            });
          });
          
          fetch.once('end', () => { imap.end(); });
        });
      });
    });
    
    imap.connect();
  });
}
```

## Dot Generation Algorithm

Generates dotmail variants with exactly N dots inserted:

```typescript
function generateDotmails(email: string, maxDots: number = 1): string[] {
  const [local, domain] = email.split('@');
  const dotmails: Set<string> = new Set();
  
  function insertDots(s: string, dotsLeft: number): void {
    if (dotsLeft === 0) {
      if (s !== local) {
        dotmails.add(`${s}@${domain}`);
      }
      return;
    }
    
    for (let i = 1; i < s.length; i++) {
      if (s[i] !== '.') {
        insertDots(s.slice(0, i) + '.' + s.slice(i), dotsLeft - 1);
      }
    }
  }
  
  insertDots(local, maxDots);
  return Array.from(dotmails);
}

// Example:
// generateDotmails("test@gmail.com", 1)
// Returns: ["t.est@gmail.com", "te.st@gmail.com", "tes.t@gmail.com", "test.@gmail.com", ...]
```

## Gmail App Password Setup

Users need to generate an App Password for IMAP access:

1. Enable 2-Factor Authentication on Google Account
2. Go to Security > App passwords
3. Generate a new app password for "Mail"
4. Use this password (16 characters, no spaces)

## Admin Panel UI (DotmailView.tsx)

The admin panel includes a DotmailView component for:
- Adding parent Gmail accounts
- Generating dotmail variants
- Viewing OTP from parent Gmail
- Checking IMAP connection status
- Deleting parents or dotmails

## Error Handling

### IMAP Connection Failed
- Verify app password is correct
- Check if 2FA is enabled
- Ensure IMAP is enabled in Gmail settings

### No OTP Found
- Check if emails are arriving in Gmail
- Verify the correct dotmail address is being used
- Some services send OTP via SMS, not email

## Security Notes

1. **App Passwords**: Never store regular passwords, only App Passwords
2. **Encryption**: App passwords should be encrypted at rest
3. **Rate Limiting**: Limit IMAP polls to prevent Gmail rate limits
4. **Audit Logging**: Log all dotmail operations

## Future Improvements

- Support other email providers (Outlook, Yahoo)
- Background worker for IMAP polling
- Webhook integration for instant OTP delivery
- Email forwarding rules automation
