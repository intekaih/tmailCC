#!/usr/bin/env pwsh
<#
  .SYNOPSIS
  Restructure git history into meaningful conventional commits.

  .DESCRIPTION
  Creates a new orphan branch with ~20 conventional commits,
  then replaces the main branch. Run from the project root.

  .NOTES
  ⚠ This REWRITES git history. Only run on local/private repos.
  ⚠ Back up your work first (copy the folder).
#>

param (
  [string]$AuthorName = "tmailCC Dev",
  [string]$AuthorEmail = "dev@tmailcc.kaih.co.uk"
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " tmailCC Git History Restructure" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Ensure we're in a git repo
if (!(Test-Path ".git")) {
  Write-Host "ERROR: Not a git repository. Run from project root." -ForegroundColor Red
  exit 1
}

# Save current branch name
$currentBranch = git rev-parse --abbrev-ref HEAD 2>$null
if (!$currentBranch) { $currentBranch = "main" }

Write-Host "[1/3] Creating orphan branch 'restructured'..." -ForegroundColor Yellow
git checkout --orphan restructured 2>$null
git rm -rf . --quiet 2>$null

# Helper function
function Make-Commit {
  param(
    [string]$Message,
    [string[]]$Files,
    [string]$Date
  )

  foreach ($f in $Files) {
    if (Test-Path $f) {
      git add $f 2>$null
    }
  }

  $env:GIT_AUTHOR_DATE = $Date
  $env:GIT_COMMITTER_DATE = $Date
  $env:GIT_AUTHOR_NAME = $AuthorName
  $env:GIT_AUTHOR_EMAIL = $AuthorEmail
  $env:GIT_COMMITTER_NAME = $AuthorName
  $env:GIT_COMMITTER_EMAIL = $AuthorEmail

  git commit -m $Message --allow-empty --quiet 2>$null
  Write-Host "  + $Message" -ForegroundColor Green
}

Write-Host ""
Write-Host "[2/3] Creating conventional commits..." -ForegroundColor Yellow
Write-Host ""

# Restore all files first so they can be staged selectively
git checkout $currentBranch -- . 2>$null
git reset HEAD . --quiet 2>$null

# ============================================================
# COMMIT 1: Project init
# ============================================================
Make-Commit `
  -Message "chore: initialize project with Next.js 14 App Router" `
  -Files @(
    "client/package.json",
    "client/tsconfig.json",
    "client/next.config.mjs",
    "client/postcss.config.mjs",
    "client/tailwind.config.js",
    ".gitignore",
    ".dockerignore",
    "README.md"
  ) `
  -Date "2026-05-10T09:00:00+07:00"

# ============================================================
# COMMIT 2: Database schema
# ============================================================
Make-Commit `
  -Message "feat(db): add PostgreSQL schema with RLS policies" `
  -Files @(
    "supabase/schema.sql"
  ) `
  -Date "2026-05-11T10:00:00+07:00"

# ============================================================
# COMMIT 3: Supabase client setup
# ============================================================
Make-Commit `
  -Message "feat(supabase): configure Supabase SSR client and admin" `
  -Files @(
    "client/lib/supabase/client.ts",
    "client/lib/supabase/admin.ts",
    "client/lib/supabase/middleware.ts",
    "client/middleware.ts",
    ".env.example"
  ) `
  -Date "2026-05-12T09:30:00+07:00"

# ============================================================
# COMMIT 4: Auth system
# ============================================================
Make-Commit `
  -Message "feat(auth): implement register, login, logout with Supabase Auth" `
  -Files @(
    "client/lib/auth.ts",
    "client/app/api/auth/login/route.ts",
    "client/app/api/auth/register/route.ts",
    "client/app/api/auth/me/route.ts",
    "client/app/api/auth/change-password/route.ts",
    "client/components/AuthModal.tsx",
    "client/components/ChangePasswordModal.tsx"
  ) `
  -Date "2026-05-13T11:00:00+07:00"

# ============================================================
# COMMIT 5: API client + types
# ============================================================
Make-Commit `
  -Message "feat(api): add TypeScript API client with type definitions" `
  -Files @(
    "client/lib/api.ts",
    "client/app/types.ts"
  ) `
  -Date "2026-05-14T09:00:00+07:00"

# ============================================================
# COMMIT 6: i18n
# ============================================================
Make-Commit `
  -Message "feat(i18n): add Vietnamese/English internationalization" `
  -Files @(
    "client/lib/i18n.ts"
  ) `
  -Date "2026-05-14T14:00:00+07:00"

# ============================================================
# COMMIT 7: Accounts CRUD
# ============================================================
Make-Commit `
  -Message "feat(accounts): implement account CRUD API and Server Actions" `
  -Files @(
    "client/app/api/accounts/route.ts",
    "client/app/api/accounts/domains/route.ts",
    "client/app/actions.ts"
  ) `
  -Date "2026-05-15T10:00:00+07:00"

# ============================================================
# COMMIT 8: Emails CRUD
# ============================================================
Make-Commit `
  -Message "feat(emails): implement email listing, detail, and deletion APIs" `
  -Files @(
    "client/app/api/emails/route.ts",
    "client/app/api/emails/[id]/route.ts"
  ) `
  -Date "2026-05-16T09:00:00+07:00"

# ============================================================
# COMMIT 9: Realtime
# ============================================================
Make-Commit `
  -Message "feat(realtime): add Supabase Realtime email subscriptions with dedup" `
  -Files @(
    "client/lib/realtime.ts",
    "client/lib/notification.ts",
    "client/components/NotificationSound.tsx"
  ) `
  -Date "2026-05-17T10:00:00+07:00"

# ============================================================
# COMMIT 10: Core UI components
# ============================================================
Make-Commit `
  -Message "feat(ui): build Sidebar, EmailList, EmailView components" `
  -Files @(
    "client/components/Sidebar.tsx",
    "client/components/EmailList.tsx",
    "client/components/EmailView.tsx",
    "client/components/QRModal.tsx",
    "client/lib/AppContext.tsx"
  ) `
  -Date "2026-05-18T09:00:00+07:00"

# ============================================================
# COMMIT 11: Main page layout
# ============================================================
Make-Commit `
  -Message "feat(app): implement main page with Server/Client Component pattern" `
  -Files @(
    "client/app/page.tsx",
    "client/app/HomeClient.tsx",
    "client/app/layout.tsx",
    "client/app/globals.css"
  ) `
  -Date "2026-05-19T10:00:00+07:00"

# ============================================================
# COMMIT 12: Webhook inbound
# ============================================================
Make-Commit `
  -Message "feat(webhook): add inbound email processing with OTP detection" `
  -Files @(
    "client/app/api/webhook/inbound/route.ts",
    "client/lib/mailParser.ts",
    "client/lib/services/otpUtils.ts",
    "client/lib/services/webhookService.ts",
    "worker/"
  ) `
  -Date "2026-05-20T09:00:00+07:00"

# ============================================================
# COMMIT 13: Admin panel
# ============================================================
Make-Commit `
  -Message "feat(admin): add admin panel with user/domain/config management" `
  -Files @(
    "client/components/AdminPanel.tsx",
    "client/app/api/admin/route.ts"
  ) `
  -Date "2026-05-21T09:00:00+07:00"

# ============================================================
# COMMIT 14: Developer API
# ============================================================
Make-Commit `
  -Message "feat(developer): add API keys, webhooks, and usage tracking" `
  -Files @(
    "client/components/DeveloperSettings.tsx",
    "client/app/api/developer/"
  ) `
  -Date "2026-05-22T10:00:00+07:00"

# ============================================================
# COMMIT 15: OTP + Quick Access pages
# ============================================================
Make-Commit `
  -Message "feat(pages): add OTP viewer and quick-access pages" `
  -Files @(
    "client/app/otp/",
    "client/app/quick-access/"
  ) `
  -Date "2026-05-23T09:00:00+07:00"

# ============================================================
# COMMIT 16: Supabase Storage
# ============================================================
Make-Commit `
  -Message "feat(storage): add Supabase Storage for attachments and avatars" `
  -Files @(
    "supabase/storage_migration.sql",
    "supabase/avatar_migration.sql",
    "client/app/api/auth/avatar/route.ts",
    "client/components/AvatarUpload.tsx"
  ) `
  -Date "2026-05-24T09:00:00+07:00"

# ============================================================
# COMMIT 17: Docker
# ============================================================
Make-Commit `
  -Message "feat(docker): add multi-stage Dockerfile and Docker Compose" `
  -Files @(
    "Dockerfile",
    "docker-compose.yml",
    ".dockerignore"
  ) `
  -Date "2026-05-25T09:00:00+07:00"

# ============================================================
# COMMIT 18: Deploy scripts
# ============================================================
Make-Commit `
  -Message "feat(deploy): add VPS deployment scripts and Nginx config" `
  -Files @(
    "tmail_deploy.ps1",
    "tmail_payload.sh"
  ) `
  -Date "2026-05-25T14:00:00+07:00"

# ============================================================
# COMMIT 19: QR + health
# ============================================================
Make-Commit `
  -Message "feat(api): add QR code generation and health check endpoints" `
  -Files @(
    "client/app/api/qr/",
    "client/app/api/health/route.ts"
  ) `
  -Date "2026-05-26T09:00:00+07:00"

# ============================================================
# COMMIT 20: Documentation
# ============================================================
Make-Commit `
  -Message "docs: add technical report, API guide, and AI prompts appendix" `
  -Files @(
    "docs/"
  ) `
  -Date "2026-05-27T10:00:00+07:00"

# ============================================================
# COMMIT 21: Catch-all remaining files
# ============================================================
git add -A 2>$null
$hasChanges = git diff --cached --quiet 2>$null; $LASTEXITCODE -ne 0
if ($LASTEXITCODE -ne 0) {
  $env:GIT_AUTHOR_DATE = "2026-05-28T09:00:00+07:00"
  $env:GIT_COMMITTER_DATE = "2026-05-28T09:00:00+07:00"
  git commit -m "chore: add remaining config files and assets" --quiet 2>$null
  Write-Host "  + chore: add remaining config files and assets" -ForegroundColor Green
}

# ============================================================
# STEP 3: Replace main branch
# ============================================================
Write-Host ""
Write-Host "[3/3] Replacing '$currentBranch' with restructured history..." -ForegroundColor Yellow

git branch -D $currentBranch 2>$null
git branch -m $currentBranch 2>$null

# Clean up env vars
Remove-Item Env:\GIT_AUTHOR_DATE -ErrorAction SilentlyContinue
Remove-Item Env:\GIT_COMMITTER_DATE -ErrorAction SilentlyContinue
Remove-Item Env:\GIT_AUTHOR_NAME -ErrorAction SilentlyContinue
Remove-Item Env:\GIT_AUTHOR_EMAIL -ErrorAction SilentlyContinue
Remove-Item Env:\GIT_COMMITTER_NAME -ErrorAction SilentlyContinue
Remove-Item Env:\GIT_COMMITTER_EMAIL -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host " DONE! Git history restructured." -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Verify with: git log --oneline" -ForegroundColor Cyan
Write-Host ""
Write-Host "To push to GitHub (force):" -ForegroundColor Yellow
Write-Host "  git remote add origin https://github.com/YOUR_USER/tmailCC.git" -ForegroundColor White
Write-Host "  git push -u origin $currentBranch --force" -ForegroundColor White
Write-Host ""
