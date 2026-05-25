# Lay duong dan tuyet doi cua thu muc chinh (thu muc chua script nay)
$PROJECT_ROOT = $PSScriptRoot

# Chuyen vao thu muc chinh
Push-Location $PROJECT_ROOT
Write-Host "Working directory: $PROJECT_ROOT"

Write-Host "==========================="
Write-Host "1. Build TMail Frontend (Next.js)"
Write-Host "==========================="
$CLIENT_DIR = Join-Path $PROJECT_ROOT "client"
if (Test-Path $CLIENT_DIR) {
    Push-Location $CLIENT_DIR
    Write-Host "Dang cai dat dependencies cho Frontend..."
    npm install
    Write-Host "Dang build Next.js App..."
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Loi build Frontend!" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location
    Write-Host "Build Frontend thanh cong!" -ForegroundColor Green
} else {
    Write-Host "Khong tim thay client, skip build" -ForegroundColor Yellow
}

Write-Host "==========================="
Write-Host "2. Nen source code moi nhat"
Write-Host "==========================="
# Xoa tmail.tar.gz cu
$OLD_TAR = Join-Path $PROJECT_ROOT "tmail.tar.gz"
if (Test-Path $OLD_TAR) {
    Remove-Item $OLD_TAR -Force -ErrorAction SilentlyContinue
}

# Di chuyen ve thu muc chinh de nen
Set-Location $PROJECT_ROOT

# Nen thu muc tru ra cac thanh phan khong can thiet (rat nang)
tar.exe -czvf tmail.tar.gz `
    --exclude=node_modules `
    --exclude=.git `
    --exclude=.vscode `
    --exclude=client/.next/cache `
    --exclude=*.tar.gz `
    --exclude=*.log `
    --exclude=client/node_modules `
    -C . "client" "supabase" "worker" "scripts" "docs" "ecosystem.config.js" "package.json" "tmail_update.sh" "tmail_payload.sh"

Write-Host "==========================="
Write-Host "3. Duc lo USB cho cac may"
Write-Host "==========================="
$devices = (adb devices | Select-Object -Skip 1 | Where-Object { $_ -match "^([^\s]+)\s+device" } | ForEach-Object { $matches[1] })
foreach($d in $devices) {
    Write-Host "Dang ket noi cong 8088 cho $d..."
    adb -s $d reverse tcp:8088 tcp:8088
}

Write-Host "==========================="
Write-Host "4. Mo Server truyen file"
Write-Host "==========================="
Write-Host "Server dang chay... DUNG TAT CUA SO NAY KHI CHUA XONG!"
npx --yes http-server . -p 8088 -c-1
