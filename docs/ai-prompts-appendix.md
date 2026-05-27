# tmailCC - Phụ Lục AI Prompts

## Giới thiệu

Trong quá trình phát triển dự án tmailCC, tôi đã sử dụng **Cursor AI** (GitHub Copilot powered) và **Claude** (Anthropic) để hỗ trợ phát triển. Dưới đây là các prompts đã sử dụng kèm theo mục đích và kết quả.

---

## Danh sách Prompts

### Prompt #1: Thiết kế Database Schema

**Prompt:**
```
Design a PostgreSQL database schema for a temporary email web application using Supabase. The schema should include:

1. users (extends auth.users from Supabase)
2. accounts (email accounts, each belongs to a user)
3. emails (messages, each belongs to an account)
4. domains (available email domains)
5. ip_blocklist (blocked IPs)
6. config (key-value store for settings)

Requirements:
- RLS (Row Level Security) policies for each table
- Proper indexes for performance
- Triggers for automatic profile creation on user signup
- Timestamp columns for tracking
- Think about one-to-many relationships between tables

Please provide the complete SQL schema with comments.
```

**Mục đích:** Thiết kế database schema từ đầu, đảm bảo proper relationships và RLS policies.

**Kết quả:** Được schema SQL hoàn chỉnh với:
- 6 bảng chính với proper relationships
- Indexes cho performance
- Triggers cho auto profile creation
- RLS policies cho tất cả bảng
- Comments rõ ràng cho documentation

**File tham chiếu:** `server/supabase/schema.sql`

---

### Prompt #2: Tạo Supabase Realtime Subscription

**Prompt:**
```
I have a Next.js 14 application using Supabase. I need to implement real-time email notifications using Supabase Realtime.

Requirements:
1. Subscribe to new emails for a specific account
2. Get INSERT events when new emails arrive
3. Format the data properly for my existing Email interface
4. Handle subscription errors and cleanup

The account has an `account_id` field. The email table has columns:
- id, account_id, from_address, from_name, subject, text_content, html_content, is_read, is_starred, received_at

Please write a TypeScript function `subscribeToEmails` that:
- Takes accountId as parameter
- Returns an unsubscribe function
- Calls a callback when new emails arrive
- Handles errors gracefully
```

**Mục đích:** Implement real-time notifications bằng Supabase Realtime thay vì SSE để đơn giản hóa kiến trúc.

**Kết quả:** Được function `subscribeToEmails` hoàn chỉnh:
```typescript
export function subscribeToEmails(
  accountId: string,
  onNewEmail: (email: any) => void,
  onError?: (err: any) => void
) {
  const supabase = createClient();
  const channel = supabase
    .channel(`emails:${accountId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'emails',
      filter: `account_id=eq.${accountId}`,
    }, (payload) => {
      onNewEmail(formatEmailFromRealtime(payload.new));
    })
    .subscribe();
  return { unsubscribe: () => supabase.removeChannel(channel) };
}
```

**File tham chiếu:** `client/lib/realtime.ts`

---

### Prompt #3: Docker Multi-stage Build

**Prompt:**
```
I need a Dockerfile for a Next.js 14 application with the following requirements:

1. Multi-stage build to minimize image size
2. Use node:20-alpine as base
3. Production build with standalone output
4. Non-root user for security
5. Health check endpoint at /api/health
6. Environment variables for:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - SUPABASE_JWT_SECRET
   - WEBHOOK_SECRET

7. Copy only the standalone output, not the entire codebase
8. Expose port 3000

Please provide a production-ready Dockerfile with multi-stage build.
```

**Mục đích:** Tạo production-ready Dockerfile với multi-stage build để giảm kích thước image và tăng bảo mật.

**Kết quả:** Được Dockerfile hoàn chỉnh:
- 3-stage build: deps → builder → runner
- Non-root user (nextjs) với uid 1001
- Chỉ copy standalone output và static files
- Health check với wget
- Proper environment variable handling

**File tham chiếu:** `Dockerfile`

---

### Prompt #4: Implement RLS Policy

**Prompt:**
```
I have a Supabase database with the following tables:

1. profiles (id uuid PK, user_id uuid FK to auth.users, username text, role text)
2. accounts (id uuid PK, user_id uuid FK to auth.users, address text)
3. emails (id uuid PK, account_id uuid FK to accounts)

I need Row Level Security policies:

1. profiles: Users can view their own profile. Admins (role='admin') can view all.
2. accounts: Users can only see/create/delete their own accounts. Admins can see all.
3. emails: Users can only access emails from their own accounts.

Write the SQL to:
1. Enable RLS on all tables
2. Create the necessary policies with proper USING and WITH CHECK clauses
3. Use auth.uid() to get the current user ID
4. Check role='admin' for admin access
5. Use subqueries to check account ownership for emails

