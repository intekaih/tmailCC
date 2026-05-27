# Báo Cáo Chức Năng tmailCC

> **Cập nhật:** 23/05/2026  
> **Trạng thái:** Đang hoạt động tại https://tmailcc.kaih.co.uk/

---

## 1. Tổng Quan Dự Án

**tmailCC** là một hệ thống email tạm thời (temporary/disposable email) cho phép người dùng tạo địa chỉ email dùng một lần để nhận email, bảo vệ quyền riêng tư và tránh spam.

| Thuộc tính | Giá trị |
|---|---|
| Frontend | Next.js 14 (App Router) |
| Backend | Express.js |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | JWT + Supabase Auth |
| Realtime | Supabase Realtime |
| Email Parsing | mailparser |
| Styling | Tailwind CSS + CSS Variables |
| i18n | Tiếng Việt / Tiếng Anh |
| Deployment | Docker, Cloudflare, PM2 |

---

## 2. Cây Thư Mục

```
e:\tmailCC/
│
├── client/                           # Next.js 14 frontend (App Router)
│   ├── public/                       # Static assets
│   │   ├── favicon.ico
│   │   ├── og-image.png
│   │   └── sw.js                     # Service Worker
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout (fonts, metadata)
│   │   ├── page.tsx                  # Trang chính (giao diện email)
│   │   ├── page.module.css
│   │   ├── globals.css
│   │   ├── loading.tsx
│   │   ├── not-found.tsx
│   │   ├── error.tsx
│   │   └── otp/                      # OTP access page (xem email không cần đăng nhập)
│   │       └── page.tsx
│   ├── components/                   # React components
│   │   ├── layout/
│   │   │   └── AnimatedBackground.tsx
│   │   ├── ui/
│   │   │   ├── AnimatedButton.tsx
│   │   │   ├── AnimatedLoader.tsx
│   │   │   ├── AnimatedText.tsx
│   │   │   ├── AnimatedToast.tsx
│   │   │   └── SkeletonLoader.tsx
│   │   ├── email/
│   │   │   ├── EmailList.tsx         # Danh sách email với filter
│   │   │   ├── EmailView.tsx         # Xem nội dung email
│   │   │   └── EmailContent.tsx
│   │   ├── account/
│   │   │   ├── Sidebar.tsx           # Sidebar tài khoản
│   │   │   └── QRModal.tsx           # Modal QR code
│   │   ├── auth/
│   │   │   └── AuthModal.tsx         # Modal đăng nhập/đăng ký
│   │   ├── admin/
│   │   │   └── AdminPanel.tsx        # Bảng điều khiển admin
│   │   ├── NotificationSound.tsx     # Âm thanh thông báo
│   │   ├── ChangePasswordModal.tsx   # Đổi mật khẩu
│   │   ├── Modal.tsx                 # Component modal
│   │   └── useFocusTrap.ts           # Hook accessibility
│   ├── app/                         # API routes (Next.js API handler)
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts
│   │   │   │   ├── register/route.ts
│   │   │   │   ├── me/route.ts
│   │   │   │   └── change-password/route.ts
│   │   │   ├── accounts/
│   │   │   │   ├── route.ts          # GET (list), POST (create)
│   │   │   │   ├── domains/route.ts
│   │   │   │   └── otp-key/route.ts
│   │   │   ├── emails/
│   │   │   │   ├── route.ts          # GET (list), DELETE (clear all)
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts     # GET, DELETE single
│   │   │   │       ├── read/route.ts # PATCH mark as read
│   │   │   │       └── star/route.ts # PATCH toggle star
│   │   │   ├── admin/
│   │   │   │   ├── route.ts
│   │   │   │   ├── users/route.ts
│   │   │   │   ├── domains/route.ts
│   │   │   │   ├── config/route.ts
│   │   │   │   ├── blocklist/route.ts
│   │   │   │   ├── otp-keys/route.ts
│   │   │   │   └── stats/route.ts
│   │   │   ├── otp/
│   │   │   │   └── verify/route.ts
│   │   │   └── health/
│   │   │       └── route.ts
│   │   └── providers.tsx
│   ├── lib/                          # Frontend utilities
│   │   ├── api.ts                    # API client (tất cả endpoint)
│   │   ├── auth.ts                   # Auth helpers
│   │   ├── i18n.ts                   # i18n translations
│   │   ├── mailParser.ts             # Email HTML/text parser
│   │   ├── notification.ts           # Browser notification API
│   │   ├── qrService.ts              # QR code generation
│   │   ├── realtime.ts               # Supabase Realtime subs
│   │   ├── rateStore.ts              # Client-side rate limiting
│   │   ├── utils.ts                  # Utility functions
│   │   ├── AppContext.tsx            # Global state context
│   │   ├── I18nContext.tsx           # i18n context provider
│   │   └── RealtimeContext.tsx       # Realtime context provider
│   ├── .env.local                    # Client environment vars
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── next.config.js
│   └── next-env.d.ts
│
├── server/                           # Express.js backend API
│   ├── index.js                      # Entry point (Express server)
│   ├── package.json
│   ├── routes/                       # API routes
│   │   ├── auth.js                   # /auth/login, /auth/me, /auth/change-password
│   │   ├── accounts.js              # /accounts CRUD, /domains, /otp-key
│   │   ├── emails.js                # /emails CRUD, read, star
│   │   ├── webhook.js               # Inbound email webhook
│   │   ├── admin.js                 # Admin endpoints
│   │   └── otp.js                   # OTP verification
│   ├── services/                     # Business logic
│   │   ├── sseEmitter.js            # Server-Sent Events emitter
│   │   ├── rateStore.js             # In-memory rate limiting (NodeCache)
│   │   ├── qrService.js             # QR code generation
│   │   └── mailParser.js            # Email parsing (mailparser)
│   ├── middleware/                   # Express middleware
│   │   ├── auth.js                  # JWT authentication
│   │   └── supabase-auth.js         # Supabase session validation
│   ├── .env                          # Server environment vars
│   └── ecosystem.config.js           # PM2 process manager config
│
├── worker/                           # Cloudflare Worker (email inbound)
│   ├── index.ts
│   ├── tsconfig.json
│   └── package.json
│
├── docs/                             # Documentation
│   ├── supabase-setup.md            # Database setup guide
│   ├── docker-guide.md              # Docker deployment
│   ├── deploy-vps.md                # VPS + Nginx + SSL guide
│   ├── technical-report.md          # Full technical report
│   ├── ai-prompts-appendix.md       # AI prompt reference
│   ├── bocauhoi.md                  # FAQ (Vietnamese, ~449 lines)
│   └── quychethi.md                 # Quiz questions (Vietnamese, ~270 lines)
│
├── scripts/                          # Shell scripts
│   ├── backup.sh                    # Database backup
│   └── status.sh                    # Service status check
│
├── Lab/                              # Lab exercises
│
├── .agents/                          # Cursor AI skills
│   └── skills/
│       └── hallmark/
│           └── SKILL.md             # Hallmark design skill
│
├── docker-compose.yml               # Docker compose (client + server)
├── Dockerfile                       # Docker image build
├── package.json                     # Root package (npm-run-all)
├── README.md                        # Project README
├── .env.example                     # Environment template
├── .gitignore
├── .prettierrc
├── tsconfig.json                    # Base TS config
├── tailwind.config.ts               # Base Tailwind config
└── SPEC.md                          # Project specification
```

