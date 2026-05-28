#!/data/data/com.termux/files/usr/bin/bash
clear
echo -e "\e[32m====================================================\e[0m"
echo -e "\e[32m ĐANG CẬP NHẬT SOURCE CODE TMAIL MỚI NHẤT...\e[0m"
echo -e "\e[32m====================================================\e[0m"

cd ~/tmail

echo -e "\e[33m1. Đang hút file tmail.tar.gz từ máy tính...\e[0m"
wget -q http://127.0.0.1:8088/tmail.tar.gz -O tmail.tar.gz || curl -s http://127.0.0.1:8088/tmail.tar.gz -o tmail.tar.gz

echo -e "\e[33m2. Đang giải nén...\e[0m"
tar -xzf tmail.tar.gz

echo -e "\e[33m3. Cập nhật thư viện Next.js...\e[0m"
cd client && npm install && cd ..

CF_TOKEN="eyJhIjoiNGE2NTdhMzdlY2IwNWVmMGJlMTYyNjBmNWY2NDYxMjUiLCJ0IjoiNjI4ZTFkOTctMGQ5MS00MmU5LThiZWMtZDNiOThkNTM3ZjdlIiwicyI6Ik9XRXdOMlV6WVRjdE5tRXlPQzAwWWpkaExXRmhNREV0WTJGallqYzNOekptWm1RMSJ9"

echo -e "\e[33m4. Khởi động lại hệ thống (Next.js App + Tunnel)...\e[0m"
pm2 restart ecosystem.config.js --update-env

# Restart tunnel nếu đang chạy, hoặc tạo mới nếu chưa có
if pm2 describe cloudflare_tunnel > /dev/null 2>&1; then
    pm2 restart cloudflare_tunnel
else
    pm2 start cloudflared --name "cloudflare_tunnel" -- tunnel run --token "$CF_TOKEN"
fi

pm2 save

echo -e "\e[32m====================================================\e[0m"
echo -e "\e[32m       CẬP NHẬT HOÀN TẤT THÀNH CÔNG!\e[0m"
echo -e "\e[32m====================================================\e[0m"
