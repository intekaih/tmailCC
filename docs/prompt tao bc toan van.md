
Bạn là một sinh viên công nghệ thông tin viết báo cáo đồ án cuối kỳ. Hãy tạo file `docs/BAO-CAO-TOAN-VAN.md` — báo cáo toàn văn cho dự án **tmailCC** theo đúng cấu trúc quy chế thi bên dưới.

## THÔNG TIN SINH VIÊN (ĐIỀN VÀO)
- Họ và tên: Nguyễn Huỳnh Tiến Khải
- Mã sinh viên: 2212385
- Lớp: CTK46-PM
- Môn học: Các công nghệ mới trong phát triển phần mềm
- Giảng viên: Nguyễn Trọng Hiếu
- Ngày nộp: 29/05/2026
- Đề tài: tmailCC — Hệ thống Webmail tạm thời (Temporary Email Service)
- URL Production: https://tmailcc.app
- GitHub: https://github.com/intekaih/tmailCC.git 

## YÊU CẦU FORMAT
- File đầu ra: Markdown (.md) — sẽ chuyển sang PDF thủ công sau
- Font: Times New Roman 13 (ghi chú trong markdown để khi convert)
- Line spacing: 1.5
- Độ dài tối thiểu: 20 trang (không tính screenshot lớn)
- Ngôn ngữ: Tiếng Việt CÓ DẤU (tuyệt đối không viết tiếng Việt không dấu)
- Không dùng icon màu (emoji), nếu cần biểu tượng thì dùng mô tả text hoặc SVG
- Mỗi vị trí cần chèn hình ảnh, ghi placeholder: `<!-- SCREENSHOT: [mô tả nội dung screenshot cần chụp] -->`

## CẤU TRÚC BÁO CÁO (10 PHẦN — theo mục 3.3 quy chế thi)

### PHẦN 1: TRANG BÌA
Tạo trang bìa bao gồm:
- Logo/tên trường (placeholder)
- Tên môn học: "Các công nghệ mới trong phát triển phần mềm"
- Lớp: CTK46-PM — Công nghệ thông tin, Khoá 46, Chuyên ngành Kỹ thuật phần mềm
- Tiêu đề: BÁO CÁO ĐỒ ÁN CUỐI KỲ
- Tên đề tài: tmailCC — Hệ thống Webmail tạm thời
- Thông tin sinh viên (họ tên, MSV)
- Giảng viên hướng dẫn
- Ngày nộp

### PHẦN 2: MỤC LỤC
Danh sách tất cả các phần, mục con, có số trang tương đối.

### PHẦN 3: GIỚI THIỆU (2-3 trang)
Viết chi tiết bao gồm:

**3.1. Bối cảnh và vấn đề:**
- Thực trạng spam email khi đăng ký dịch vụ trực tuyến
- Nhu cầu bảo vệ quyền riêng tư khi phải cung cấp email cho các trang web
- Các giải pháp email tạm thời hiện có (Guerrilla Mail, TempMail, 10MinuteMail) và hạn chế

**3.2. Mục tiêu đề tài:**
- Xây dựng hệ thống email tạm thời full-stack hiện đại
- Áp dụng các công nghệ mới: Next.js 14 App Router, Supabase, Docker
- Triển khai thực tế lên VPS với domain và SSL
- Tích hợp AI tools trong quá trình phát triển

**3.3. Phạm vi đề tài:**
- Các tính năng chính: quản lý tài khoản email, nhận email real-time, admin panel, OTP access, Developer API
- Không bao gồm: gửi email ra ngoài, spam filter AI

**3.4. Đối tượng sử dụng:**
- Người dùng cuối (cần email tạm)
- Quản trị viên hệ thống
- Nhà phát triển bên thứ ba (Developer API)

<!-- SCREENSHOT: Giao diện trang chủ tmailCC trên desktop, hiển thị sidebar + danh sách email + nội dung email -->
<!-- SCREENSHOT: Giao diện tmailCC trên mobile (responsive view) -->

### PHẦN 4: CÔNG NGHỆ SỬ DỤNG (3-4 trang)
Trình bày từng công nghệ kèm vai trò cụ thể trong dự án:

**4.1. Next.js 14 (App Router)**
- Giới thiệu Next.js và App Router
- So sánh App Router vs Pages Router
- Cách sử dụng trong dự án: Server Components, Client Components, API Routes, Data Fetching
- Ví dụ cụ thể từ code (layout.tsx, page.tsx, API routes)

**4.2. TypeScript**
- Vai trò type safety
- Ví dụ type annotations trong dự án (interfaces cho Email, Account, User)
- Tham chiếu file: `client/lib/api.ts`