---

## 3. Danh Sách Chức Năng Chi Tiết

### 3.1. Chức Năng Người Dùng

#### 3.1.1. Quản Lý Tài Khoản Email

| # | Chức năng | Mô tả | Trạng thái |
|---|---|---|---|
| 1 | Tạo tài khoản email ngẫu nhiên | Hệ thống tự tạo địa chỉ email ngẫu nhiên với domain ngẫu nhiên | ✅ Hoàn thành |
| 2 | Tạo tài khoản email tùy chỉnh | Người dùng nhập tên địa chỉ tùy ý | ✅ Hoàn thành |
| 3 | Chọn domain | Chọn domain cụ thể từ danh sách có sẵn | ✅ Hoàn thành |
| 4 | Xóa tài khoản email | Xóa địa chỉ email tạm thời | ✅ Hoàn thành |
| 5 | Sao chép địa chỉ | Copy email address vào clipboard | ✅ Hoàn thành |
| 6 | Hiển thị QR code | Tạo và hiển thị QR code chứa địa chỉ email | ✅ Hoàn thành |
| 7 | Tạo OTP key | Tạo key truy cập OTP để xem email không cần đăng nhập | ✅ Hoàn thành |
| 8 | Nhiều tài khoản cùng lúc | Quản lý nhiều địa chỉ email trong sidebar | ✅ Hoàn thành |
| 9 | Danh sách domain | Xem tất cả domain khả dụng với nhãn | ✅ Hoàn thành |

