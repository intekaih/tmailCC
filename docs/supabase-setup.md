# tmailCC - Hướng Dẫn Cài Đặt Supabase

## Tổng Quan

Dự án tmailCC sử dụng **Supabase (PostgreSQL)** để lưu trữ dữ liệu. Supabase cung cấp:
- **PostgreSQL Database** - lưu trữ accounts, emails, users
- **Supabase Auth** - quản lý người dùng
- **Row Level Security (RLS)** - bảo mật dữ liệu
- **Real-time Subscriptions** - có thể dùng thay SSE

---

## Bước 1: Tạo Project Supabase

1. Truy cập [https://supabase.com](https://supabase.com)
2. Tạo project mới
3. Chọn region gần nhất (Singapore cho Việt Nam)
4. Đặt tên database password (lưu lại!)

---

## Bước 2: Lấy API Keys

1. Vào **Settings** > **API**
2. Copy các giá trị:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public**: `eyJhbGc...`
   - **service_role secret**: `eyJhbGc...` (CHỈ dùng phía server!)

---

## Bước 3: Chạy Database Schema

1. Vào **SQL Editor** trong Supabase Dashboard
2. Copy toàn bộ nội dung file `server/supabase/schema.sql`
3. Paste và run

Schema tạo:
- `profiles` - Thông tin người dùng (link với auth.users)
- `accounts` - Tài khoản email
- `emails` - Email messages
- `domains` - Domain quản lý
- `config` - Cấu hình hệ thống
- `ip_blocklist` - IP bị chặn
- `otp_keys` - OTP access keys
- **Triggers**: Tự động tạo profile khi user đăng ký
- **RLS Policies**: Bảo mật row-level

---

## Bước 4: Cấu Hình Environment Variables

```bash
cd server

# Copy và edit .env
cp .env.example .env
```

Edit `.env`:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-32-char-secret
```

**Tạo JWT Secret:**
```bash
# PowerShell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

---

## Bước 5: Tạo Admin User

Sau khi chạy schema:

1. Đăng ký user đầu tiên qua ứng dụng
2. Vào Supabase Dashboard > **Authentication** > **Users**
3. Hoặc chạy script seed:

```bash
cd server
node seed-admin.js
```

4. Hoặc chạy SQL để set admin:

```sql
-- Thay YOUR_USER_ID bằng UUID của user
UPDATE public.profiles
SET role = 'admin'
WHERE id = 'YOUR_USER_ID';
```

---

## Bước 6: Cấu Hình Domain

Thêm domain mặc định:

```sql
-- Thêm domain của bạn
INSERT INTO public.domains (domain, label, is_default, is_active)
VALUES ('yourdomain.com', 'Main Domain', true, true);
```

---

## Kiến Trúc Database

```
┌─────────────────────────────────────────────────────────────┐
│                        SUPABASE                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  auth.users ──────────────── public.profiles                │
│       │                            │                         │
│       │                            ├── username              │
│       │                            ├── role (user/admin)    │
│       │                            └── preferences           │
│       │                                                       │
│  public.domains ──────────── public.accounts               │
│       │                            │                         │
│       │                            └── public.emails         │
│       │                                  │                   │
│       └── public.config                  └── attachments     │
│                                                              │
│  public.ip_blocklist                                         │
│  public.otp_keys                                             │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  RLS Policies:                                              │
│  - Users chỉ thấy accounts/emails của mình                 │
│  - Admins thấy tất cả                                       │
│  - Public đọc domains active                                │
└─────────────────────────────────────────────────────────────┘
```

---

## RLS Policies Chi Tiết

### profiles
- **SELECT**: Tất cả authenticated users
- **UPDATE**: Chính mình hoặc admin

### accounts
- **SELECT**: Chủ sở hữu hoặc admin
- **INSERT**: Authenticated users
- **DELETE**: Chủ sở hữu hoặc admin

### emails
- **SELECT/UPDATE/DELETE**: Chủ sở hữu account

### domains
- **SELECT**: Tất cả (chỉ is_active=true)
- **INSERT/UPDATE/DELETE**: Chỉ admin

### config
- **SELECT**: Tất cả
- **UPDATE**: Chỉ admin

---

## Troubleshooting

### "Database not configured"
- Kiểm tra `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` trong .env
- Đảm bảo không có khoảng trắng thừa

### Auth không hoạt động
- Kiểm tra `SUPABASE_JWT_SECRET` có đủ 32 ký tự
- JWT secret phải giống nhau ở server và Supabase

### RLS Policy lỗi
- Kiểm tra user đã đăng nhập chưa
- Kiểm tra profile có tồn tại không

### Email không gửi được
- Kiểm tra `WEBHOOK_SECRET` khớp với Cloudflare Worker

---

## Các Lệnh SQL Hữu Ích

```sql
-- Xem tất cả users
SELECT p.*, au.email
FROM public.profiles p
JOIN auth.users au ON p.id = au.id;

-- Xem thống kê
SELECT 
  (SELECT COUNT(*) FROM public.profiles) as users,
  (SELECT COUNT(*) FROM public.accounts) as accounts,
  (SELECT COUNT(*) FROM public.emails) as emails;

-- Reset user password (admin)
UPDATE auth.users
SET encrypted_password = '--'
WHERE id = 'user-uuid';

-- Force email confirm
UPDATE auth.users
SET email_confirmed_at = now()
WHERE id = 'user-uuid';
```

---

## Deploy

### Server (Termux)
```bash
cd server
npm install
# Cấu hình .env
pm2 start index.js --name tmail
```

### Cloudflare Worker
```bash
# Cập nhật wrangler.toml với Supabase URL
wrangler secret put WEBHOOK_SECRET
wrangler deploy
```

---

## Next Steps

1. [x] Set up Supabase project
2. [x] Run schema.sql
3. [x] Configure .env
4. [x] Create admin user
5. [x] Test login/register
6. [x] Test email features
7. [x] Deploy to production