**4.3. Supabase**
- Giới thiệu Supabase và các thành phần đã dùng:
  - Authentication: đăng ký/đăng nhập với email+password
  - Database: PostgreSQL với 7+ bảng
  - Realtime: WebSocket subscriptions cho email notifications
  - Storage: lưu trữ file đính kèm (đã setup)
- So sánh ưu điểm với Firebase

**4.4. Tailwind CSS**
- Utility-first CSS framework
- CSS Variables cho dark/light mode
- Responsive design approach

**4.5. Docker**
- Dockerfile multi-stage build (3 stages: deps → builder → runner)
- Docker Compose configuration
- Tham chiếu file: `Dockerfile`, `docker-compose.yml`

**4.6. Cloudflare**
- DNS management
- SSL/TLS (Universal Certificate)
- Cloudflare Tunnel cho kết nối VPS
- DDoS Protection

**4.7. Các thư viện bổ sung**
- Bảng tổng hợp các dependencies chính từ package.json

<!-- SCREENSHOT: Bảng so sánh công nghệ (có thể tạo bảng trong MD) -->

### PHẦN 5: KIẾN TRÚC HỆ THỐNG (3-4 trang)

**5.1. Kiến trúc tổng quan:**
Vẽ sơ đồ kiến trúc dạng text/ASCII art hoặc mô tả rõ luồng:
```
User Browser → Cloudflare (DNS/SSL/CDN) → VPS (Nginx reverse proxy) → Docker (Next.js app port 3000) → Supabase Cloud (PostgreSQL + Auth + Realtime + Storage)
```
Giải thích chi tiết từng tầng.

**5.2. Cấu trúc thư mục dự án:**
Trình bày cây thư mục (lấy từ file `docs/chucnang-tmailCC.md` phần 2), giải thích vai trò từng thư mục chính:
- `client/` — Next.js frontend
- `client/app/api/` — API Routes (thay thế Express backend)
- `client/components/` — React components
- `client/lib/` — Utilities và services
- `worker/` — Cloudflare Worker xử lý email inbound
- `supabase/` — Database schema và migrations
- `docs/` — Tài liệu

**5.3. Thiết kế Database (ERD/Schema):**
Trình bày schema gồm các bảng:
- `profiles` — extends auth.users (username, role, preferences, email_count)
- `accounts` — email accounts (address, local_part, domain, user_id)
- `emails` — email messages (account_id, from_address, subject, html_content, attachments, is_read, is_starred)
- `domains` — available email domains (domain, label, is_active, is_default)
- `config` — system configuration key-value store
- `ip_blocklist` — blocked IPs (ip, reason, expires_at)
- `otp_keys` — OTP access keys (address, access_key_hash)
- `api_keys` — Developer API keys (user_id, key_hash, scopes)
- `webhooks` — Webhook configurations
- `webhook_deliveries` — Webhook delivery logs

Vẽ sơ đồ quan hệ (ERD) dạng text, chỉ rõ:
- auth.users (1) → profiles (1)
- auth.users (1) → accounts (N)
- accounts (1) → emails (N)
- domains ← accounts (FK qua trường domain)

**5.4. Row Level Security (RLS):**
Giải thích cơ chế RLS và liệt kê các policies chính:
- profiles: users xem/sửa profile của mình, admin xem tất cả
- accounts: users chỉ CRUD accounts của mình, admin CRUD tất cả
- emails: users chỉ truy cập emails qua subquery account ownership
- domains: anyone xem active domains, admin quản lý
- config, ip_blocklist, otp_keys: chỉ admin
- Anon policies cho Realtime subscriptions

**5.5. Luồng xử lý email inbound:**
```
Email gửi đến @tmailcc.app → MX Record → Cloudflare Worker → Parse email → Webhook POST → Next.js API → Insert vào Supabase → Realtime notify → Client cập nhật UI
```

<!-- SCREENSHOT: Sơ đồ kiến trúc hệ thống (vẽ bằng draw.io hoặc tương tự) -->
<!-- SCREENSHOT: Sơ đồ ERD database (vẽ bằng dbdiagram.io hoặc tương tự) -->
<!-- SCREENSHOT: Supabase Dashboard hiển thị các bảng đã tạo -->

### PHẦN 6: PHÂN TÍCH CHỨC NĂNG (5-6 trang)
Mô tả chi tiết TỪNG nhóm tính năng (lấy data từ `docs/chucnang-tmailCC.md`):

