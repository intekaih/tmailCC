#!/data/data/com.termux/files/usr/bin/bash
clear

# ===== TOKEN CLOUDFLARE TUNNEL (đổi ở đây nếu cần) =====
CF_TOKEN="eyJhIjoiNGE2NTdhMzdlY2IwNWVmMGJlMTYyNjBmNWY2NDYxMjUiLCJ0IjoiNjI4ZTFkOTctMGQ5MS00MmU5LThiZWMtZDNiOThkNTM3ZjdlIiwicyI6Ik9XRXdOMlV6WVRjdE5tRXlPQzAwWWpkaExXRmhNREV0WTJGallqYzNOekptWm1RMSJ9"

echo -e "\e[32m====================================================\e[0m"
echo -e "\e[32m[1/5] Cài Node.js và Cloudflare Tunnel...\e[0m"
echo -e "\e[32m====================================================\e[0m"

# Sửa lỗi "Mirror sync in progress"
echo "deb https://packages.termux.dev/apt/termux-main stable main" > $PREFIX/etc/apt/sources.list

# Cập nhật và cài đặt lệnh
yes | pkg update -y
yes | pkg upgrade -y
pkg install nodejs wget tar cloudflared -y

echo -e "\e[32m\n[2/5] Hút Source Code TMail từ máy tính qua USB...\e[0m"
rm -rf ~/tmail
mkdir -p ~/tmail
cd ~/tmail
wget -q http://127.0.0.1:8088/tmail.tar.gz -O tmail.tar.gz || curl -s http://127.0.0.1:8088/tmail.tar.gz -o tmail.tar.gz

echo -e "\e[32m\n[3/5] Giải nén mã nguồn & Cài đặt thư viện...\e[0m"
tar -xzf tmail.tar.gz
rm tmail.tar.gz

mkdir -p logs

# Cài đặt thư viện
npm install pm2 -g

echo -e "\e[32mCài đặt thư viện ứng dụng (Next.js)...\e[0m"
cd client && npm install && cd ..

# Tạo file .env cho client nếu chưa có (Supabase mode)
if [ ! -f "client/.env" ]; then
    echo "PORT=3000" > client/.env
    echo "NODE_ENV=production" >> client/.env
    echo "# Supabase Configuration" >> client/.env
    echo "NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co" >> client/.env
    echo "SUPABASE_URL=https://YOUR_PROJECT.supabase.co" >> client/.env
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY" >> client/.env
    echo "SUPABASE_ANON_KEY=YOUR_ANON_KEY" >> client/.env
    echo "SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY" >> client/.env
    echo "SUPABASE_JWT_SECRET=YOUR_32_CHAR_SECRET" >> client/.env
    echo "# Cloudflare Worker Webhook" >> client/.env
    echo "WEBHOOK_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" >> client/.env
fi

echo -e "\e[32m\n[4/5] Đã có sẵn Next.js App (.next) từ PC, bỏ qua bước build...\e[0m"

echo -e "\e[33mLƯU Ý: Chỉnh sửa client/.env với Supabase credentials trước khi chạy!\e[0m"

echo -e "\e[32m\n[5/5] Khởi động Next.js App + Cloudflare Tunnel...\e[0m"
pm2 delete all 2>/dev/null

# Khởi động Frontend & Backend qua config PM2
pm2 start ecosystem.config.js

# Khởi động Cloudflare Tunnel trực tiếp với token hardcode
pm2 start cloudflared --name "cloudflare_tunnel" -- tunnel run --token "$CF_TOKEN"

# Lưu trạng thái PM2 để tự phục hồi khi restart
pm2 save

echo -e "\e[32m\n====================================================\e[0m"
echo -e "\e[32m==== HOÀN TẤT! TUNNEL ĐÃ TỰ ĐỘNG KẾT NỐI ====\e[0m"
echo -e "\e[32m====================================================\e[0m"
echo -e "\e[36mKiểm tra: pm2 list  |  pm2 logs cloudflare_tunnel\e[0m"
