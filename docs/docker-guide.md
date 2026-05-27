# tmailCC - Docker Deployment Guide

## Mục lục
1. [Tổng quan](#tổng-quan)
2. [Yêu cầu](#yêu-cầu)
3. [Chạy với Docker Compose](#chạy-với-docker-compose)
4. [Build và chạy riêng lẻ](#build-và-chạy-riêng-lẻ)
5. [Cấu hình Environment](#cấu-hình-environment)
6. [Kiểm tra](#kiểm-tra)
7. [Xử lý sự cố](#xử-lý-sự-cố)

---

## Tổng quan

Dự án tmailCC được đóng gói hoàn chỉnh với Docker. Dockerfile sử dụng **multi-stage build** để tối ưu kích thước image.

### Kiến trúc Docker

```
┌─────────────────────────────────────────┐
│           Docker Container               │
├─────────────────────────────────────────┤
│  Next.js App (Production Build)         │
│  - Standalone mode                      │
│  - Multi-stage build                    │
│  - Non-root user (security)            │
│                                         │
│  Port: 3000                            │
└─────────────────────────────────────────┘
```

---

## Yêu cầu

- **Docker** 20.10+
- **Docker Compose** 2.0+ (hoặc `docker compose` plugin)
- **8GB RAM** (tối thiểu 4GB)
- **10GB Disk**

### Cài đặt Docker

**Windows/macOS:**
Tải Docker Desktop từ https://docker.com/products/docker-desktop

**Linux (Ubuntu):**
```bash
sudo apt update
sudo apt install docker.io docker-compose
sudo systemctl start docker
sudo usermod -aG docker $USER
# Log out and log back in
```

---

## Chạy với Docker Compose

### 1. Clone repository

```bash
git clone <your-repo-url>
cd tmailCC
```

### 2. Copy và cấu hình environment

```bash
# Copy file mẫu
cp .env.example .env

# Chỉnh sửa .env với credentials của bạn
nano .env
```

### 3. Cấu hình .env

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-32-character-minimum-secret
WEBHOOK_SECRET=your-webhook-secret
```

### 4. Build và chạy

```bash
# Build và chạy (detached mode)
docker-compose up -d

# Hoặc build lại nếu có thay đổi
docker-compose up -d --build

# Xem logs
docker-compose logs -f

# Chỉ xem logs của app
docker-compose logs -f tmail
```

### 5. Truy cập ứng dụng

Mở trình duyệt: http://localhost:3000

---

## Build và chạy riêng lẻ

### Build image

```bash
docker build -t tmailcc:latest .
```

### Chạy container

```bash
docker run -d \
  --name tmailcc \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  tmailcc:latest
```

### Docker Commands

```bash
# Liệt kê containers đang chạy
docker ps

# Xem logs
docker logs -f tmailcc

# Stop container
docker stop tmailcc

# Start container
docker start tmailcc

# Restart container
docker restart tmailcc

# Xóa container
docker rm -f tmailcc

# Xóa image
docker rmi tmailcc:latest
```

---

## Cấu hình Environment

### Biến môi trường bắt buộc

| Biến | Mô tả | Ví dụ |
|-------|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | `eyJhbG...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJhbG...` |
| `SUPABASE_JWT_SECRET` | JWT secret (min 32 chars) | `your-32-char-secret` |
| `WEBHOOK_SECRET` | Webhook verification secret | `random-secret` |

### Biến môi trường tùy chọn

| Biến | Mặc định | Mô tả |
|-------|-----------|-------|
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | `3000` | Port để listen |
| `HOSTNAME` | `0.0.0.0` | Host để bind |

---

## Kiểm tra

### Health check

```bash
curl http://localhost:3000/api/health
```

Response mong đợi:
```json
{
  "status": "ok",
  "uptime": 12345,
  "supabase": "configured"
}
```

### Kiểm tra logs

```bash
# Tất cả logs
docker-compose logs

# Logs realtime
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100
```

### Kiểm tra resource usage

```bash
docker stats
```

---

## Xử lý sự cố

### Container không khởi động

```bash
# Xem logs chi tiết
docker-compose logs tmail

# Kiểm tra environment
docker-compose config
```

### Lỗi "Port already allocated"

```bash
# Kiểm tra port đang dùng
netstat -an | grep 3000

# Hoặc thay đổi port trong docker-compose.yml
```

### Lỗi "Database not configured"

1. Kiểm tra Supabase credentials trong .env
2. Đảm bảo Supabase project đang hoạt động
3. Chạy schema SQL trong Supabase Dashboard

### Container restart loop

```bash
# Xem logs
docker-compose logs tmail

# Kiểm tra memory
docker stats

# Tăng memory trong Docker Desktop settings
```

### Không truy cập được từ bên ngoài

```bash
# Kiểm tra firewall
sudo ufw status

# Mở port 3000 nếu cần
sudo ufw allow 3000/tcp
```

---

## Production Deployment

Để deploy lên production VPS, xem [DEPLOY-VPS.md](./DEPLOY-VPS.md)

## Cleanup

```bash
# Dừng và xóa containers
docker-compose down

# Xóa containers và images
docker-compose down --rmi all

# Xóa volumes (CẨN THẬN: xóa data!)
docker-compose down -v
```