#### 3.1.2. Quản Lý Email

| # | Chức năng | Mô tả | Trạng thái |
|---|---|---|---|
| 1 | Xem danh sách hộp thư | Hiển thị emails theo thứ tự mới nhất | ✅ Hoàn thành |
| 2 | Xem nội dung email | Đọc nội dung HTML/text, attachments | ✅ Hoàn thành |
| 3 | Đánh dấu đã đọc/chưa đọc | Toggle trạng thái đọc của email | ✅ Hoàn thành |
| 4 | Đánh dấu sao (star) | Star/unstar emails để bookmark | ✅ Hoàn thành |
| 5 | Xóa email | Xóa email riêng lẻ | ✅ Hoàn thành |
| 6 | Xóa tất cả email | Bulk delete tất cả emails trong hộp thư | ✅ Hoàn thành |
| 7 | Lọc email | Filter: All / Unread / Starred | ✅ Hoàn thành |
| 8 | Tải attachment | Tải file đính kèm từ email | ✅ Hoàn thành |
| 9 | Inline image display | Hiển thị hình ảnh inline trong email | ✅ Hoàn thành |

#### 3.1.3. Thông Báo Thời Gian Thực

| # | Chức năng | Mô tả | Trạng thái |
|---|---|---|---|
| 1 | Supabase Realtime | Nhận email mới ngay lập tức qua websocket | ✅ Hoàn thành |
| 2 | Browser Notifications | Thông báo hệ thống khi tab ẩn | ✅ Hoàn thành |
| 3 | Âm thanh thông báo | Phát âm thanh khi có email mới | ✅ Hoàn thành |
| 4 | Đồng bộ đa tab | Đồng bộ trạng thái giữa nhiều tabs qua BroadcastChannel | ✅ Hoàn thành |
| 5 | SSE fallback | Server-Sent Events cho real-time updates | ✅ Hoàn thành |

#### 3.1.4. Xác Thực Người Dùng

| # | Chức năng | Mô tả | Trạng thái |
|---|---|---|---|
| 1 | Đăng ký tài khoản | Tạo tài khoản mới với username/password | ✅ Hoàn thành |
| 2 | Đăng nhập | Đăng nhập với credentials | ✅ Hoàn thành |
| 3 | Đăng xuất | Logout và clear session | ✅ Hoàn thành |
| 4 | Đổi mật khẩu | Change password từ profile | ✅ Hoàn thành |
| 5 | Chế độ khách | Sử dụng không cần đăng nhập (guest mode) | ✅ Hoàn thành |
| 6 | JWT Authentication | Token-based auth cho API | ✅ Hoàn thành |
| 7 | OTP Access | Truy cập email bằng OTP key (không cần password) | ✅ Hoàn thành |

#### 3.1.5. Cài Đặt Người Dùng

| # | Chức năng | Mô tả | Trạng thái |
|---|---|---|---|
| 1 | Dark/Light mode | Chuyển đổi giao diện tối/sáng | ✅ Hoàn thành |
| 2 | Bật/tắt âm thanh | Toggle âm thanh thông báo | ✅ Hoàn thành |
| 3 | Bật/tắt notifications | Toggle browser notifications | ✅ Hoàn thành |
| 4 | Đổi ngôn ngữ | Tiếng Việt / Tiếng Anh | ✅ Hoàn thành |
| 5 | Lưu preferences | Preferences được lưu trong localStorage | ✅ Hoàn thành |

#### 3.1.6. Trang OTP (Xem Email Không Cần Đăng Nhập)

| # | Chức năng | Mô tả | Trạng thái |
|---|---|---|---|
| 1 | Xem email bằng OTP key | Truy cập email qua `/otp/[accessKey]` | ✅ Hoàn thành |
| 2 | Auto-detect OTP code | Tự động nhận diện mã xác thực trong email | ✅ Hoàn thành |
| 3 | One-click copy code | Copy OTP code chỉ bằng 1 click | ✅ Hoàn thành |
| 4 | Auto-refresh | Tự động refresh mỗi 15 giây | ✅ Hoàn thành |
| 5 | Real-time status | Trạng thái kết nối realtime indicator | ✅ Hoàn thành |

