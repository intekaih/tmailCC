---
name: tmailCC-deployment
description: Deploy and manage tmailCC in various environments — Docker, VPS, Termux, and Cloudflare. Use when setting up deployment, configuring SSL, or troubleshooting production issues.
version: 1.0.0
---

# tmailCC Deployment Guide

## Quick Start

```bash
# Clone and configure
git clone <repo-url> tmailCC
cd tmailCC
cp .env.example .env
# Edit .env with your Supabase credentials

# Docker (recommended)
docker-compose up -d

# Development
npm run dev
```

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=min-32-char-secret

# Security
WEBHOOK_SECRET=random-secret-for-webhook-verification

# Optional
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-site-key
TURNSTILE_SECRET_KEY=your-secret-key
```

## Docker Deployment

### docker-compose.yml

```yaml
services:
  tmailcc:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Build and Run

```bash
# Build image
docker build -t tmailcc .

# Run container
docker run -d -p 3000:3000 --env-file .env tmailcc

# Docker Compose
docker-compose up -d      # Start
docker-compose down       # Stop
docker-compose logs -f    # View logs
docker-compose restart    # Restart
```

## VPS Deployment (Nginx + SSL)

### Prerequisites
- Ubuntu/Debian VPS
- Domain pointing to server IP
- Nginx installed
- Certbot for SSL

### Steps

1. **Install Node.js and Nginx**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx certbot python3-certbot-nginx
```

2. **Build the app**
```bash
cd /path/to/tmailCC
npm install
npm run build
```

3. **Nginx config** (`/etc/nginx/sites-available/tmailcc`)
```nginx
server {
    listen 80;
    server_name tmailcc.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

4. **Enable and SSL**
```bash
sudo ln -s /etc/nginx/sites-available/tmailcc /etc/nginx/sites-enabled/
sudo certbot --nginx -d tmailcc.yourdomain.com
```

5. **Run with PM2**
```bash
npm install -g pm2
pm2 start npm --name tmailcc -- start
pm2 startup
pm2 save
```

## Termux Deployment

For Android deployment on Termux, see `tmail_guide.txt` for detailed instructions.

Key steps:
```bash
# Install Termux
# Update packages
pkg update && pkg upgrade

# Install Node.js
pkg install nodejs

# Clone and build
git clone <repo>
cd tmailCC
npm install
npm run build

# Run
npm start
```

## Cloudflare Tunnel

For Cloudflare Tunnel access (no public IP needed):

```bash
# Using ecosystem.config.js with PM2
pm2 start ecosystem.config.js

# The config includes Cloudflare tunnel token
```

## Health Check Endpoint

```typescript
// client/app/api/health/route.ts
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
}
```

## Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure Supabase credentials in `.env`
- [ ] Set strong `SUPABASE_JWT_SECRET` (32+ chars)
- [ ] Set `WEBHOOK_SECRET` for inbound email verification
- [ ] Enable HTTPS (Let's Encrypt via certbot)
- [ ] Set up domain DNS
- [ ] Configure rate limiting
- [ ] Set up monitoring/logging
- [ ] Configure backups for Supabase
- [ ] Set up Cloudflare CDN/WAF

## Troubleshooting

### Container won't start
```bash
docker logs <container-name>
# Check .env file exists and has required variables
```

### 502 Bad Gateway
```bash
# Nginx can't reach the app
# Check if app is running
curl http://localhost:3000/api/health
# Check Nginx proxy config
```

### SSL Certificate Issues
```bash
sudo certbot --nginx -d yourdomain.com --force-renewal
```

### PM2 Process Issues
```bash
pm2 logs tmailcc --lines 100
pm2 restart tmailcc
pm2 monit
```

### Supabase Connection Issues
```bash
# Verify credentials
# Check Supabase project status
# Verify IP whitelist (if applicable)
```

## Database Backups

Supabase provides automatic daily backups. For additional safety:
- Use Supabase PITR (Point-in-Time Recovery)
- Export critical data regularly
- Consider pg_dump for custom backups

## Updating Deployment

```bash
# Pull latest code
git pull

# Rebuild
npm run build

# Restart
docker-compose restart
# or
pm2 restart tmailcc
```
