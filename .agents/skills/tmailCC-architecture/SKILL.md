---
name: tmailCC-architecture
description: Navigate, understand, and modify the tmailCC webmail project. Use when exploring project structure, understanding tech stack, or making cross-cutting changes.
version: 1.0.0
---

# tmailCC Architecture Guide

## Tech Stack

- **Next.js 14** — App Router, TypeScript, API Routes
- **Supabase** — PostgreSQL, Auth, RLS, Realtime, Storage
- **Tailwind CSS** — Responsive styling
- **Docker** — Containerization
- **Cloudflare** — DNS, SSL, CDN deployment

## Directory Structure

```
tmailCC/
├── client/                    # Next.js frontend
│   ├── app/                  # App Router pages
│   │   ├── api/             # API routes (Next.js Route Handlers)
│   │   │   ├── accounts/    # Account CRUD
│   │   │   ├── admin/       # Admin panel endpoints
│   │   │   ├── auth/        # Login/logout/me
│   │   │   ├── config/      # Config endpoints
│   │   │   ├── developer/   # Developer API key management
│   │   │   ├── emails/      # Email CRUD
│   │   │   ├── otp/         # OTP verification & refresh
│   │   │   ├── qr/          # QR code generation
│   │   │   ├── test/        # Test endpoints
│   │   │   ├── test-db/     # Database test
│   │   │   ├── v1/          # v1 API compatibility
│   │   │   ├── webhook/      # Inbound email webhook
│   │   │   ├── health/      # Health check
│   │   │   └── config/       # System config
│   │   ├── app/              # Main app page (dashboard)
│   │   ├── landing/          # Landing page
│   │   ├── otp/              # OTP email viewer (no login)
│   │   ├── docs/             # Documentation pages
│   │   │   └── [filename]/page.tsx  # Dynamic doc routes
│   │   └── page.tsx         # Root redirect page
│   ├── components/           # React components
│   │   ├── Sidebar.tsx       # Navigation sidebar
│   │   ├── AdminPanel.tsx    # Admin management UI
│   │   ├── DeveloperSettings.tsx # API key management
│   │   ├── DotmailView.tsx   # Gmail dotmail management
│   │   ├── NotificationSound.tsx # Sound notification
│   │   └── Turnstile.tsx      # Cloudflare challenge
│   ├── lib/                  # Client-side utilities
│   │   ├── api.ts            # API client + interfaces
│   │   ├── auth.ts           # JWT utilities
│   │   ├── notification.ts   # Notification handling
│   │   ├── realtime.ts       # Realtime subscription
│   │   ├── RealtimeContext.tsx # Realtime context provider
│   │   └── supabase/
│   │       └── client.ts     # Supabase client
│   ├── app/globals.css       # Global styles
│   ├── app/layout.tsx        # Root layout
│   └── public/               # Static assets
├── worker/                   # Background worker (future)
├── supabase/                 # Supabase migrations & config
├── docs/                     # Project documentation
│   ├── api-guide.md          # API documentation
│   ├── developer-api.md      # Developer API reference
│   ├── supabase-setup.md    # Database setup
│   ├── docker-guide.md       # Docker deployment
│   ├── deploy-vps.md        # VPS deployment
│   └── technical-report.md   # Technical overview
├── scripts/                  # Utility scripts
├── .env.example             # Environment template
├── docker-compose.yml        # Docker Compose config
├── Dockerfile                # Container image
├── ecosystem.config.js       # PM2 cluster config
└── package.json              # Root package scripts
```

## Key Patterns

### API Route Handler Pattern

```typescript
// client/app/api/accounts/route.ts
export async function GET(request: Request) {
  // 1. Extract auth token
  // 2. Verify token / check admin
  // 3. Query Supabase with service role
  // 4. Return JSON response
}
```

### Response Format

```typescript
// Success
return NextResponse.json({ success: true, data: { ... } });

// Error
return NextResponse.json(
  { success: false, error: { code: 'ERROR_CODE', message: '...' } },
  { status: 400 }
);
```

### Supabase Client Usage

- **Browser**: `createClient()` from `@supabase/supabase-js`
- **Server/API**: `supabaseAdmin` with `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS)

### Realtime Subscriptions

Use Supabase Realtime channels for live email notifications:

```typescript
const channel = supabase.channel('emails')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'emails' }, 
    (payload) => { /* handle change */ }
  )
  .subscribe();
```

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only) |
| `SUPABASE_JWT_SECRET` | JWT signing secret |
| `WEBHOOK_SECRET` | Inbound webhook verification |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile |
| `TURNSTILE_SECRET_KEY` | Turnstile server-side |

## Database Tables

- `accounts` — Email accounts (local part, domain, owner)
- `emails` — Email messages with attachments
- `profiles` — User profiles (role, username)
- `api_keys` — Developer API keys with scopes
- `domains` — Available email domains
- `dotmail_parents` — Gmail accounts for dotmail generation
- `dotmails` — Generated dotmail variants

## RLS Policies

Row Level Security is enabled. Service role bypasses RLS. API routes use service role for admin operations.

## Important Conventions

1. **Admin routes** check `isAdmin` role before allowing operations
2. **OTP flow** uses polling/refresh with 3-minute expiry window
3. **Dotmail system** generates dot-variants from a parent Gmail account
4. **Webhook endpoint** receives inbound emails and stores them in `emails` table
5. **Realtime** broadcasts email events to all connected clients
6. **Landing page** is separate from the authenticated app

## Quick Reference

- Dev: `cd client && npm run dev`
- Build: `cd client && npm run build`
- Docker: `docker-compose up -d`
- API Base: `/api/accounts`, `/api/emails`, `/api/admin/...`