### 3.2. Chức Năng Admin

#### 3.2.1. Dashboard

| # | Chức năng | Mô tả | Trạng thái |
|---|---|---|---|
| 1 | Thống kê tổng quan | Users, accounts, emails, domains count | ✅ Hoàn thành |
| 2 | System uptime | Thời gian hoạt động của server | ✅ Hoàn thành |
| 3 | Uptime chart | Biểu đồ uptime (6 tabs: stats/users/domains/config/blocklist/otpkeys) | ✅ Hoàn thành |

#### 3.2.2. Quản Lý Người Dùng

| # | Chức năng | Mô tả | Trạng thái |
|---|---|---|---|
| 1 | Danh sách người dùng | Xem tất cả users với thông tin chi tiết | ✅ Hoàn thành |
| 2 | Tạo user mới | Admin tạo user thủ công | ✅ Hoàn thành |
| 3 | Xóa user | Xóa tài khoản người dùng | ✅ Hoàn thành |
| 4 | Promote/revoke admin | Nâng cấp/hạ cấp quyền admin | ✅ Hoàn thành |
| 5 | Xem chi tiết user | Profile, preferences, accounts count | ✅ Hoàn thành |

#### 3.2.3. Quản Lý Domain

| # | Chức năng | Mô tả | Trạng thái |
|---|---|---|---|
| 1 | Danh sách domains | Xem tất cả domains có sẵn | ✅ Hoàn thành |
| 2 | Thêm domain mới | Thêm domain mới vào hệ thống | ✅ Hoàn thành |
| 3 | Xóa domain | Loại bỏ domain khỏi hệ thống | ✅ Hoàn thành |
| 4 | Đặt domain mặc định | Set default domain cho tạo account nhanh | ✅ Hoàn thành |
| 5 | Bật/tắt domain | Enable/disable domain không xóa | ✅ Hoàn thành |
| 6 | Gán nhãn domain | Thêm label cho domain (VD: "Business", "Temp") | ✅ Hoàn thành |

#### 3.2.4. Cấu Hình Hệ Thống

| # | Chức năng | Mô tả | Trạng thái |
|---|---|---|---|
| 1 | Rate limits | Cấu hình giới hạn requests per minute/day | ✅ Hoàn thành |
| 2 | Storage limits | Giới hạn số accounts/emails per user | ✅ Hoàn thành |
| 3 | CAPTCHA settings | Bật/tắt CAPTCHA | ✅ Hoàn thành |
| 4 | OTP key permissions | Cấu hình quyền OTP key | ✅ Hoàn thành |
| 5 | CORS origins | Cấu hình allowed origins | ✅ Hoàn thành |

#### 3.2.5. IP Blocklist

| # | Chức năng | Mô tả | Trạng thái |
|---|---|---|---|
| 1 | Block IP tạm thời | Block IP với thời hạn | ✅ Hoàn thành |
| 2 | Block IP vĩnh viễn | Permanent ban | ✅ Hoàn thành |
| 3 | Unblock IP | Gỡ block IP | ✅ Hoàn thành |
| 4 | Xem danh sách block | Danh sách IPs đang bị block | ✅ Hoàn thành |
| 5 | Lý do block | Ghi chú lý do block | ✅ Hoàn thành |

#### 3.2.6. Quản Lý OTP Keys

| # | Chức năng | Mô tả | Trạng thái |
|---|---|---|---|
| 1 | Danh sách OTP keys | Xem tất cả OTP keys | ✅ Hoàn thành |
| 2 | Xóa OTP key | Revoke OTP key | ✅ Hoàn thành |
| 3 | Ghi chú OTP key | Thêm note cho OTP key | ✅ Hoàn thành |

### 3.3. Chức Năng Bảo Mật

| # | Chức năng | Mô tả | Trạng thái |
|---|---|---|---|
| 1 | Row Level Security (RLS) | Database-level access control | ✅ Hoàn thành |
| 2 | JWT Authentication | Token-based API security | ✅ Hoàn thành |
| 3 | Rate Limiting | Per-user, per-IP rate limits | ✅ Hoàn thành |
| 4 | IP Blocking | Temporary/permanent IP bans | ✅ Hoàn thành |
| 5 | CORS Configuration | Configurable allowed origins | ✅ Hoàn thành |
| 6 | Supabase Auth | Built-in auth với session management | ✅ Hoàn thành |
| 7 | Password hashing | Secure password storage | ✅ Hoàn thành |
| 8 | OTP key hashing | Access keys stored as hashes | ✅ Hoàn thành |

