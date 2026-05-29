# tmailCC - Báo Cáo Kỹ Thuật

## Mục lục
1. [Tổng quan dự án](#tổng-quan-dự-án)
2. [Những yêu cầu đã đáp ứng](#những-yêu-cầu-đã-đáp-ứng)
3. [Các file/thành phần đã chỉnh sửa](#các-filethành-phần-đã-chỉnh-sửa)
4. [Cách chạy local](#cách-chạy-local)
5. [Cách chạy Docker](#cách-chạy-docker)
6. [Cách deploy VPS/domain/SSL](#cách-deploy-vpsdomainssl)
7. [Các biến môi trường cần cấu hình](#các-biến-môi-trường-cần-cấu-hình)
8. [Các bước demo trong 5 phút](#các-bước-demo-trong-5-phút)
9. [Các câu hỏi vấn đáp có thể gặp](#các-câu-hỏi-vấn-đáp-có-thể-gặp)
10. [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)
11. [Database Schema](#database-schema)
12. [Kết luận & Hạn chế](#kết-luận--hạn-chế)
13. [Tài liệu tham khảo](#tài-liệu-tham-khảo)

---

## Tổng quan dự án

**tmailCC** là hệ thống Webmail với các tính năng:
- Email tạm thời (temporary email)
- Real-time notifications (Supabase Realtime)
- Multi-domain support
- Admin panel quản lý
- OTP page cho xem email không cần đăng nhập

### Công nghệ sử dụng

| Công nghệ | Phiên bản | Vai trò |
|-----------|-----------|---------|
| Next.js | 14.2.4 | Frontend & API Routes |
| TypeScript | 5.4.5 | Type safety |
| Tailwind CSS | 3.4.15 | Styling |
| Supabase | PostgreSQL | Database, Auth, Realtime |
| Docker | 20.10+ | Containerization |
| Nginx | - | Reverse proxy (VPS) |
| Cloudflare | - | DNS, SSL, CDN |

---

## Những yêu cầu đã đáp ứng

| # | Tiêu chí | Trạng thái | Chi tiết |
|---|----------|-------------|----------|
| 1 | Next.js App Router + TypeScript | ✅ Đạt | Dùng App Router, TypeScript strict |
| 2 | Tailwind CSS / shadcn/ui | ✅ Đạt | Tailwind CSS với CSS variables |
| 3 | Supabase Auth + Database | ✅ Đạt | Supabase Auth + PostgreSQL |
| 4 | Đăng ký/đăng nhập/đăng xuất | ✅ Đạt | Register, Login, Logout API |
| 5 | CRUD dữ liệu hoàn chỉnh | ✅ Đạt | Accounts, Emails, Users, Domains, Config |
| 6 | RLS/Phân quyền | ✅ Đạt | RLS policies đầy đủ |
| 7 | Supabase Realtime | ✅ Đạt | Email subscriptions |
| 8 | Supabase Storage | ✅ Đạt | Storage migration + RLS |
| 9 | Docker + Docker Compose | ✅ Đạt | Dockerfile + docker-compose.yml |
| 10 | Dockerfile production-ready | ✅ Đạt | Multi-stage build |
| 11 | .env.example | ✅ Đạt | Đầy đủ variables |
| 12 | Tài liệu setup | ✅ Đạt | README.md + docs/ |
| 13 | Tài liệu Docker | ✅ Đạt | docs/docker-guide.md |
| 14 | Tài liệu VPS/SSL | ✅ Đạt | docs/deploy-vps.md |
| 15 | AI Prompts Appendix | ✅ Đạt | docs/ai-prompts-appendix.md |
| 16 | Responsive UI | ✅ Đạt | Mobile-first responsive |
| 17 | GitHub Repository | ✅ Đạt | Commit history rõ ràng |
| 18 | Production URL | ✅ Đạt | https://tmailcc.app |

---

## Các file/thành phần đã chỉnh sửa

### File mới tạo

| File | Mô tả |
|------|--------|
| `client/app/api/auth/register/route.ts` | API endpoint đăng ký user |
| `docs/docker-guide.md` | Hướng dẫn Docker đầy đủ |
| `docs/deploy-vps.md` | Hướng dẫn deploy VPS + Nginx + SSL |
| `docs/ai-prompts-appendix.md` | Phụ lục AI prompts (7 prompts) |
| `server/supabase/storage_migration.sql` | Supabase Storage schema + RLS |

### File đã cập nhật

| File | Thay đổi |
|------|-----------|
| `.env.example` | Bổ sung đầy đủ variables |
| `client/components/AuthModal.tsx` | Thêm form đăng ký |
| `client/lib/i18n.ts` | Thêm translations mới |

### Cấu trúc project

```
tmailCC/
├── client/                    # Next.js Frontend
│   ├── app/                  # App Router
│   │   ├── api/             # API Routes
│   │   │   ├── auth/       # Auth: login, me, register, change-password
│   │   │   ├── accounts/   # CRUD accounts + domains
│   │   │   ├── emails/     # CRUD emails
│   │   │   ├── admin/      # Admin APIs
│   │   │   └── ...
│   │   ├── page.tsx        # Main app
│   │   ├── otp/           # OTP page
│   │   └── layout.tsx      # Root layout
│   ├── components/           # React components
│   ├── lib/                 # Utilities
│   │   ├── supabase/       # Supabase clients
│   │   ├── api.ts          # API client
│   │   ├── realtime.ts     # Realtime subscriptions
│   │   └── i18n.ts         # Internationalization
│   └── ...
├── server/                   # Express Backend (ops)
│   ├── supabase/            # SQL migrations
│   │   ├── schema.sql      # Database schema + RLS
│   │   └── storage_migration.sql
│   └── ...
├── docs/                     # Documentation
│   ├── docker-guide.md
│   ├── deploy-vps.md
│   ├── ai-prompts-appendix.md
│   └── supabase-setup.md
├── Dockerfile                # Multi-stage build
├── docker-compose.yml       # Docker Compose
└── .env.example             # Environment template
```

---

## Cách chạy local

### Yêu cầu

- Node.js 18+
- npm hoặc yarn
- Supabase project (local hoặc cloud)

### 1. Cài đặt Supabase

```bash
# Cách 1: Supabase CLI (khuyến nghị)
npx supabase init
npx supabase start

# Cách 2: Supabase Cloud
# Tạo project tại https://supabase.com
# Lấy credentials từ Settings > API
```

### 2. Chạy Database Schema

```bash
# Cách 1: Qua Supabase Dashboard
# SQL Editor > Paste schema.sql > Run

# Cách 2: Qua Supabase CLI
npx supabase db push

# Cách 3: Copy file schema.sql vào Supabase Dashboard SQL Editor
```

### 3. Cấu hình Environment

```bash
# Copy file mẫu
cp .env.example .env

# Chỉnh sửa .env
nano .env
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-32-char-minimum-secret
```

### 4. Cài đặt và chạy

```bash
# Cài đặt dependencies
cd client
npm install

# Chạy development server
npm run dev
```

### 5. Truy cập

Mở trình duyệt: http://localhost:3000

### Tạo admin user

```sql
-- Sau khi đăng ký user đầu tiên
UPDATE public.profiles
SET role = 'admin'
WHERE username = 'your_username';
```

---

## Cách chạy Docker

### Build và chạy

```bash
# Clone repository
git clone https://github.com/yourusername/tmailCC.git
cd tmailCC

# Cấu hình environment
cp .env.example .env
nano .env

# Build và chạy
docker-compose up -d

# Xem logs
docker-compose logs -f

# Test
curl http://localhost:3000/api/health
```

### Docker Commands

```bash
# Build image
docker build -t tmailcc .

# Chạy container
docker run -d -p 3000:3000 --env-file .env tmailcc

# Docker Compose
docker-compose up -d      # Start
docker-compose down       # Stop
docker-compose logs -f    # View logs
docker-compose restart    # Restart
docker-compose ps         # Status
```

### Kiểm tra

```bash
# Health check
curl http://localhost:3000/api/health

# Response:
# {"status":"ok","uptime":12345,"supabase":"configured"}
```

---

## Cách deploy VPS/domain/SSL

### Tổng quan kiến trúc

```
User → Cloudflare (DNS, SSL) → VPS (Nginx) → Docker (Next.js) → Supabase Cloud
```

### 1. Chuẩn bị VPS

```bash
# SSH vào VPS
ssh root@your-vps-ip

# Update
apt update && apt upgrade -y

# Cài Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
```

### 2. Clone và cấu hình

```bash
git clone https://github.com/yourusername/tmailCC.git
cd tmailCC
cp .env.example .env
nano .env
```

### 3. Cấu hình DNS trên Cloudflare

1. Thêm domain vào Cloudflare
2. Thêm A record trỏ đến VPS IP
3. Bật Proxy (orange cloud icon) để enable SSL

### 4. Deploy với Docker

```bash
# Build
docker build -t tmailcc .

# Chạy
docker run -d \
  --name tmailcc \
  -p 127.0.0.1:3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  tmailcc
```

### 5. Cấu hình Nginx

```bash
apt install -y nginx

# Tạo config
nano /etc/nginx/sites-available/tmailcc

# Enable config
rm /etc/nginx/sites-enabled/default
ln -s /etc/nginx/sites-available/tmailcc /etc/nginx/sites-enabled/

# Test và reload
nginx -t
systemctl reload nginx
```

### 6. SSL

Với Cloudflare Proxy, SSL được cấu hình tự động:
- Go to **SSL/TLS** → **Overview**
- Set Mode = "Full" hoặc "Flexible"

---

## Các biến môi trường cần cấu hình

### Biến bắt buộc

| Biến | Mô tả | Ví dụ |
|------|--------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key | `eyJhbGc...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | `eyJhbGc...` |
| `SUPABASE_JWT_SECRET` | JWT Secret (min 32 chars) | `random-32-char-secret` |

### Biến tùy chọn

| Biến | Mặc định | Mô tả |
|-------|-----------|--------|
| `WEBHOOK_SECRET` | - | Secret cho inbound email webhook |
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | `3000` | Port để listen |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Application URL |

### Cách tạo JWT Secret

```bash
# PowerShell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)

# Linux/Mac
openssl rand -base64 32
```

---

## Các bước demo trong 5 phút

### Demo 1: Đăng ký và tạo email (1 phút)

1. Mở ứng dụng → Click "Tạo tài khoản"
2. Điền username, email, password → Đăng ký
3. Sau khi đăng nhập → Click "Tạo địa chỉ mới"
4. Nhập địa chỉ email tùy chọn hoặc random
5. Copy địa chỉ email

### Demo 2: Real-time notifications (1 phút)

1. Giữ nguyên tab đang mở
2. Mở tab mới, gửi email đến địa chỉ vừa tạo
3. Quan sát: Email xuất hiện ngay lập tức (real-time)
4. Âm thanh thông báo phát (nếu bật)
5. Desktop notification xuất hiện (nếu bật)

### Demo 3: Admin panel (1 phút)

1. Đăng nhập với tài khoản admin
2. Click icon gear trên topbar → Admin Panel
3. Xem Stats: Users, Accounts, Emails, DB Size
4. Quản lý Users: Xem, sửa role, xóa
5. Quản lý Domains: Thêm, xóa domain

### Demo 4: OTP page (1 phút)

1. Đăng nhập admin
2. Vào Admin Panel → OTP Keys
3. Tạo OTP access key cho một email
4. Mở tab mới → /otp
5. Nhập email|access_key → Xem emails không cần đăng nhập

### Demo 5: Dark mode + i18n (1 phút)

1. Click icon mặt trăng/mặt trời → Chuyển dark/light mode
2. Click icon EN/VI → Chuyển ngôn ngữ
3. Settings được lưu vào localStorage

---

## Các câu hỏi vấn đáp có thể gặp

### Next.js & React

**Q: Server Component vs Client Component khác nhau thế nào?**
A: Server Components render ở server, gửi HTML đã hoàn chỉnh đến client, giảm JS bundle. Client Components cần JS phía client (useState, useEffect, event handlers). Trong dự án này, page.tsx dùng "use client" vì cần tương tác, layout.tsx là Server Component.

**Q: Tại sao dùng Next.js App Router?**
A: App Router là kiến trúc mới của Next.js 13+, hỗ trợ React Server Components mặc định, layouts lồng nhau, Server Actions, loading/error files.

### Supabase & Database

**Q: RLS là gì?**
A: Row Level Security là cơ chế phân quyền ở cấp độ dòng trong PostgreSQL. Đảm bảo user chỉ thấy/sửa được dữ liệu được phép. Ví dụ: users chỉ thấy emails của mình qua policy `auth.uid() = account.user_id`.

**Q: Các thành phần Supabase đã dùng?**
A: Authentication (đăng ký, đăng nhập), Database (PostgreSQL), Realtime (email notifications), Storage (file attachments - đã setup). Edge Functions và Vector chưa dùng.

**Q: Realtime hoạt động thế nào?**
A: Supabase Realtime dùng PostgreSQL LISTEN/NOTIFY và WebSocket. Khi có INSERT vào bảng emails, Supabase gửi event qua WebSocket đến subscribed clients. Client xử lý event để cập nhật UI.

### Docker & Deployment

**Q: Multi-stage build là gì?**
A: Build trong nhiều stage. Stage đầu (builder) chứa Node + dependencies để compile. Stage cuối (runner) chỉ chứa runtime (node:alpine) và copy artifact đã build. Kết quả: image nhỏ hơn, bảo mật hơn.

**Q: Tại sao dùng Cloudflare?**
A: Cloudflare cung cấp DNS management, free SSL/TLS (Universal Certificate), DDoS protection, CDN. Giúp đơn giản hóa deployment.

**Q: Luồng request production như thế nào?**
A: User → Cloudflare (SSL termination) → VPS IP → Nginx (reverse proxy, port 443→3000) → Next.js app (port 3000) → Supabase (database).

### Security

**Q: Làm sao bảo mật API?**
A: JWT token được verify ở mỗi request. RLS policies ở database đảm bảo user chỉ truy cập dữ liệu của mình. Service role key chỉ dùng ở server-side, không expose cho client.

**Q: Rate limiting hoạt động thế nào?**
A: Dùng express-rate-limit middleware. Giới hạn số request mỗi IP mỗi phút. Prevent brute force attacks và spam.

---

## Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Main App       │  │  OTP Page       │  │  Admin Panel    │  │
│  │  - Email List   │  │  - View emails  │  │  - Stats        │  │
│  │  - Email View   │  │  - Copy codes  │  │  - Manage users │  │
│  │  - Sidebar      │  │                 │  │  - Manage domains│  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           │                    │                    │             │
│           └────────────────────┼────────────────────┘             │
│                                │                                  │
└────────────────────────────────┼────────────────────────────────┘
                                 │ HTTPS
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                         CLOUDFLARE                               │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  - DNS Resolution                                          │ │
│  │  - SSL/TLS (Universal Certificate)                        │ │
│  │  - DDoS Protection                                         │ │
│  │  - CDN (Content Delivery Network)                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                           VPS                                     │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  NGINX (Reverse Proxy)                                     │ │
│  │  - Port 80 (HTTP → 301 redirect)                          │ │
│  │  - Port 443 (HTTPS → localhost:3000)                      │ │
│  │  - Rate limiting                                           │ │
│  │  - Gzip compression                                        │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                 │                                 │
│                                 ▼                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  DOCKER CONTAINER                                           │ │
│  │  ┌─────────────────────────────────────────────────────────┐│ │
│  │  │  NEXT.JS APP (Production Build)                         ││ │
│  │  │  - Port 3000                                           ││ │
│  │  │  - API Routes                                          ││ │
│  │  │  - Static pages                                        ││ │
│  │  └─────────────────────────────────────────────────────────┘│ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
                    ▼            ▼            ▼
┌─────────────────────────┐ ┌──────────┐ ┌─────────────────────────┐
│     SUPABASE CLOUD      │ │ CLOUDFLARE│ │   EXTERNAL SERVICES     │
│                         │ │  WORKER   │ │                         │
│ ┌─────────────────────┐│ └──────────┘ │ ┌─────────────────────┐ │
│ │ PostgreSQL Database  ││              │ │ Email Senders       │ │
│ │ - profiles           ││              │ │ - SMTP Servers      │ │
│ │ - accounts           ││              │ │ - Contact Forms     │ │
│ │ - emails             ││              │ └─────────────────────┘ │
│ │ - domains           ││              │                         │
│ │ - config            ││              │                         │
│ └─────────────────────┘│              │                         │
│ ┌─────────────────────┐│              │                         │
│ │ Authentication       ││              │                         │
│ │ - Email/Password     ││              │                         │
│ │ - Magic Link         ││              │                         │
│ └─────────────────────┘│              │                         │
│ ┌─────────────────────┐│              │                         │
│ │ Storage              ││              │                         │
│ │ - Email attachments  ││              │                         │
│ └─────────────────────┘│              │                         │
│ ┌─────────────────────┐│              │                         │
│ │ Realtime             ││              │                         │
│ │ - WebSocket channel  ││              │                         │
│ │ - Postgres changes    ││              │                         │
│ └─────────────────────┘│              │                         │
└─────────────────────────┘              └─────────────────────────┘
```

---

## Database Schema

```
┌─────────────────────────────────────────────────────────────────┐
│                        SUPABASE                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  auth.users ────────────────► public.profiles                  │
│       │ (FK)                         │                          │
│       │                              ├── username (unique)      │
│       │                              ├── email                   │
│       │                              ├── role (user|admin)      │
│       │                              ├── preferences (JSONB)     │
│       │                              └── email_count            │
│       │                                                           │
│  public.domains ◄───────────► public.accounts ◄── public.emails
│       │ (FK)                         │ (FK)          │
│       │                              │               │
│       └── domain (unique)            └── user_id     └── account_id
│                                        (FK)          (FK)
│       └── public.config                                           │
│       └── public.ip_blocklist                                    │
│       └── public.otp_keys                                        │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  RLS Policies:                                                   │
│  - profiles: SELECT (own or admin), UPDATE (own or admin)       │
│  - accounts: SELECT/INSERT/DELETE (own or admin)               │
│  - emails: SELECT/UPDATE/DELETE (via account ownership)        │
│  - domains: SELECT (active, public), ALL (admin only)          │
│  - config: SELECT/UPDATE (admin only)                          │
│  - ip_blocklist: ALL (admin only)                              │
│  - otp_keys: SELECT/UPDATE/DELETE (admin only)                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Lệnh đã chạy và kết quả

```bash
# 1. Lint
cd client && npm run lint
# Result: ✅ Exit code 0 (warnings only)

# 2. Build
cd client && npm run build
# Result: ✅ Exit code 0 (22 pages generated)

# 3. Docker build test
docker build -t tmailcc .
# Result: ✅ Image built successfully
```

---

## Liên hệ & Support

- **GitHub Repository**: https://github.com/yourusername/tmailCC
- **Production URL**: https://tmailcc.app
- **Email**: your-email@example.com

## Kết luận & Hạn chế

### Kết luận
Dự án tmailCC đã hoàn thành toàn bộ các yêu cầu bắt buộc và bổ sung của môn học. Hệ thống hoạt động ổn định trên môi trường production, đáp ứng đầy đủ các tiêu chuẩn kỹ thuật hiện đại của Next.js, Supabase và Docker. Việc ứng dụng các công cụ AI (Cursor, Claude) đã giúp tối ưu hóa hiệu suất phát triển và cấu trúc codebase một cách đáng kể.

### Hạn chế
1. Dung lượng file đính kèm: Chưa giới hạn dung lượng tải lên ở phía ứng dụng (chỉ giới hạn ở Supabase Storage).
2. Giao diện Admin: Mặc dù responsive tốt nhưng một số tính năng nâng cao của Admin Panel chưa được tối ưu hóa hoàn toàn cho màn hình di động siêu nhỏ.
3. Luồng email: Hiện tại hệ thống chỉ nhận inbound email mà chưa hỗ trợ gửi email ra ngoài.

### Hướng phát triển
1. Tích hợp dịch vụ gửi thư SMTP (như Resend hoặc Mailgun) để biến tmailCC thành dịch vụ email hai chiều.
2. Cải thiện bộ lọc thư rác (spam filter) tự động dựa trên nội dung thư bằng AI.
3. Hỗ trợ chia sẻ hộp thư (shared mailboxes) cho nhóm làm việc.

---

## Tài liệu tham khảo
1. Next.js App Router Documentation: https://nextjs.org/docs
2. Supabase Auth & Database Reference: https://supabase.com/docs
3. Tailwind CSS Documentation: https://tailwindcss.com/docs
4. Docker & Docker Compose Official Docs: https://docs.docker.com
5. Cloudflare Workers & Webhook Docs: https://developers.cloudflare.com
6. Git Conventional Commits standard: https://www.conventionalcommits.org

---

**Document Version**: 1.0.0
**Last Updated**: 2026-05-28
**Author**: tmailCC Team
