# tmailCC - Webmail System

Hệ thống Webmail hiện đại với email tạm thời, real-time notifications, và quản lý đa miền.

**Production URL:** https://tmailcc.app/

## Công nghệ

- **Next.js 14** - App Router, TypeScript, API Routes
- **Supabase** - PostgreSQL, Auth, RLS, Realtime, Storage
- **Tailwind CSS** - Responsive styling
- **Docker** - Containerization
- **Cloudflare** - DNS, SSL, CDN deployment

## Tính năng chính

- ✅ Đăng ký / Đăng nhập / Đăng xuất
- ✅ Tạo email tạm thời hoặc tùy chỉnh
- ✅ Real-time email notifications (Supabase Realtime)
- ✅ Dark/Light mode
- ✅ Đa ngôn ngữ (Tiếng Việt / English)
- ✅ OTP page - xem email không cần đăng nhập
- ✅ Admin panel - quản lý users, domains, config
- ✅ RLS - Bảo mật dữ liệu cấp dòng
- ✅ Responsive design

## Cài đặt nhanh

### 1. Clone repository

```bash
git clone <your-repo-url>
cd tmailCC
```

### 2. Cấu hình Environment

```bash
cp .env.example .env
# Chỉnh sửa .env với Supabase credentials của bạn
```

### 3. Chạy với Docker

```bash
docker-compose up -d
```

Hoặc build image riêng:

```bash
docker build -t tmailcc .
docker run -d -p 3000:3000 --env-file .env tmailcc
```

## Development

```bash
cd client
npm install
npm run dev
```

## Tài liệu chi tiết

- [Setup Guide](./docs/supabase-setup.md) - Cài đặt Supabase database
- [Docker Guide](./docs/docker-guide.md) - Hướng dẫn Docker
- [VPS Deployment](./docs/deploy-vps.md) - Deploy lên VPS với Nginx + SSL
- [Technical Report](./docs/technical-report.md) - Báo cáo kỹ thuật đầy đủ
- [AI Prompts Appendix](./docs/ai-prompts-appendix.md) - Phụ lục AI prompts

## Docker Commands

```bash
# Build
docker build -t tmailcc .

# Run
docker run -d -p 3000:3000 --env-file .env tmailcc

# Docker Compose
docker-compose up -d      # Start
docker-compose down       # Stop
docker-compose logs -f    # View logs
docker-compose restart    # Restart
```

## Environment Variables

| Variable | Mô tả |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `SUPABASE_JWT_SECRET` | JWT secret (min 32 chars) |
| `WEBHOOK_SECRET` | Secret cho inbound webhook |

Xem `.env.example` để biết thêm chi tiết.

## Deployment

### Termux (Samsung Note 8)

Xem `tmail_guide.txt` để biết chi tiết về deployment trên Termux.

### Cloudflare Tunnel

Token tunnel đã được cấu hình sẵn trong `ecosystem.config.js`.

### VPS + Nginx + SSL

Xem [VPS Deployment Guide](./docs/deploy-vps.md) để biết chi tiết.

## License

MIT