### 3.4. Chức Năng Email Infrastructure

| # | Chức năng | Mô tả | Trạng thái |
|---|---|---|---|
| 1 | Inbound email webhook | Nhận email từ MX server qua webhook | ✅ Hoàn thành |
| 2 | Email parsing | Parse email content (HTML, text, attachments) | ✅ Hoàn thành |
| 3 | Attachment handling | Store và serve attachments | ✅ Hoàn thành |
| 4 | Cloudflare Worker | Email inbound handler trên edge | ✅ Hoàn thành |

---

## 4. Database Schema

```
┌─────────────────────────────────────────────────────────────┐
│                      SUPABASE DATABASE                       │
├─────────────────────────────────────────────────────────────┤
│  profiles         │ User profiles (username, role, prefs)   │
│  accounts         │ Email accounts (address, domain, user)  │
│  emails            │ Email messages (account_id, content)   │
│  domains           │ Available domains (domain, label)       │
│  otp_keys          │ OTP access keys (address, key_hash)     │
│  ip_blocklist      │ Blocked IPs (ip, reason, expires)     │
│  config            │ System config (key, value)             │
└─────────────────────────────────────────────────────────────┘
```

### RLS Policies
- Users chỉ đọc/ghi accounts và emails của chính mình
- Admin có full access đến tất cả data
- OTP keys cho phép đọc emails không cần auth

---

## 5. API Endpoints

### Authentication
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/auth/login` | Đăng nhập |
| POST | `/api/auth/register` | Đăng ký |
| GET | `/api/auth/me` | Lấy thông tin user hiện tại |
| POST | `/api/auth/change-password` | Đổi mật khẩu |

### Accounts
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/accounts` | Danh sách accounts |
| POST | `/api/accounts` | Tạo account mới |
| GET | `/api/accounts/:address` | Lấy thông tin account |
| DELETE | `/api/accounts/:address` | Xóa account |
| GET | `/api/accounts/domains` | Danh sách domains |
| POST | `/api/accounts/otp-key` | Tạo OTP key |

### Emails
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/emails` | Danh sách emails |
| DELETE | `/api/emails` | Xóa tất cả emails |
| GET | `/api/emails/:id` | Lấy email chi tiết |
| DELETE | `/api/emails/:id` | Xóa email |
| PATCH | `/api/emails/:id/read` | Đánh dấu đã đọc |
| PATCH | `/api/emails/:id/star` | Toggle star |

### OTP
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/otp/verify` | Xác thực OTP key |

### Admin
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/admin` | Dashboard overview |
| GET | `/api/admin/stats` | Statistics |
| GET | `/api/admin/users` | User management |
| POST | `/api/admin/users` | Create user |
| DELETE | `/api/admin/users/:id` | Delete user |
| GET | `/api/admin/domains` | Domain management |
| POST | `/api/admin/domains` | Add domain |
| DELETE | `/api/admin/domains/:id` | Delete domain |
| GET | `/api/admin/config` | Get config |
| PUT | `/api/admin/config` | Update config |
| GET | `/api/admin/blocklist` | IP blocklist |
| POST | `/api/admin/blocklist` | Block IP |
| DELETE | `/api/admin/blocklist/:id` | Unblock IP |
| GET | `/api/admin/otp-keys` | OTP keys list |
| DELETE | `/api/admin/otp-keys/:id` | Delete OTP key |

---

## 6. Phương Thức Triển Khai

| Phương thức | Mô tả | Tài liệu |
|-------------|-------|---------|
| Docker | `docker-compose up -d` | `docs/docker-guide.md` |
| Termux | Mobile/server environment | `docs/deploy-vps.md` |
| Cloudflare Tunnel | Remote access | `docs/deploy-vps.md` |
| VPS + Nginx + SSL | Self-hosted production | `docs/deploy-vps.md` |

---

## 7. Tóm Tắt

| Thể loại | Số lượng |
|----------|----------|
| Component files | ~25 |
| API routes | ~25 |
| Server routes | ~6 |
| Database tables | ~7 |
| Admin features | ~20 |
| User features | ~35 |
| Security features | ~8 |
| Deployment methods | 4 |

**Tổng cộng: ~100+ chức năng** được triển khai đầy đủ trong hệ thống tmailCC.