**6.1. Quản lý tài khoản email (9 chức năng):**
- Tạo email ngẫu nhiên / tùy chỉnh
- Chọn domain từ danh sách
- Xóa tài khoản, sao chép địa chỉ
- QR code, OTP key
- Quản lý nhiều tài khoản cùng lúc

**6.2. Quản lý email (9 chức năng):**
- Xem danh sách, xem nội dung (HTML/text)
- Đánh dấu đọc/chưa đọc, star/unstar
- Xóa email đơn lẻ / xóa tất cả
- Lọc (All/Unread/Starred)
- Tải attachment, inline images

**6.3. Thông báo thời gian thực (5 chức năng):**
- Supabase Realtime (WebSocket)
- Browser Notifications
- Âm thanh thông báo
- Đồng bộ đa tab (BroadcastChannel)
- SSE fallback

**6.4. Xác thực người dùng (7 chức năng):**
- Đăng ký, đăng nhập, đăng xuất
- Đổi mật khẩu, chế độ khách (guest mode)
- JWT Authentication
- OTP Access (xem email không cần đăng nhập)

**6.5. Cài đặt người dùng (5 chức năng):**
- Dark/Light mode
- Bật/tắt âm thanh, notifications
- Đổi ngôn ngữ (VI/EN — i18n)
- Lưu preferences vào localStorage

**6.6. Trang OTP (5 chức năng):**
- Xem email bằng OTP key
- Auto-detect OTP code
- One-click copy code
- Auto-refresh 15s
- Realtime status indicator

**6.7. Chức năng Admin (20+ chức năng):**
- Dashboard thống kê (users, accounts, emails, domains, DB size, uptime)
- Quản lý người dùng (CRUD, promote/revoke admin)
- Quản lý domain (thêm/xóa/enable/disable/label/default)
- Cấu hình hệ thống (rate limits, storage limits, CAPTCHA, CORS)
- IP Blocklist (block tạm/vĩnh viễn, unblock)
- Quản lý OTP Keys

**6.8. Bảo mật (8 chức năng):**
- RLS, JWT Auth, Rate Limiting, IP Blocking
- CORS, Supabase Auth, Password hashing, OTP key hashing

**6.9. Developer API:**
- Hệ thống API Keys (scopes, hashing)
- API v1 endpoints (domains, accounts, emails, wait-otp)
- Webhook system (HMAC signing)
- Trang Developer Settings

**6.10. Email Infrastructure:**
- Inbound email webhook
- Email parsing (mailparser)
- Attachment handling
- Cloudflare Worker

Mỗi nhóm chức năng kèm:
- Bảng liệt kê (STT, tên chức năng, mô tả)
- Giải thích kỹ thuật ngắn gọn

<!-- SCREENSHOT: Giao diện tạo email tạm thời mới (có dropdown chọn domain) -->
<!-- SCREENSHOT: Giao diện xem nội dung email (EmailView) -->
<!-- SCREENSHOT: Browser notification khi có email mới -->
<!-- SCREENSHOT: Giao diện trang OTP (/otp) -->
<!-- SCREENSHOT: Admin Panel — tab Stats (thống kê tổng quan) -->
<!-- SCREENSHOT: Admin Panel — tab Users (quản lý người dùng) -->
<!-- SCREENSHOT: Admin Panel — tab Domains (quản lý domain) -->
<!-- SCREENSHOT: Admin Panel — tab Config (cấu hình hệ thống) -->
<!-- SCREENSHOT: Admin Panel — tab Blocklist (IP blocklist) -->
<!-- SCREENSHOT: Dark mode vs Light mode so sánh -->
<!-- SCREENSHOT: Giao diện đổi ngôn ngữ (EN/VI) -->
<!-- SCREENSHOT: QR Code modal -->
<!-- SCREENSHOT: Developer Settings / API Keys page -->

### PHẦN 7: AI TRONG PHÁT TRIỂN (2-3 trang)
Lấy dữ liệu từ 2 file:
- `docs/ai-prompts-appendix.md` (7 prompts)
- `docs/prompts_tam_dac.md` (9 prompts tâm đắc)

**7.1. Công cụ AI đã sử dụng:**
- Cursor AI (GitHub Copilot powered) — code completion, refactoring, inline editing
- Claude (Anthropic) — architecture design, documentation, complex logic
- Gemini CLI — hỗ trợ viết tài liệu và troubleshooting

**7.2. Bảng tổng hợp Prompts chính (tối thiểu 10 prompts):**
Tạo bảng Markdown với các cột:
| STT | Prompt (tóm tắt) | Mục đích | Kết quả | File tham chiếu |

