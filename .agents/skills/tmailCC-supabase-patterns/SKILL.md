---
name: tmailCC-supabase-patterns
description: Query tmailCC Supabase database, manage RLS policies, and work with Realtime subscriptions. Use when adding database tables, modifying auth, or debugging data access issues.
version: 1.0.0
---

# tmailCC Supabase Patterns

## Supabase Clients

### Browser Client (Client-side, respects RLS)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Admin Client (Server-side, bypasses RLS)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});
```

## Database Tables

### accounts

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `local_part` | text | Email local part (e.g. "abc123") |
| `domain` | text | Domain (e.g. "kaih.co.uk") |
| `user_id` | uuid | FK to profiles |
| `created_at` | timestamptz | Auto |
| `last_activity` | timestamptz | Updated on email receive |

### emails

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `account_id` | uuid | FK to accounts |
| `message_id` | text | SMTP Message-ID header |
| `from_address` | text | Sender email |
| `from_name` | text | Sender display name |
| `to_address` | text | Recipient |
| `subject` | text | Email subject |
| `text_body` | text | Plain text body |
| `html_body` | text | HTML body |
| `is_read` | boolean | Read status |
| `is_starred` | boolean | Starred status |
| `is_deleted` | boolean | Soft delete |
| `received_at` | timestamptz | Receive timestamp |

### profiles

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, FK to auth.users |
| `username` | text | Display name |
| `role` | text | 'user' or 'admin' |
| `is_active` | boolean | Account active |

### api_keys

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK to profiles |
| `name` | text | Key name (e.g. "My App") |
| `key_hash` | text | SHA256 of key |
| `scopes` | text[] | Permission scopes |
| `last_used_at` | timestamptz | Last usage |
| `created_at` | timestamptz | Creation time |

## Common Queries

### Create Account

```typescript
const { data, error } = await supabaseAdmin
  .from('accounts')
  .insert({
    local_part: localPart,
    domain: domainName,
    user_id: userId,
  })
  .select()
  .single();
```

### Get Account with Emails

```typescript
const { data: account } = await supabaseAdmin
  .from('accounts')
  .select('*, emails(*)')
  .eq('id', accountId)
  .single();
```

### Get Unread Count

```typescript
const { count } = await supabaseAdmin
  .from('emails')
  .select('*', { count: 'exact', head: true })
  .eq('account_id', accountId)
  .eq('is_read', false)
  .eq('is_deleted', false);
```

### Update Last Activity

```typescript
await supabaseAdmin
  .from('accounts')
  .update({ last_activity: new Date().toISOString() })
  .eq('id', accountId);
```

## RLS Policies

### accounts table policies

- **Select**: Users can select their own accounts (user_id = auth.uid())
- **Insert**: Authenticated users can insert accounts
- **Update**: Users can update their own accounts
- **Delete**: Users can delete their own accounts
- **Admin**: Admin role can do anything

### emails table policies

- **Select**: Users can see emails for their accounts
- **Insert**: Only via service role (API routes)
- **Update**: Users can mark emails read/starred for their accounts
- **Delete**: Users can soft-delete their emails

## Realtime Subscriptions

### Subscribe to New Emails

```typescript
const channel = supabase
  .channel(`emails:${accountId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'emails',
      filter: `account_id=eq.${accountId}`,
    },
    (payload) => {
      console.log('New email:', payload.new);
    }
  )
  .subscribe();

// Cleanup
supabase.removeChannel(channel);
```

### Subscribe to Email Changes

```typescript
const channel = supabase
  .channel(`emails-changes:${accountId}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'emails',
      filter: `account_id=eq.${accountId}`,
    },
    (payload) => {
      if (payload.eventType === 'UPDATE') {
        // Handle read/starred changes
      }
    }
  )
  .subscribe();
```

## JWT Verification

tmailCC uses JWT for API authentication. Verify in API routes:

```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET!;

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
}
```

Token payload:
```typescript
interface TokenPayload {
  sub: string;       // User ID
  username?: string;
  email?: string;
  role: string;       // 'user' or 'admin'
  isGuest?: boolean;
}
```

## Migrations Location

Supabase migrations are stored in `/supabase/migrations/`. Apply with:
```bash
supabase db push
# or
supabase migration up
```

## Troubleshooting

### "Permission denied" errors
- Check RLS is enabled on the table
- Verify the service role key is being used in API routes
- Check the policy conditions match the query

### "Row-level security error" in API
- Use `supabaseAdmin` (service role) for server-side operations
- `supabase` client respects RLS policies
