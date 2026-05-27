# tmailCC - VPS Deployment Guide (Nginx + Cloudflare + SSL)

## Mục lục
1. [Tổng quan kiến trúc](#tổng-quan-kiến-trúc)
2. [Chuẩn bị VPS](#chuẩn-bị-vps)
3. [Cài đặt Docker](#cài-đặt-docker)
4. [Cấu hình Domain & DNS](#cấu-hình-domain--dns)
5. [Deploy với Docker](#deploy-với-docker)
6. [Cấu hình Nginx](#cấu-hình-nginx)
7. [Cấu hình SSL với Cloudflare](#cấu-hình-ssl-với-cloudflare)
8. [Renew SSL Certificate](#renew-ssl-certificate)
9. [Xử lý sự cố](#xử-lý-sự-cố)

---

## Tổng quan kiến trúc

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           INTERNET                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLOUDFLARE                                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  - DNS Resolution                                              │   │
│  │  - Free SSL/TLS (Universal Certificate)                        │   │
│  │  - DDoS Protection                                             │   │
│  │  - CDN (Content Delivery Network)                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ HTTPS (port 443)
┌─────────────────────────────────────────────────────────────────────────┐
│                              VPS (Vultr/DigitalOcean/etc)                 │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                         NGINX (Reverse Proxy)                     │   │
│  │  - Port 80 (HTTP) → Redirect to HTTPS                          │   │
│  │  - Port 443 (HTTPS) → Proxy to Next.js                         │   │
│  │  - SSL Termination                                              │   │
│  │  - Static file caching                                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│                                    ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    NEXT.JS APP (Docker Container)                │   │
│  │  - Port 3000                                                    │   │
│  │  - Standalone mode                                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                         SUPABASE CLOUD                            │   │
│  │  - PostgreSQL Database                                           │   │
│  │  - Authentication                                                │   │
│  │  - Storage                                                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Chuẩn bị VPS

### 1. Chọn VPS provider

Khuyến nghị:
- **Vultr** (từ $5/tháng) - https://vultr.com
- **DigitalOcean** (từ $4/tháng) - https://digitalocean.com
- **Hetzner** (từ €4/tháng) - https://hetzner.com

### 2. Tạo VPS

1. Chọn OS: **Ubuntu 22.04 LTS** (khuyến nghị)
2. Chọn size: **1 vCPU, 1GB RAM** (tối thiểu) / **2 vCPU, 4GB RAM** (khuyến nghị)
3. Enable IPv6
4. Chọn location gần nhất (Singapore/N Tokyo)

### 3. Kết nối SSH

```bash
# Connect to VPS
ssh root@your-vps-ip

# Update system
apt update && apt upgrade -y

# Install basic tools
apt install -y curl wget git unzip software-properties-common
```

---

## Cài đặt Docker

### 1. Cài đặt Docker Engine

```bash
# Add Docker GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Enable Docker
systemctl enable docker
systemctl start docker

# Add user to docker group (optional, for non-root)
usermod -aG docker ubuntu
```

### 2. Cài đặt Docker Compose (standalone)

```bash
# Download Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make executable
chmod +x /usr/local/bin/docker-compose

# Verify
docker-compose --version
```

---

## Cấu hình Domain & DNS

### 1. Mua domain (nếu chưa có)

Khuyến nghị:
- **Namecheap** - https://namecheap.com
- **Cloudflare Registrar** - https://cloudflare.com/products/registrar
- **Porkbun** - https://porkbun.com

### 2. Cấu hình DNS trên Cloudflare

1. Đăng ký Cloudflare (miễn phí): https://dash.cloudflare.com
2. Thêm domain của bạn
3. Cloudflare sẽ cung cấp nameservers
4. Cập nhật nameservers tại domain registrar

5. Thêm DNS record cho VPS:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | @ | YOUR_VPS_IP | Proxied (⚡) |
| A | www | YOUR_VPS_IP | Proxied (⚡) |

**Lưu ý:** Để bật Cloudflare Universal SSL, set Proxy status thành "Proxied"

### 3. Verify DNS

```bash
# Check DNS propagation
dig +short yourdomain.com

# Should return your VPS IP
```

---

## Deploy với Docker

### 1. Clone repository

```bash
# SSH vào VPS
ssh root@your-vps-ip

# Clone repository (hoặc copy files qua scp)
git clone https://github.com/yourusername/tmailCC.git
cd tmailCC
```

### 2. Cấu hình Environment

```bash
# Copy environment file
cp .env.example .env

# Edit với credentials của bạn
nano .env
```

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-32-char-minimum-secret

# Webhook
WEBHOOK_SECRET=your-webhook-secret

# Optional
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 3. Build và chạy

```bash
# Build Docker image
docker build -t tmailcc:latest .

# Chạy container
docker run -d \
  --name tmailcc \
  -p 127.0.0.1:3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  --memory="512m" \
  --memory-swap="1g" \
  tmailcc:latest

# Verify container is running
docker ps
```

### 4. Test local

```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Should return: {"status":"ok",...}
```

---

## Cấu hình Nginx

### 1. Cài đặt Nginx

```bash
apt install -y nginx
systemctl enable nginx
systemctl start nginx
```

### 2. Tạo Nginx config

```bash
nano /etc/nginx/sites-available/tmailcc
```

```nginx
# Upstream to Next.js
upstream tmailcc {
    server 127.0.0.1:3000;
    keepalive 64;
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general:10m rate=30r/s;

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect all HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration (Cloudflare handles this)
    # Cloudflare provides Universal SSL automatically
    ssl_certificate /etc/ssl/certs/cloudflare-origin-pull.pem;
    ssl_certificate_key /etc/ssl/private/cloudflare-origin-pull.key;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml;

    # Client body size
    client_max_body_size 10M;

    # Access/Error logs
    access_log /var/log/nginx/tmailcc_access.log;
    error_log /var/log/nginx/tmailcc_error.log;

    # Rate limiting
    limit_req zone=general burst=50 nodelay;

    # Proxy to Next.js
    location / {
        limit_req zone=general burst=20 nodelay;

        proxy_pass http://tmailcc;
        proxy_http_version 1.1;

        # Headers
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;

        # WebSocket support (for future Realtime)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    # API endpoints - stricter rate limiting
    location /api/ {
        limit_req zone=api burst=10 nodelay;

        proxy_pass http://tmailcc;
        proxy_http_version 1.1;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Longer timeouts for API
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # Static files - longer cache
    location /_next/static/ {
        proxy_pass http://tmailcc;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Health check - no rate limiting
    location /api/health {
        proxy_pass http://tmailcc;
        proxy_set_header Host $http_host;
    }
}
```

### 3. Enable config

```bash
# Remove default config
rm /etc/nginx/sites-enabled/default

# Enable tmailcc config
ln -s /etc/nginx/sites-available/tmailcc /etc/nginx/sites-enabled/

# Test config
nginx -t

# Reload Nginx
systemctl reload nginx
```

### 4. Verify

```bash
# Test HTTPS endpoint
curl -I https://yourdomain.com/api/health
```

---

## Cấu hình SSL với Cloudflare

### Option 1: Cloudflare Universal SSL (Khuyến nghị - Miễn phí)

Cloudflare tự động cấp SSL certificate cho domain của bạn.

1. Trong Cloudflare Dashboard:
   - Go to **SSL/TLS** > **Overview**
   - Set **Mode** = "Full" hoặc "Flexible"
   
2. Kiểm tra:
   ```bash
   curl -I https://yourdomain.com
   # Should show SSL certificate from Cloudflare
   ```

### Option 2: Cloudflare Origin Certificate (Nếu dùng Full Strict)

Để enable "Full (strict)" mode:

1. Trong Cloudflare Dashboard:
   - Go to **SSL/TLS** > **Origin Server**
   - Click "Create Certificate"
   - Select private key algorithm (RSA hoặc ECDSA)
   - Set hostname: `*.yourdomain.com` và `yourdomain.com`
   - Set Certificate validity: 15 years
   - Click "Create"

2. Copy certificate và private key

3. Trên VPS:
   ```bash
   # Save certificate
   nano /etc/ssl/certs/cloudflare-origin-pull.pem
   
   # Save private key
   nano /etc/ssl/private/cloudflare-origin-pull.key
   
   # Set permissions
   chmod 600 /etc/ssl/private/cloudflare-origin-pull.key
   ```

4. Trong Cloudflare Dashboard:
   - Go to **SSL/TLS** > **Overview**
   - Set **Mode** = "Full (strict)"

### SSL Certificate Test

```bash
# Check SSL certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Check SSL grade
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=yourdomain.com
```

---

## Renew SSL Certificate

### Cloudflare Universal SSL
**Tự động renew** - Không cần làm gì.

### Cloudflare Origin Certificate
Certificate có validity 15 năm - Không cần renew.

---

## Xử lý sự cố

### "502 Bad Gateway"

```bash
# Check Nginx logs
tail -f /var/log/nginx/tmailcc_error.log

# Check if Next.js is running
curl http://localhost:3000/api/health

# Check Docker container
docker ps
docker logs tmailcc
```

### "504 Gateway Timeout"

```bash
# Check Nginx timeout settings
# Increase timeouts in Nginx config if needed

proxy_connect_timeout 300s;
proxy_send_timeout 300s;
proxy_read_timeout 300s;
```

### SSL Certificate Error

```bash
# Check certificate
openssl s_client -connect yourdomain.com:443

# Verify Cloudflare proxy is enabled
# In Cloudflare Dashboard > DNS > check orange cloud icon
```

### DNS Not Resolving

```bash
# Check DNS
dig yourdomain.com
nslookup yourdomain.com

# Flush DNS cache (local)
ipconfig /flushdns  # Windows
sudo systemd-resolve --flush-caches  # Linux
```

### Container Won't Start

```bash
# Check logs
docker logs tmailcc

# Check environment
docker exec tmailcc env

# Check if port is in use
netstat -tlnp | grep 3000
```

### Performance Issues

```bash
# Check resource usage
docker stats

# Monitor Nginx
tail -f /var/log/nginx/tmailcc_access.log

# Enable Nginx debug logging (temporary)
# In /etc/nginx/nginx.conf:
# error_log /var/log/nginx/error.log debug;
```

---

## Auto-restart Script

Tạo systemd service để tự động khởi động lại:

```bash
nano /etc/systemd/system/tmailcc.service
```

```ini
[Unit]
Description=tmailCC Docker Container
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/bin/docker start tmailcc
ExecStop=/usr/bin/docker stop tmailcc
Restart=on-failure
RestartSec=10s

[Install]
WantedBy=multi-user.target
```

```bash
# Enable service
systemctl daemon-reload
systemctl enable tmailcc
systemctl start tmailcc

# Check status
systemctl status tmailcc
```

---

## Backup

### Backup Docker data

```bash
# Backup environment file
cp /root/tmailCC/.env /backup/tmailcc-env-$(date +%Y%m%d).bak

# Backup Nginx config
cp /etc/nginx/sites-available/tmailcc /backup/tmailcc-nginx-$(date +%Y%m%d).conf
```

### Automated Backup Script

```bash
nano /root/backup.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/backup

# Backup files
cp /root/tmailCC/.env $BACKUP_DIR/tmailcc-env-$DATE.bak
cp /etc/nginx/sites-available/tmailcc $BACKUP_DIR/tmailcc-nginx-$DATE.conf

# Keep only last 7 days
find $BACKUP_DIR -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# Make executable and add to crontab
chmod +x /root/backup.sh
echo "0 2 * * * /root/backup.sh" | tee -a /etc/crontab
```

---

## Monitoring

### Basic Health Check

```bash
# Create health check script
nano /root/health-check.sh
```

```bash
#!/bin/bash

# Check Docker container
if ! docker ps | grep -q tmailcc; then
    echo "ALERT: Container not running"
    # Send notification (email, slack, etc)
fi

# Check HTTP response
if ! curl -sf https://yourdomain.com/api/health > /dev/null; then
    echo "ALERT: App not responding"
    # Send notification
fi

# Check disk space
if df -h / | awk 'NR==2 {print $5}' | grep -q '9[0-9]%'; then
    echo "ALERT: Disk space low"
fi
```

---

## Security Checklist

- [ ] Root login disabled
- [ ] SSH key only authentication
- [ ] UFW firewall enabled
- [ ] Fail2ban installed
- [ ] Regular security updates
- [ ] Docker container memory limited
- [ ] No sensitive data in logs
- [ ] Environment variables secured
- [ ] Cloudflare DDoS protection enabled
- [ ] SSL/TLS configured (Full or Full Strict)