Trích từ 2 file trên, chọn 10-12 prompts tiêu biểu nhất bao gồm:
1. Thiết kế Database Schema → schema.sql
2. Realtime Subscription → realtime.ts
3. Docker Multi-stage Build → Dockerfile
4. RLS Policies → schema.sql
5. JWT Auth Middleware → auth middleware
6. Responsive CSS Layout → globals.css
7. TypeScript Types cho API → api.ts
8. Design System Minimalist Monochrome → toàn bộ UI
9. Realtime RLS fix (silent drop) → RLS policies
10. Developer API system → api keys, webhooks
11. Nginx + SSL + Cloudflare Tunnel → deployment
12. Full audit 18 tiêu chí → cải tiến codebase

**7.3. Phân tích hiệu quả sử dụng AI:**
- Ưu điểm: tăng tốc phát triển, code quality, documentation
- Hạn chế: cần review output, không thay thế kiến thức nền tảng
- Bài học: iterative prompts, security review, clear documentation

**7.4. Bài học rút ra:**
- AI không thay thế hiểu biết — cần hiểu RLS, Supabase, Docker để review AI output
- Iterative prompts — bắt đầu tổng quát, refine chi tiết
- Security — luôn verify AI-generated SQL/code
- Documentation — yêu cầu AI viết comments rõ ràng

<!-- SCREENSHOT: Cursor AI đang code completion trong IDE -->
<!-- SCREENSHOT: Một ví dụ prompt và kết quả trong Cursor -->

### PHẦN 8: DOCKER & DEPLOYMENT (2-3 trang)

**8.1. Dockerfile:**
- Giải thích multi-stage build 3 giai đoạn:
  - Stage 1 (deps): `node:20-alpine`, cài dependencies
  - Stage 2 (builder): copy node_modules, build Next.js production
  - Stage 3 (runner): `node:20-alpine`, chỉ copy standalone output, non-root user, health check
- Trích dẫn Dockerfile thực tế

**8.2. Docker Compose:**
- Service `tmail`: build context, container name, ports, environment variables, health check, network
- Trích dẫn docker-compose.yml thực tế

**8.3. Quy trình triển khai VPS:**
```
1. Chuẩn bị VPS (SSH, update, cài Docker)
2. Clone repository + cấu hình .env
3. Cấu hình DNS trên Cloudflare (A record → VPS IP)
4. Build và chạy Docker container
5. Cấu hình Nginx reverse proxy (port 80/443 → localhost:3000)
6. SSL qua Cloudflare (mode Full)
7. Hoặc: Cloudflare Tunnel (không cần mở port)
```

**8.4. Kiến trúc deployment production:**
```
User → Cloudflare (DNS + SSL + CDN + DDoS) → Cloudflare Tunnel → VPS (Nginx → Docker Container → Next.js :3000) → Supabase Cloud
```

**8.5. Các biến môi trường:**
Bảng liệt kê tất cả biến môi trường cần cấu hình (bắt buộc + tùy chọn)

**8.6. Kiểm tra hoạt động:**
- Health check endpoint: `/api/health`
- Docker commands: `docker-compose up -d`, `docker-compose logs -f`, `docker-compose ps`

<!-- SCREENSHOT: Terminal chạy docker-compose up -d thành công -->
<!-- SCREENSHOT: Kết quả curl health check API -->
<!-- SCREENSHOT: Cloudflare Dashboard - DNS settings cho tmailcc.app -->
<!-- SCREENSHOT: Trình duyệt mở https://tmailcc.app với SSL certificate -->

### PHẦN 9: KẾT LUẬN & HẠN CHẾ (1-2 trang)