Please provide detailed comments explaining each policy.
```

**Mục đích:** Tạo RLS policies để bảo mật dữ liệu, đảm bảo user chỉ truy cập được dữ liệu của mình.

**Kết quả:** Được RLS policies hoàn chỉnh:
- Enable RLS on all tables
- SELECT policies: view own data or all data for admins
- INSERT policies: create only own records
- UPDATE policies: update own records or all for admins
- DELETE policies: delete own records or all for admins
- Proper use of subqueries for foreign key relationships

**File tham chiếu:** `server/supabase/schema.sql` (phần RLS)

---

### Prompt #5: JWT Authentication Middleware

**Prompt:**
```
Create a JWT authentication middleware for Express.js with the following requirements:

1. Verify JWT token from Authorization header (Bearer token)
2. Extract user info: id, username, email, role
3. Support multiple JWT secrets (SUPABASE_JWT_SECRET and JWT_SECRET)
4. Return 401 for invalid/expired tokens
5. Attach decoded user to req.user
6. Support optional authentication (doesn't fail if no token)
7. Admin check middleware (requireAdmin)

Use jsonwebtoken library.

Example usage:
```javascript
app.get('/protected', authenticate, (req, res) => {
  res.json({ user: req.user });
});

app.get('/admin', authenticate, requireAdmin, (req, res) => {
  res.json({ message: 'Admin access granted' });
});
```
```

**Mục đích:** Tạo authentication middleware để bảo vệ API endpoints.

**Kết quả:** Được middleware hoàn chỉnh:
- `authenticate`: Verify token, attach user to req.user
- `optionalAuth`: Same but don't fail if no token
- `requireAdmin`: Check if user has admin role
- Support fallback JWT secrets
- Proper error handling

**File tham chiếu:** `server/middleware/auth.js`

---

### Prompt #6: Responsive CSS Layout

**Prompt:**
```
I have a 3-column email web app layout:
- Left: Sidebar (accounts list, 250px)
- Middle: Email list (350px)
- Right: Email viewer (flexible)

I need responsive CSS for mobile devices:

1. On screens < 768px:
   - Hide sidebar and email list
   - Show hamburger menu button
   - Email viewer takes full width
   - When sidebar is open, it should overlay from left

2. On screens 768px - 1024px:
   - Sidebar collapsed by default (icon only, 60px)
   - Expand on hover/click
   - Email list and viewer take remaining space

3. Dark mode support with CSS variables

Please write the CSS using Tailwind classes and custom CSS variables.
```

**Mục đích:** Cải thiện responsive mobile experience.

**Kết quả:** Được responsive CSS:
- Mobile: hamburger menu, overlay sidebar
- Tablet: collapsible sidebar
- Desktop: full 3-column layout
- Dark/light mode với CSS variables
- Smooth transitions

**File tham chiếu:** `client/app/globals.css`

---

### Prompt #7: TypeScript Types for API

**Prompt:**
```
I have a Next.js 14 API with the following endpoints. Write TypeScript interfaces/types for:

1. User: { id, username, email, role, emailCount?, preferences? }
2. Account: { id, address, localPart, domain, userId, createdAt, emailCount?, unreadCount? }
3. Email: { _id, id, account, from, fromName, to, subject, text, html, attachments[], receivedAt, isRead, isStarred }
4. Domain: { id, domain, label, isActive, isDefault }
5. EmailListResponse: { emails[], unreadCount, total }
6. ApiError: { error: string }

Also write the API client class/functions:
- api.auth.login({ username, password }): Promise<{ user, token }>
- api.auth.me(): Promise<{ user }>
- api.accounts.list(): Promise<{ accounts[] }>
- api.accounts.create({ localPart, domain }): Promise<Account>
- api.emails.list(address): Promise<EmailListResponse>
- api.emails.markRead(id): Promise<Email>

Use fetch for HTTP requests and handle errors properly.
```

**Mục đích:** Tạo TypeScript types và API client cho type safety.

**Kết quả:** Được:
- Interfaces đầy đủ cho tất cả entities
- API client với proper types
- Error handling
- Token management

**File tham chiếu:** `client/lib/api.ts`

---

## Tổng kết

| # | Prompt | Mục đích | Kết quả |
|---|--------|----------|---------|
| 1 | Database Schema | Thiết kế database | Schema hoàn chỉnh 6 bảng |
| 2 | Realtime Subscription | Real-time notifications | Supabase Realtime implementation |
| 3 | Docker Build | Production deployment | Multi-stage Dockerfile |
| 4 | RLS Policies | Bảo mật dữ liệu | 12+ RLS policies |
| 5 | JWT Middleware | API authentication | Auth middleware hoàn chỉnh |
| 6 | Responsive CSS | Mobile support | Responsive layout |
| 7 | TypeScript Types | Type safety | API client với types |

## Công cụ AI đã sử dụng

1. **Cursor AI** (GitHub Copilot) - Code completion, refactoring
2. **Claude** (Anthropic) - Architecture design, documentation, complex logic

## Bài học rút ra

1. **AI không thay thế hiểu biết**: Cần hiểu rõ RLS, Supabase Auth, Docker để review và sửa AI output
2. **Iterative prompts**: Bắt đầu với yêu cầu tổng quát, sau đó refine chi tiết
3. **Security**: Luôn verify AI-generated SQL và code security
4. **Documentation**: Yêu cầu AI viết comments rõ ràng để dễ maintain