**9.1. Kết luận:**
Tổng kết các thành quả đã đạt được:
- Hoàn thành 18/18 tiêu chí bắt buộc
- 100+ chức năng được triển khai
- Hệ thống hoạt động ổn định trên production (https://tmailcc.app)
- Áp dụng đầy đủ các công nghệ yêu cầu: Next.js App Router, TypeScript, Supabase, Tailwind CSS, Docker, VPS Deployment
- Vượt yêu cầu với: Developer API, Webhook system, i18n, OTP page, Realtime đa tab

**9.2. Hạn chế:**
1. Chỉ nhận email inbound, chưa hỗ trợ gửi email ra ngoài (outbound)
2. Dung lượng file đính kèm chưa giới hạn ở phía ứng dụng
3. Admin Panel chưa tối ưu hoàn toàn cho màn hình di động siêu nhỏ
4. Chưa có spam filter tự động dựa trên nội dung

**9.3. Hướng phát triển:**
1. Tích hợp SMTP service (Resend/Mailgun) cho gửi email hai chiều
2. AI-based spam filter
3. Shared mailboxes cho nhóm làm việc
4. Mobile app (React Native / Flutter)
5. Custom domain cho người dùng
6. End-to-end encryption cho nội dung email

### PHẦN 10: TÀI LIỆU THAM KHẢO
Liệt kê theo format chuẩn:
1. Next.js Documentation — https://nextjs.org/docs (App Router, API Routes, Server Components)
2. Supabase Documentation — https://supabase.com/docs (Auth, Database, Realtime, Storage, RLS)
3. Tailwind CSS Documentation — https://tailwindcss.com/docs
4. Docker Official Documentation — https://docs.docker.com (Dockerfile, Docker Compose, Multi-stage Build)
5. TypeScript Documentation — https://www.typescriptlang.org/docs
6. Cloudflare Documentation — https://developers.cloudflare.com (Workers, Tunnel, DNS, SSL)
7. PostgreSQL Row Level Security — https://www.postgresql.org/docs/current/ddl-rowsecurity.html
8. Conventional Commits — https://www.conventionalcommits.org
9. Node.js Documentation — https://nodejs.org/docs
10. Nginx Documentation — https://nginx.org/en/docs/

## LƯU Ý QUAN TRỌNG
1. Viết TIẾNG VIỆT CÓ DẤU — tuyệt đối không viết không dấu
2. Giọng văn: học thuật nhưng dễ hiểu, như sinh viên viết báo cáo đồ án
3. Tối thiểu 20 trang nội dung (ước lượng mỗi phần theo số trang gợi ý ở trên)
4. Mỗi phần cần có nội dung chi tiết, KHÔNG viết bullet points sơ sài
5. Các bảng biểu phải có header rõ ràng
6. Code snippets ngắn gọn, chỉ trích dẫn phần quan trọng nhất
7. Đặt placeholder <!-- SCREENSHOT: ... --> tại mỗi vị trí cần chèn hình
8. KHÔNG dùng emoji/icon màu — nếu cần thì mô tả bằng text
9. File output: `docs/BAO-CAO-TOAN-VAN.md`

## DỮ LIỆU THAM CHIẾU
Đọc các file sau trong codebase để lấy thông tin chính xác:
- `docs/chucnang-tmailCC.md` — danh sách chức năng chi tiết (100+ chức năng)
- `docs/technical-report.md` — báo cáo kỹ thuật hiện có
- `docs/ai-prompts-appendix.md` — 7 prompts AI
- `docs/prompts_tam_dac.md` — 9 prompts tâm đắc
- `docs/deploy-vps.md` — hướng dẫn deploy VPS
- `Dockerfile` — Docker multi-stage build
- `docker-compose.yml` — Docker Compose config
- `supabase/schema.sql` — Database schema + RLS policies
- `client/package.json` — dependencies
- `README.md` — tổng quan dự án
```

---

## Tóm tắt các vị trí cần chèn hình ảnh

| STT | Phần | Mô tả screenshot cần chụp |
|:---:|:----:|:------|
| 1 | Giới thiệu | Giao diện trang chủ tmailCC trên desktop (sidebar + email list + email view) |
| 2 | Giới thiệu | Giao diện tmailCC responsive trên mobile |
| 3 | Kiến trúc | Sơ đồ kiến trúc hệ thống (vẽ draw.io) |
| 4 | Kiến trúc | Sơ đồ ERD database (vẽ dbdiagram.io) |
| 5 | Kiến trúc | Supabase Dashboard hiển thị các bảng |
| 6 | Chức năng | Giao diện tạo email mới (dropdown domain) |
| 7 | Chức năng | Giao diện xem nội dung email (EmailView) |
| 8 | Chức năng | Browser notification khi có email mới |
| 9 | Chức năng | Trang OTP (/otp) |
| 10 | Chức năng | Admin Panel — tab Stats |
| 11 | Chức năng | Admin Panel — tab Users |
| 12 | Chức năng | Admin Panel — tab Domains |
| 13 | Chức năng | Admin Panel — tab Config |
| 14 | Chức năng | Admin Panel — tab Blocklist |
| 15 | Chức năng | Dark mode vs Light mode so sánh |
| 16 | Chức năng | Đổi ngôn ngữ EN/VI |
| 17 | Chức năng | QR Code modal |
| 18 | Chức năng | Developer Settings / API Keys |
| 19 | AI | Cursor AI đang code completion |
| 20 | AI | Ví dụ prompt + kết quả trong Cursor |
| 21 | Docker | Terminal docker-compose up -d thành công |
| 22 | Docker | Kết quả curl health check |
| 23 | Docker | Cloudflare DNS settings |
| 24 | Docker | https://tmailcc.app với SSL certificate |
