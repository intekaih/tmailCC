'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import './landing.css';

// Custom monochrome SVG icons
const SvgDocsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const SvgGlobeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const SvgZapIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const SvgLockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const SvgCheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const SvgMailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const SvgKeyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);

const SvgArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const SvgTelegramIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </svg>
);

const SvgFacebookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const SvgZaloIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 8h8l-8 8h8" />
  </svg>
);

const SvgHubIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
    <line x1="6" y1="6" x2="6.01" y2="6" />
    <line x1="6" y1="18" x2="6.01" y2="18" />
    <line x1="18" y1="6" x2="18.01" y2="6" />
    <line x1="18" y1="18" x2="18.01" y2="18" />
  </svg>
);

const SvgDotIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <circle cx="12" cy="12" r="9" />
  </svg>
);

const SvgOtpIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <circle cx="12" cy="11" r="3" />
    <line x1="12" y1="14" x2="12" y2="17" />
  </svg>
);

const SvgWebhookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

// Code snippets database
const getCodeSnippets = (locale: 'vi' | 'en') => ({
  createAccount: {
    lang: 'javascript',
    title: locale === 'vi' ? 'Tạo Email & Custom Domain' : 'Create Email & Custom Domain',
    endpoint: 'POST /api/v1/accounts',
    request: locale === 'vi' 
      ? `// Tạo hộp thư ảo không giới hạn thời gian trên domain riêng của bạn
fetch('https://tmailcc.app/api/v1/accounts', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer tmail_key_example...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    localPart: 'lienhe', 
    domain: 'tenmienrieng.vn', // Hỗ trợ custom domain vô hạn
    expiresAt: null // Vô hạn thời hạn, sử dụng lâu dài
  })
})`
      : `// Create unlimited virtual mailbox on your own custom domain
fetch('https://tmailcc.app/api/v1/accounts', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer tmail_key_example...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    localPart: 'contact', 
    domain: 'yourdomain.com', // Support unlimited custom domains
    expiresAt: null // Permanent mailbox, long-term use
  })
})`,
    response: `{
  "success": true,
  "data": {
    "address": "${locale === 'vi' ? 'lienhe@tenmienrieng.vn' : 'contact@yourdomain.com'}",
    "localPart": "${locale === 'vi' ? 'lienhe' : 'contact'}",
    "domain": "${locale === 'vi' ? 'tenmienrieng.vn' : 'yourdomain.com'}",
    "expiresAt": null,
    "createdAt": "2026-05-28T20:25:00.000Z"
  }
}`
  },
  gmailHub: {
    lang: 'javascript',
    title: locale === 'vi' ? 'Gmail Hub - Nhận Mail Tập Trung' : 'Gmail Hub - Centralized Inbox',
    endpoint: 'POST /api/v1/gmail/connect',
    request: locale === 'vi'
      ? `// Đăng nhập tài khoản Gmail bằng App Password để nhận email tập trung một nơi
fetch('https://tmailcc.app/api/v1/gmail/connect', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer tmail_key_example...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    address: 'ungdungkiemtien12@gmail.com',
    appPassword: 'xxxx-yyyy-zzzz-wwww' // Google App Password bảo mật
  })
})`
      : `// Connect Gmail account using App Password for centralized inbox
fetch('https://tmailcc.app/api/v1/gmail/connect', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer tmail_key_example...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    address: 'mybusiness12@gmail.com',
    appPassword: 'xxxx-yyyy-zzzz-wwww' // Secure Google App Password
  })
})`,
    response: `{
  "success": true,
  "data": {
    "id": "gmail_hub_uuid_9988",
    "address": "${locale === 'vi' ? 'ungdungkiemtien12@gmail.com' : 'mybusiness12@gmail.com'}",
    "status": "connected",
    "createdAt": "2026-05-28T20:25:00.000Z"
  }
}`
  },
  dotmail: {
    lang: 'javascript',
    title: locale === 'vi' ? 'Tạo Dotmail (Biến Thể Dấu Chấm)' : 'Generate Dotmail (Dot Variant)',
    endpoint: 'POST /api/v1/dotmail/generate',
    request: locale === 'vi'
      ? `// Tự động sinh hàng loạt email dạng dấu chấm (.) từ Gmail gốc đã kết nối
fetch('https://tmailcc.app/api/v1/dotmail/generate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer tmail_key_example...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    parentId: 'gmail_hub_uuid_9988' // Gmail gốc
  })
})`
      : `// Auto-generate dot (.) variation emails from connected primary Gmail
fetch('https://tmailcc.app/api/v1/dotmail/generate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer tmail_key_example...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    parentId: 'gmail_hub_uuid_9988' // Parent Gmail ID
  })
})`,
    response: `{
  "success": true,
  "data": {
    "parentAddress": "${locale === 'vi' ? 'ungdungkiemtien12@gmail.com' : 'mybusiness12@gmail.com'}",
    "dotmails": [
      "${locale === 'vi' ? 'u.ngdungkiemtien12@gmail.com' : 'm.ybusiness12@gmail.com'}",
      "${locale === 'vi' ? 'un.gdungkiemtien12@gmail.com' : 'my.business12@gmail.com'}",
      "${locale === 'vi' ? 'ung.dungkiemtien12@gmail.com' : 'myb.usiness12@gmail.com'}"
    ],
    "total": 2048 // ${locale === 'vi' ? 'Tạo tối đa hàng nghìn email dotmail' : 'Create up to thousands of dotmails'}
  }
}`
  },
  otpApi: {
    lang: 'javascript',
    title: locale === 'vi' ? 'Truy Xuất Mã OTP Riêng Biệt' : 'Retrieve Dedicated OTP Code',
    endpoint: 'GET /api/v1/otp/retrieve',
    request: locale === 'vi'
      ? `// API chuyên dụng trích xuất nhanh mã OTP từ hộp thư tập trung
fetch('https://tmailcc.app/api/v1/otp/retrieve?address=ungdungkiemtien12@gmail.com', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer tmail_key_example...'
  }
})`
      : `// Dedicated API to extract OTP code instantly from centralized inbox
fetch('https://tmailcc.app/api/v1/otp/retrieve?address=mybusiness12@gmail.com', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer tmail_key_example...'
  }
})`,
    response: `{
  "success": true,
  "data": {
    "address": "${locale === 'vi' ? 'ungdungkiemtien12@gmail.com' : 'mybusiness12@gmail.com'}",
    "otp": "789120", // ${locale === 'vi' ? 'Trích xuất chính xác mã OTP bằng thuật toán Regex/AI' : 'OTP code extracted precisely using Regex/AI'}
    "sender": "noreply@facebook.com",
    "subject": "${locale === 'vi' ? '789120 là mã bảo mật Facebook của bạn' : '789120 is your Facebook security code'}",
    "receivedAt": "2026-05-28T20:26:12.000Z"
  }
}`
  },
  webhook: {
    lang: 'javascript',
    title: locale === 'vi' ? 'Webhook Tích Hợp Thời Gian Thực' : 'Real-time Webhook Integration',
    endpoint: 'POST /api/v1/webhooks',
    request: locale === 'vi'
      ? `// Đăng ký webhook để đẩy dữ liệu email/OTP lập tức sang máy chủ của bạn
fetch('https://tmailcc.app/api/v1/webhooks', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer tmail_key_example...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://webhook.myserver.com/tmail-receiver',
    events: ['email.received', 'otp.detected'] // Kích hoạt khi có mail hoặc phát hiện OTP
  })
})`
      : `// Register a webhook to push email/OTP data immediately to your server
fetch('https://tmailcc.app/api/v1/webhooks', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer tmail_key_example...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://webhook.myserver.com/tmail-receiver',
    events: ['email.received', 'otp.detected'] // Triggered on email received or OTP detected
  })
})`,
    response: `{
  "success": true,
  "data": {
    "id": "webhook_sub_uuid_4433",
    "url": "https://webhook.myserver.com/tmail-receiver",
    "events": ["email.received", "otp.detected"],
    "status": "active"
  }
}`
  }
});

const LANDING_TRANSLATIONS = {
  vi: {
    about: 'Về Chúng Tôi',
    otp: 'Giải Mã OTP & 2FA',
    api: 'Tài Liệu API',
    plans: 'Bảng Giá',
    launchApp: 'Vào Ứng Dụng',
    heroBadge: 'HỘP THƯ TẬP TRUNG · CUSTOM DOMAIN VÔ HẠN · DEV API',
    heroSub: 'PLATFORM NHẬN MAIL TẬP TRUNG & TÊN MIỀN RIÊNG',
    heroDesc: 'Gom toàn bộ Gmail về một nơi nhận thư tập trung. Tạo không giới hạn email ảo trên domain riêng sử dụng lâu dài. Tích hợp sâu Dotmail, trích xuất OTP tự động và Webhook thông báo thời gian thực cho developer.',
    heroWork: 'Vào Không Gian Làm Việc',
    heroOtp: 'Nhận OTP & 2FA',
    heroDocs: 'Tài Liệu API & Webhook',
    featuresTitle: 'Giải Pháp Quản Trị Email Toàn Diện',
    feature1Title: 'Nhận thư tập trung (Gmail Hub)',
    feature1Desc: 'Gom toàn bộ các tài khoản Gmail của bạn vào một giao diện duy nhất để nhận và đọc thư đồng thời. Đăng nhập Gmail cực kỳ an toàn bằng mật khẩu ứng dụng (App Password), không sợ bỏ lỡ bất cứ hòm thư nào.',
    feature2Title: 'Custom domain vô hạn',
    feature2Desc: 'Kết nối tên miền riêng của bạn qua DNS/Cloudflare chỉ trong vài bước. Tạo không giới hạn số lượng email ảo với thời gian lưu trữ lâu dài bền bỉ, chạy ổn định trọn đời.',
    feature3Title: 'Sinh dotmail thông minh',
    feature3Desc: 'Tạo hàng ngàn biến thể email dạng dấu chấm (.) từ tài khoản Gmail gốc của bạn. Tất cả email gửi đến các địa chỉ dotmail này đều tự động hội tụ về một hộp thư mẹ duy nhất trên hệ thống.',
    feature4Title: 'Tự động trích xuất OTP',
    feature4Desc: 'Sở hữu endpoint lấy OTP riêng biệt. Thuật toán thông minh của tmailCC tự động nhận diện, tách lọc và trích xuất mã OTP từ nội dung thư gửi đến tức thì, giúp bạn kích hoạt tài khoản cực kỳ nhanh chóng.',
    feature5Title: 'Developer API & Webhooks',
    feature5Desc: 'Cung cấp các API Key đầy đủ scopes phân quyền. Đăng ký Webhook để nhận thông báo đẩy thời gian thực sang máy chủ của bạn ngay khi có thư hoặc mã OTP mới phát sinh.',
    apiIntegration: 'TÍCH HỢP HỆ THỐNG',
    apiTitle: 'API Hiệu Năng Cao Cho Lập Trình Viên',
    apiDesc: 'Xây dựng và tự động hóa quy trình làm việc bằng cách tích hợp trực tiếp với API của tmailCC. Đầy đủ các endpoint quản lý tài khoản Gmail Hub, sinh dotmail, lắng nghe OTP và xử lý Webhooks.',
    apiFeat1Title: 'Xác Thực API Key An Toàn',
    apiFeat1Desc: 'Cấp khóa API chi tiết phân quyền scope rõ ràng để bảo vệ và giám sát lưu lượng.',
    apiFeat2Title: 'Quét & Trích Xuất OTP Riêng Biệt',
    apiFeat2Desc: 'Endpoint trích xuất mã OTP tức thời mà không cần đọc toàn bộ nội dung thư thô.',
    apiFeat3Title: 'Đồng Bộ Nhận Thư Tập Trung & Webhooks',
    apiFeat3Desc: 'Đăng ký URL Webhook để máy chủ của bạn nhận dữ liệu thư mới theo thời gian thực.',
    apiViewFull: 'Xem API Guide Toàn Diện',
    pricingTitle: 'Lựa Chọn Gói Dịch Vụ Của Bạn',
    pricingDesc: 'Các gói dịch vụ được thiết kế linh hoạt phù hợp với nhu cầu sử dụng cá nhân hoặc quy mô hệ thống doanh nghiệp lớn.',
    pricingHide: 'Ẩn Gói Dịch Vụ',
    pricingShow: 'Hiển Thị Gói Dịch Vụ',
    plan1Name: 'Cơ Bản (Free)',
    plan1Price: '0đ',
    plan1Sub: '/ tháng',
    plan1Desc: 'Phù hợp nhu cầu cá nhân hoặc thử nghiệm sản phẩm.',
    plan1Feat1: '5 email ảo tạo đồng thời',
    plan1Feat2: 'Hộp thư tập trung (tối đa 1 Gmail)',
    plan1Feat3: 'Lưu trữ thư trong 24 giờ',
    plan1Feat4: 'Hỗ trợ domain hệ thống có sẵn',
    plan1Feat5: 'Tốc độ API cơ bản (60 requests/phút)',
    plan1Btn: 'Bắt Đầu Ngay',
    plan2Name: 'Nâng Cao (Pro)',
    plan2Price: '99k',
    plan2Sub: '/ tháng',
    plan2Desc: 'Dành cho cá nhân chuyên nghiệp và nhà phát triển ứng dụng.',
    plan2Feat1: 'Không giới hạn email ảo & domain riêng',
    plan2Feat2: 'Hộp thư tập trung (tối đa 5 Gmail)',
    plan2Feat3: 'Tự động sinh dotmail dấu chấm',
    plan2Feat4: 'Lưu trữ thư lên tới 7 ngày',
    plan2Feat5: 'OTP tự động & Webhook thời gian thực',
    plan2Feat6: 'Tốc độ API cao (180 requests/phút)',
    plan2Btn: 'Đăng Ký Ngay',
    plan3Name: 'Doanh Nghiệp',
    plan3Price: 'Liên Hệ',
    plan3Sub: '/ tháng',
    plan3Desc: 'Tối ưu cho doanh nghiệp có lượng yêu cầu lớn và tự động hóa.',
    plan3Feat1: 'Đầy đủ tính năng gói Pro',
    plan3Feat2: 'Tích hợp Dotmail & Gmail Hub không giới hạn',
    plan3Feat3: 'IMAP fetcher hiệu năng cao trích xuất OTP',
    plan3Feat4: 'API Key chuyên dụng không giới hạn rate limit',
    plan3Feat5: 'Hỗ trợ kỹ thuật 24/7 trực tiếp',
    plan3Btn: 'Liên Hệ Hỗ Trợ (Telegram)',
    footerText: '© 2026 tmailCC. Bản quyền nghệ thuật và giải pháp thư điện tử tự động hóa thuộc về Kaih Co.uk.',
    docs: 'Tài Liệu:',
    support: 'Hỗ Trợ:',
    themeLight: 'Chuyển sang chế độ sáng',
    themeDark: 'Chuyển sang chế độ tối',
    langVi: 'Tiếng Việt',
    langEn: 'English',
    modeLight: 'Chế độ sáng',
    modeDark: 'Chế độ tối',
    tabEmailDomain: 'Email & Domain',
    tabGmailHub: 'Gmail Hub',
    tabDotmail: 'Dotmail',
    tabOtp: 'Lấy OTP',
    tabWebhook: 'Webhook API',
    closeMenu: 'Đóng menu',
    openMenu: 'Mở menu',
  },
  en: {
    about: 'About Us',
    otp: 'OTP & 2FA Decoder',
    api: 'API Docs',
    plans: 'Pricing',
    launchApp: 'Launch App',
    heroBadge: 'CENTRALIZED INBOX · UNLIMITED CUSTOM DOMAIN · DEV API',
    heroSub: 'CENTRALIZED EMAIL HUB & CUSTOM DOMAINS',
    heroDesc: 'Consolidate all Gmail accounts into a single centralized inbox. Create unlimited virtual email addresses on custom domains for long-term use. Deep Dotmail integration, automated OTP extraction, and real-time Webhooks for developers.',
    heroWork: 'Go to Workspace',
    heroOtp: 'Receive OTP & 2FA',
    heroDocs: 'API & Webhook Docs',
    featuresTitle: 'Comprehensive Email Management Solution',
    feature1Title: 'Centralized Inbox (Gmail Hub)',
    feature1Desc: 'Consolidate all your Gmail accounts into a single interface to receive and read emails simultaneously. Securely sign in to Gmail using App Passwords, never miss any message.',
    feature2Title: 'Unlimited Custom Domains',
    feature2Desc: 'Connect your custom domain via DNS/Cloudflare in just a few steps. Create unlimited virtual email addresses with long-term storage, running stable for life.',
    feature3Title: 'Smart Dotmail Generation',
    feature3Desc: 'Generate thousands of dot (.) email variations from your primary Gmail account. All emails sent to these dotmail addresses are automatically aggregated into a single parent inbox.',
    feature4Title: 'Automated OTP Extraction',
    feature4Desc: 'Access dedicated OTP retrieval endpoints. The smart algorithm automatically detects and extracts OTP codes from incoming emails, helping you verify accounts instantly.',
    feature5Title: 'Developer API & Webhooks',
    feature5Desc: 'Get custom API keys with full scopes. Register webhooks to receive real-time push notifications on your server when new emails or OTP codes are received.',
    apiIntegration: 'SYSTEM INTEGRATION',
    apiTitle: 'High-Performance API For Developers',
    apiDesc: 'Build and automate your workflow by integrating directly with the tmailCC API. Complete endpoints for Gmail Hub, dotmail generation, OTP retrieval, and Webhook management.',
    apiFeat1Title: 'Secure API Key Authentication',
    apiFeat1Desc: 'Generate API keys with specific scopes to protect and monitor your traffic.',
    apiFeat2Title: 'Dedicated OTP Scan & Extraction',
    apiFeat2Desc: 'Retrieve OTP codes instantly without reading the entire raw email body.',
    apiFeat3Title: 'Centralized Email & Webhooks Sync',
    apiFeat3Desc: 'Register Webhook URLs for your server to receive new email events in real-time.',
    apiViewFull: 'View Full API Guide',
    pricingTitle: 'Choose Your Pricing Plan',
    pricingDesc: 'Flexible pricing plans designed to fit personal needs or large-scale enterprise systems.',
    pricingHide: 'Hide Pricing Plans',
    pricingShow: 'Show Pricing Plans',
    plan1Name: 'Basic (Free)',
    plan1Price: '$0',
    plan1Sub: '/ month',
    plan1Desc: 'Suitable for personal use or product testing.',
    plan1Feat1: '5 concurrent virtual emails',
    plan1Feat2: 'Centralized inbox (max 1 Gmail)',
    plan1Feat3: 'Store emails for 24 hours',
    plan1Feat4: 'Support available system domains',
    plan1Feat5: 'Basic API limit (60 requests/min)',
    plan1Btn: 'Start Now',
    plan2Name: 'Advanced (Pro)',
    plan2Price: '$4',
    plan2Sub: '/ month',
    plan2Desc: 'For professional individuals and app developers.',
    plan2Feat1: 'Unlimited virtual emails & custom domains',
    plan2Feat2: 'Centralized inbox (max 5 Gmail)',
    plan2Feat3: 'Auto-generate dot emails',
    plan2Feat4: 'Store emails for up to 7 days',
    plan2Feat5: 'Auto OTP & real-time Webhook',
    plan2Feat6: 'High API limit (180 requests/min)',
    plan2Btn: 'Register Now',
    plan3Name: 'Enterprise',
    plan3Price: 'Contact',
    plan3Sub: '/ month',
    plan3Desc: 'Optimized for enterprises with high request volume and automation.',
    plan3Feat1: 'All features of Pro plan',
    plan3Feat2: 'Unlimited Dotmail & Gmail Hub integration',
    plan3Feat3: 'High-performance IMAP fetcher for OTP',
    plan3Feat4: 'Dedicated API Key with no rate limits',
    plan3Feat5: 'Direct 24/7 technical support',
    plan3Btn: 'Contact Support (Telegram)',
    footerText: '© 2026 tmailCC. Artistic design and automated email solutions by Kaih Co.uk.',
    docs: 'Docs:',
    support: 'Support:',
    themeLight: 'Switch to light mode',
    themeDark: 'Switch to dark mode',
    langVi: 'Vietnamese',
    langEn: 'English',
    modeLight: 'Light Mode',
    modeDark: 'Dark Mode',
    tabEmailDomain: 'Email & Domain',
    tabGmailHub: 'Gmail Hub',
    tabDotmail: 'Dotmail',
    tabOtp: 'Retrieve OTP',
    tabWebhook: 'Webhook API',
    closeMenu: 'Close menu',
    openMenu: 'Open menu',
  }
};

type SnippetKey = 'createAccount' | 'gmailHub' | 'dotmail' | 'otpApi' | 'webhook';

export default function LandingClient() {
  const [locale, setLocale] = useState<'vi' | 'en'>('vi');
  const [activeTab, setActiveTab] = useState<SnippetKey>('createAccount');
  const [showPlans, setShowPlans] = useState(false);
  const [floatingParticles, setFloatingParticles] = useState<{ id: number; left: number; delay: number; scale: number; speed: number; bottom: number }[]>([]);
  const [darkMode, setDarkMode] = useState(true);
  const [themeLoaded, setThemeLoaded] = useState(false);
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({ left: 0, width: 0, opacity: 0 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const storedLocale = localStorage.getItem('tmail_locale');
    if (storedLocale === 'en' || storedLocale === 'vi') {
      setLocale(storedLocale as 'vi' | 'en');
    }
  }, []);

  const handleToggleLocale = () => {
    const nextLocale = locale === 'vi' ? 'en' : 'vi';
    setLocale(nextLocale);
    localStorage.setItem('tmail_locale', nextLocale);
  };

  const t = (key: keyof typeof LANDING_TRANSLATIONS.vi) => {
    return LANDING_TRANSLATIONS[locale][key] || LANDING_TRANSLATIONS.vi[key] || '';
  };

  const codeSnippets = getCodeSnippets(locale);

  useEffect(() => {
    const updateIndicator = () => {
      const activeEl = document.querySelector('.api-console-tab.active') as HTMLElement;
      if (activeEl) {
        setIndicatorStyle({
          left: activeEl.offsetLeft,
          width: activeEl.offsetWidth,
          opacity: 1
        });
      }
    };

    updateIndicator();
    
    // Add a slight delay for initial layout load
    const timer = setTimeout(updateIndicator, 50);

    window.addEventListener('resize', updateIndicator);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateIndicator);
    };
  }, [activeTab]);

  useEffect(() => {
    const saved = localStorage.getItem('tmail_darkMode');
    let isDark = true;
    if (saved !== null) {
      isDark = saved === 'true';
    } else {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    setDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    setThemeLoaded(true);
  }, []);

  useEffect(() => {
    if (!themeLoaded) return;
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('tmail_darkMode', String(darkMode));
  }, [darkMode, themeLoaded]);

  useEffect(() => {
    // Generate random coordinates for floating cyber data packets
    const particles = Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 8,
      scale: Math.random() * 0.8 + 0.4,
      speed: Math.random() * 6 + 4,
      bottom: Math.random() * 80 + 20
    }));
    setFloatingParticles(particles);
  }, []);

  useEffect(() => {
    // Scroll reveal animation observer
    if (typeof window === 'undefined') return;

    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -80px 0px', // Trigger slightly before entering the full viewport for a better feel
      threshold: 0.05,
    };

    const handleIntersect = (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersect, observerOptions);
    const revealElements = document.querySelectorAll('.scroll-reveal');
    revealElements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, []);

  const [appUrl, setAppUrl] = useState('https://tmailcc.app');

  useEffect(() => {
    setAppUrl(window.location.origin || 'https://tmailcc.app');
  }, []);

  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: locale === 'vi' ? 'Cách sử dụng tmailCC - Nhận email tập trung' : 'How to use tmailCC - Centralized Inbox',
    description: locale === 'vi' 
      ? 'Hướng dẫn từng bước cách tạo email tạm thời, kết nối Gmail Hub, và lấy mã OTP tự động trên tmailCC.'
      : 'Step-by-step guide on how to create temporary emails, connect Gmail Hub, and retrieve OTP codes automatically on tmailCC.',
    totalTime: 'PT2M',
    step: [
      { '@type': 'HowToStep', name: locale === 'vi' ? 'Bước 1: Truy cập tmailCC' : 'Step 1: Access tmailCC', text: locale === 'vi' ? 'Truy cập tmailcc.app và đăng nhập hoặc sử dụng trực tiếp mà không cần đăng ký.' : 'Go to tmailcc.app and sign in or use directly as guest.', url: appUrl },
      { '@type': 'HowToStep', name: locale === 'vi' ? 'Bước 2: Tạo email ảo' : 'Step 2: Create virtual email', text: locale === 'vi' ? 'Chọn tên miền từ danh sách có sẵn hoặc thêm tên miền riêng của bạn, nhập địa chỉ email bạn muốn và nhấn Tạo.' : 'Choose a domain from the list or add your own, enter your desired email address, and click Create.', url: `${appUrl}/app` },
      { '@type': 'HowToStep', name: locale === 'vi' ? 'Bước 3: Nhận email' : 'Step 3: Receive email', text: locale === 'vi' ? 'Sử dụng địa chỉ email vừa tạo để đăng ký dịch vụ. Email sẽ đến hộp thư tmailCC theo thời gian thực.' : 'Use the created email to sign up for services. Emails will arrive at tmailCC in real-time.', url: `${appUrl}/app` },
      { '@type': 'HowToStep', name: locale === 'vi' ? 'Bước 4: Lấy mã OTP (tùy chọn)' : 'Step 4: Retrieve OTP code (optional)', text: locale === 'vi' ? 'Nếu cần xác minh OTP, sử dụng trang OTP hoặc API endpoint để nhận mã tự động.' : 'If OTP verification is needed, use the OTP page or API endpoint to retrieve the code automatically.', url: `${appUrl}/otp` },
    ],
  };

  return (
    <>
      {/* HowTo JSON-LD injected at client level */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <div className="landing-body bg-rice-paper-texture bg-seigaiha">
        {/* HEADER NAVBAR */}
        <header className="sticky top-0 z-[100] w-full px-6 py-4 transition-all duration-300">
          {/* Logo + Desktop Nav + Desktop Buttons */}
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            
            <div className="flex items-center gap-2">
              <span className="text-[var(--jp-gold)] flex items-center">
                <SvgMailIcon />
              </span>
              <span className="font-semibold text-lg tracking-wider text-[var(--jp-foam)]" style={{ fontFamily: 'var(--font-jp-heading)' }}>
                tmail<span className="text-[var(--jp-gold)]">CC</span>
              </span>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
              <a href="#about" className="hover:text-[var(--jp-gold)] hover:underline underline-offset-4 transition-colors">{t('about')}</a>
              <Link href="/otp" className="hover:text-[var(--jp-gold)] hover:underline underline-offset-4 transition-colors">{t('otp')}</Link>
              <a href="#api" className="hover:text-[var(--jp-gold)] hover:underline underline-offset-4 transition-colors">{t('api')}</a>
              <a href="#plans" className="hover:text-[var(--jp-gold)] hover:underline underline-offset-4 transition-colors" onClick={(e) => {
                e.preventDefault();
                setShowPlans(true);
                const el = document.getElementById('plans');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}>{t('plans')}</a>
            </nav>

            {/* Desktop Buttons */}
            <div className="hidden md:flex items-center gap-4">
              {/* Language switcher button */}
              <button 
                className="flex items-center justify-center font-bold text-xs cursor-pointer transition-all duration-150"
                onClick={handleToggleLocale}
                style={{
                  width: '36px',
                  height: '36px',
                  border: '1px solid var(--glass-border)',
                  background: 'transparent',
                  color: 'var(--jp-gold)',
                  letterSpacing: '0.5px'
                }}
                title={locale === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
              >
                {locale === 'vi' ? 'EN' : 'VI'}
              </button>

              {/* Theme toggle button */}
              <button 
                className="flex items-center justify-center cursor-pointer transition-all duration-150"
                onClick={() => setDarkMode(!darkMode)}
                style={{
                  width: '36px',
                  height: '36px',
                  border: '1px solid var(--glass-border)',
                  background: 'transparent',
                  color: 'var(--jp-gold)'
                }}
                title={darkMode ? t('themeLight') : t('themeDark')}
              >
                {darkMode ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
                    <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>

              <Link href="/app" className="jp-btn jp-btn-primary">
                {t('launchApp')}
              </Link>
            </div>

        </div>
      </header>

      {/* Mobile Nav Toggle Button (floating, outside header flow) */}
      <div className="md:hidden fixed top-4 right-4 z-[150]">
        <button
          className="flex items-center justify-center rounded transition-all duration-150"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          title={mobileMenuOpen ? t('closeMenu') : t('openMenu')}
          aria-label={mobileMenuOpen ? t('closeMenu') : t('openMenu')}
          style={{ color: 'var(--jp-gold)', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', cursor: 'pointer', width: 38, height: 38, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
        >
          {mobileMenuOpen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" strokeWidth="2" strokeLinecap="round"/>
              <line x1="6" y1="6" x2="18" y2="18" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-[140] bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed top-16 right-4 z-[145]"
          style={{ border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
        >
          <nav className="flex flex-col py-3">
            <a href="#about" className="px-6 py-3 text-sm font-medium hover:text-[var(--jp-gold)] transition-colors border-b border-[var(--glass-border)]" onClick={() => setMobileMenuOpen(false)}>{t('about')}</a>
            <Link href="/otp" className="px-6 py-3 text-sm font-medium hover:text-[var(--jp-gold)] transition-colors border-b border-[var(--glass-border)]" onClick={() => setMobileMenuOpen(false)}>{t('otp')}</Link>
            <a href="#api" className="px-6 py-3 text-sm font-medium hover:text-[var(--jp-gold)] transition-colors border-b border-[var(--glass-border)]" onClick={() => setMobileMenuOpen(false)}>{t('api')}</a>
            <a href="#plans" className="px-6 py-3 text-sm font-medium hover:text-[var(--jp-gold)] transition-colors border-b border-[var(--glass-border)]" onClick={(e) => { e.preventDefault(); setShowPlans(true); setMobileMenuOpen(false); const el = document.getElementById('plans'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }}>{t('plans')}</a>
            <Link href="/app" className="px-6 py-3 text-sm font-medium hover:text-[var(--jp-gold)] transition-colors border-b border-[var(--glass-border)]" onClick={() => setMobileMenuOpen(false)}>{t('launchApp')}</Link>
            
            {/* Mobile Language Toggle */}
            <div className="flex items-center gap-3 px-6 py-3 border-b border-[var(--glass-border)]">
              <button
                className="flex items-center justify-center font-bold text-xs cursor-pointer transition-all"
                style={{ border: '1px solid var(--glass-border)', color: 'var(--jp-gold)', background: 'transparent', width: 32, height: 32 }}
                onClick={() => { handleToggleLocale(); setMobileMenuOpen(false); }}
                title={locale === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
              >
                {locale === 'vi' ? 'EN' : 'VI'}
              </button>
              <span className="text-xs text-[var(--jp-cyan)]">{locale === 'vi' ? t('langVi') : t('langEn')}</span>
            </div>

            {/* Mobile Theme Toggle */}
            <div className="flex items-center gap-3 px-6 py-3">
              <button
                className="p-2 rounded transition-all"
                style={{ border: '1px solid var(--glass-border)', color: 'var(--jp-gold)', background: 'transparent', cursor: 'pointer', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => { setDarkMode(!darkMode); setMobileMenuOpen(false); }}
                title={darkMode ? t('themeLight') : t('themeDark')}
              >
                {darkMode ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
                    <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
              <span className="text-xs text-[var(--jp-cyan)]">{darkMode ? t('modeDark') : t('modeLight')}</span>
            </div>
          </nav>
        </div>
      )}

      {/* HERO SECTION */}
      <section className="relative pt-20 pb-0 overflow-hidden flex flex-col items-center justify-between min-h-[85vh] bg-[var(--jp-navy)]">
        <div className="max-w-6xl mx-auto px-6 text-center z-20 flex-1 flex flex-col justify-center items-center">
          <div className="scroll-reveal reveal-slide-up duration-800 inline-flex items-center gap-2 px-4 py-1.5 border border-[var(--glass-border)] text-[var(--jp-foam)] text-xs font-bold uppercase tracking-widest mb-8 font-mono">
            <SvgZapIcon /> {t('heroBadge')}
          </div>
          
          <h1 className="scroll-reveal reveal-slide-up delay-200 duration-800 text-5xl lg:text-7xl xl:text-8xl font-black mb-8 text-[var(--jp-foam)] max-w-5xl tracking-tighter leading-none uppercase" style={{ fontFamily: 'var(--font-jp-display)' }}>
            TMAIL<span className="text-[var(--jp-foam)] italic font-normal">CC</span>
            <span className="block text-sm md:text-base font-bold tracking-[0.3em] mt-6 font-mono text-[var(--text-secondary)]">{t('heroSub')}</span>
          </h1>

          <p className="scroll-reveal reveal-slide-up delay-300 duration-800 text-base md:text-xl text-[var(--jp-foam)] max-w-3xl mb-12 leading-relaxed font-normal opacity-90">
            {t('heroDesc')}
          </p>

          <div className="scroll-reveal reveal-slide-up delay-400 duration-800 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/app" className="jp-btn jp-btn-primary px-8 py-3.5 text-base">
              {t('heroWork')}
            </Link>
            <Link href="/otp" className="jp-btn jp-btn-secondary px-8 py-3.5 text-base" style={{ border: '1px solid var(--jp-gold)', color: 'var(--jp-gold)' }}>
              {t('heroOtp')}
            </Link>
            <a href="#api" className="jp-btn jp-btn-secondary px-8 py-3.5 text-base" style={{ opacity: 0.85 }}>
              {t('heroDocs')}
            </a>
          </div>
        </div>

        {/* HERO DECORATIVE RULE WITH GEOMETRIC PUNCTUATION */}
        <div className="w-full max-w-7xl mx-auto px-6 mt-20 relative flex items-center justify-center">
          <div className="w-full h-[4px] bg-[var(--glass-border)]"></div>
          <div className="absolute w-6 h-6 bg-[var(--jp-navy)] border-4 border-[var(--glass-border)] rotate-45 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-[var(--glass-border)]"></div>
          </div>
        </div>
      </section>

      {/* WAVE SECTION BORDER TRANSITION */}
      <div className="w-full h-[4px] bg-[var(--glass-border)]"></div>

      {/* CORE FEATURES SECTION */}
      <section id="about" className="py-24 max-w-7xl mx-auto px-6 relative">
        <div className="scroll-reveal reveal-slide-up duration-800 text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[var(--jp-foam)]" style={{ fontFamily: 'var(--font-jp-display)' }}>
            {t('featuresTitle')}
          </h2>
          <div className="h-1 w-24 bg-[var(--glass-border)] mx-auto"></div>
        </div>

        <div className="flex flex-wrap justify-center gap-8">
          
          <div className="scroll-reveal reveal-slide-up delay-100 duration-800 jp-card p-8 w-full md:w-[calc(50%-16px)] lg:w-[calc(33.333%-22px)]">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 border border-[var(--glass-border)] flex items-center justify-center text-[var(--jp-foam)] flex-shrink-0">
                <SvgHubIcon />
              </div>
              <h3 className="text-xl font-semibold text-[var(--jp-foam)] normal-case" style={{ fontFamily: 'var(--font-jp-display)', textTransform: 'none' }}>
                {t('feature1Title')}
              </h3>
            </div>
            <p className="text-[var(--jp-foam)] text-sm leading-relaxed font-normal opacity-90 drop-cap">
              {t('feature1Desc')}
            </p>
          </div>

          <div className="scroll-reveal reveal-slide-up delay-200 duration-800 jp-card p-8 w-full md:w-[calc(50%-16px)] lg:w-[calc(33.333%-22px)]">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 border border-[var(--glass-border)] flex items-center justify-center text-[var(--jp-foam)] flex-shrink-0">
                <SvgGlobeIcon />
              </div>
              <h3 className="text-xl font-semibold text-[var(--jp-foam)] normal-case" style={{ fontFamily: 'var(--font-jp-display)', textTransform: 'none' }}>
                {t('feature2Title')}
              </h3>
            </div>
            <p className="text-[var(--jp-foam)] text-sm leading-relaxed font-normal opacity-90">
              {t('feature2Desc')}
            </p>
          </div>

          <div className="scroll-reveal reveal-slide-up delay-300 duration-800 jp-card p-8 w-full md:w-[calc(50%-16px)] lg:w-[calc(33.333%-22px)]">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 border border-[var(--glass-border)] flex items-center justify-center text-[var(--jp-foam)] flex-shrink-0">
                <SvgDotIcon />
              </div>
              <h3 className="text-xl font-semibold text-[var(--jp-foam)] normal-case" style={{ fontFamily: 'var(--font-jp-display)', textTransform: 'none' }}>
                {t('feature3Title')}
              </h3>
            </div>
            <p className="text-[var(--jp-foam)] text-sm leading-relaxed font-normal opacity-90">
              {t('feature3Desc')}
            </p>
          </div>

          <div className="scroll-reveal reveal-slide-up delay-400 duration-800 jp-card p-8 w-full md:w-[calc(50%-16px)] lg:w-[calc(33.333%-22px)]">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 border border-[var(--glass-border)] flex items-center justify-center text-[var(--jp-foam)] flex-shrink-0">
                <SvgOtpIcon />
              </div>
              <h3 className="text-xl font-semibold text-[var(--jp-foam)] normal-case" style={{ fontFamily: 'var(--font-jp-display)', textTransform: 'none' }}>
                {t('feature4Title')}
              </h3>
            </div>
            <p className="text-[var(--jp-foam)] text-sm leading-relaxed font-normal opacity-90">
              {t('feature4Desc')}
            </p>
          </div>

          <div className="scroll-reveal reveal-slide-up delay-500 duration-800 jp-card p-8 w-full md:w-[calc(50%-16px)] lg:w-[calc(33.333%-22px)]">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 border border-[var(--glass-border)] flex items-center justify-center text-[var(--jp-foam)] flex-shrink-0">
                <SvgWebhookIcon />
              </div>
              <h3 className="text-xl font-semibold text-[var(--jp-foam)] normal-case" style={{ fontFamily: 'var(--font-jp-display)', textTransform: 'none' }}>
                {t('feature5Title')}
              </h3>
            </div>
            <p className="text-[var(--jp-foam)] text-sm leading-relaxed font-normal opacity-90">
              {t('feature5Desc')}
            </p>
          </div>

        </div>
      </section>

      {/* WAVE SECTION BORDER TRANSITION */}
      <div className="w-full h-[4px] bg-[var(--glass-border)]"></div>

      {/* API GUIDANCE SECTION */}
      <section id="api" className="py-24 bg-[var(--jp-navy)] relative bg-seigaiha border-b-4 border-[var(--glass-border)]">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="scroll-reveal reveal-slide-right duration-1000 lg:col-span-5">
              <div className="inline-block px-4 py-1.5 border border-[var(--glass-border)] text-[var(--jp-foam)] text-xs font-bold uppercase tracking-widest mb-4 font-mono">
                {t('apiIntegration')}
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-[var(--jp-foam)]" style={{ fontFamily: 'var(--font-jp-display)' }}>
                {t('apiTitle')}
              </h2>
              <p className="text-[var(--jp-foam)] text-sm md:text-base leading-relaxed mb-6 font-normal opacity-90">
                {t('apiDesc')}
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 border border-[var(--glass-border)] flex items-center justify-center text-[var(--jp-foam)] mt-1 flex-shrink-0">
                    <SvgCheckIcon />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--jp-foam)]">{t('apiFeat1Title')}</h4>
                    <p className="text-xs text-[var(--text-muted)]">{t('apiFeat1Desc')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 border border-[var(--glass-border)] flex items-center justify-center text-[var(--jp-foam)] mt-1 flex-shrink-0">
                    <SvgCheckIcon />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--jp-foam)]">{t('apiFeat2Title')}</h4>
                    <p className="text-xs text-[var(--text-muted)]">{t('apiFeat2Desc')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 border border-[var(--glass-border)] flex items-center justify-center text-[var(--jp-foam)] mt-1 flex-shrink-0">
                    <SvgCheckIcon />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--jp-foam)]">{t('apiFeat3Title')}</h4>
                    <p className="text-xs text-[var(--text-muted)]">{t('apiFeat3Desc')}</p>
                  </div>
                </div>
              </div>

              <Link href="/docs/api-guide.md" className="jp-btn jp-btn-primary">
                {t('apiViewFull')} <SvgArrowRightIcon />
              </Link>
            </div>

            {/* Interactive API Console Mockup */}
            <div className="scroll-reveal reveal-slide-left duration-1000 api-console lg:col-span-7 w-full">
              <div className="api-console-header">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-none border border-[var(--glass-border)] bg-transparent"></span>
                  <span className="w-2.5 h-2.5 rounded-none border border-[var(--glass-border)] bg-transparent"></span>
                  <span className="w-2.5 h-2.5 rounded-none border border-[var(--glass-border)] bg-transparent"></span>
                  <span className="text-xs text-[var(--text-muted)] font-mono ml-2">api-console.sh</span>
                </div>
                <span className="text-[9px] text-[var(--jp-foam)] border border-[var(--glass-border)] px-2 py-0.5 rounded-none font-mono uppercase">
                  HTTPS
                </span>
              </div>
              
              <div className="relative flex bg-[var(--jp-ocean)] border-b-2 border-[var(--glass-border)] px-2 overflow-x-auto">
                <button 
                  onClick={() => setActiveTab('createAccount')}
                  className={`api-console-tab ${activeTab === 'createAccount' ? 'active' : ''}`}
                >
                  {t('tabEmailDomain')}
                </button>
                <button 
                  onClick={() => setActiveTab('gmailHub')}
                  className={`api-console-tab ${activeTab === 'gmailHub' ? 'active' : ''}`}
                >
                  {t('tabGmailHub')}
                </button>
                <button 
                  onClick={() => setActiveTab('dotmail')}
                  className={`api-console-tab ${activeTab === 'dotmail' ? 'active' : ''}`}
                >
                  {t('tabDotmail')}
                </button>
                <button 
                  onClick={() => setActiveTab('otpApi')}
                  className={`api-console-tab ${activeTab === 'otpApi' ? 'active' : ''}`}
                >
                  {t('tabOtp')}
                </button>
                <button 
                  onClick={() => setActiveTab('webhook')}
                  className={`api-console-tab ${activeTab === 'webhook' ? 'active' : ''}`}
                >
                  {t('tabWebhook')}
                </button>
                <div 
                  className="api-console-tab-indicator" 
                  style={indicatorStyle}
                />
              </div>

              <div className="api-console-body jp-scroll">
                <div key={activeTab} className="animate-fade-in-up">
                  <div className="text-[var(--text-muted)] mb-2 font-mono">{"// Endpoint: "}{codeSnippets[activeTab].endpoint}</div>
                  <pre className="text-[var(--jp-foam)] font-mono text-[11px] md:text-[13px] leading-relaxed whitespace-pre-wrap">
                    {codeSnippets[activeTab].request}
                  </pre>
                  
                  <div className="api-console-response">
                    <div className="text-[var(--text-muted)] mb-1 font-mono">{"// Response: 200 OK"}</div>
                    <pre className="text-[var(--text-secondary)] font-mono text-[11px] md:text-[13px] leading-relaxed whitespace-pre-wrap">
                      {codeSnippets[activeTab].response}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* WAVE SECTION BORDER TRANSITION */}
      <div className="w-full h-[4px] bg-[var(--glass-border)]"></div>

      {/* ACCOUNT PLANS & PRICING */}
      <section id="plans" className="py-24 max-w-7xl mx-auto px-6 relative bg-[var(--jp-navy)]">
        <div className="scroll-reveal reveal-slide-up duration-800 text-center mb-8">
          <div className="inline-block px-4 py-1.5 border border-[var(--glass-border)] text-[var(--jp-foam)] text-xs font-bold uppercase tracking-widest mb-4 font-mono">
            {t('plans')}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[var(--jp-foam)]" style={{ fontFamily: 'var(--font-jp-display)' }}>
            {t('pricingTitle')}
          </h2>
          <p className="text-[var(--jp-foam)] text-sm max-w-lg mx-auto font-normal opacity-90 leading-relaxed">
            {t('pricingDesc')}
          </p>
        </div>

        <div className="scroll-reveal reveal-slide-up delay-200 duration-800 plan-toggle-container">
          <button 
            onClick={() => setShowPlans(!showPlans)} 
            className="jp-btn jp-btn-secondary flex items-center gap-2"
          >
            {showPlans ? t('pricingHide') : t('pricingShow')}
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              className={`transform transition-transform duration-300 ${showPlans ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        <div className={`plans-drawer ${showPlans ? 'open' : ''}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            
            {/* PLAN 1 */}
            <div className="plan-card">
              <h3 className="text-lg font-bold text-[var(--jp-foam)] mb-2" style={{ fontFamily: 'var(--font-jp-display)' }}>
                {t('plan1Name')}
              </h3>
              <div className="text-3xl font-extrabold text-[var(--jp-foam)] mb-4" style={{ fontFamily: 'var(--font-jp-heading)' }}>
                {t('plan1Price')} <span className="text-sm text-[var(--text-muted)] font-normal">{t('plan1Sub')}</span>
              </div>
              <p className="text-sm text-[var(--text-muted)] mb-6">{t('plan1Desc')}</p>
              <div className="h-[1px] bg-[var(--glass-border)] mb-6"></div>
              <ul className="plan-features-list text-[var(--text-secondary)] mb-8">
                <li><span className="text-[var(--jp-foam)]"><SvgCheckIcon /></span> {t('plan1Feat1')}</li>
                <li><span className="text-[var(--jp-foam)]"><SvgCheckIcon /></span> {t('plan1Feat2')}</li>
                <li><span className="text-[var(--jp-foam)]"><SvgCheckIcon /></span> {t('plan1Feat3')}</li>
                <li><span className="text-[var(--jp-foam)]"><SvgCheckIcon /></span> {t('plan1Feat4')}</li>
                <li><span className="text-[var(--jp-foam)]"><SvgCheckIcon /></span> {t('plan1Feat5')}</li>
              </ul>
              <Link href="/" className="jp-btn w-full justify-center">
                {t('plan1Btn')}
              </Link>
            </div>

            {/* PLAN 2 (Pro) */}
            <div className="plan-card premium">
              <h3 className="text-lg font-bold text-[var(--jp-foam)] mb-2" style={{ fontFamily: 'var(--font-jp-display)' }}>
                {t('plan2Name')}
              </h3>
              <div className="text-3xl font-extrabold text-[var(--jp-foam)] mb-4" style={{ fontFamily: 'var(--font-jp-heading)' }}>
                {t('plan2Price')} <span className="text-sm text-[var(--jp-foam)] font-normal">{t('plan2Sub')}</span>
              </div>
              <p className="text-sm text-[var(--jp-foam)] mb-6">{t('plan2Desc')}</p>
              <div className="h-[1px] bg-[var(--glass-border)] mb-6"></div>
              <ul className="plan-features-list text-[var(--text-secondary)] mb-8">
                <li><span className="text-[var(--jp-foam)]"><SvgCheckIcon /></span> {t('plan2Feat1')}</li>
                <li><span className="text-[var(--jp-foam)]"><SvgCheckIcon /></span> {t('plan2Feat2')}</li>
                <li><span className="text-[var(--jp-foam)]"><SvgCheckIcon /></span> {t('plan2Feat3')}</li>
                <li><span className="text-[var(--jp-foam)]"><SvgCheckIcon /></span> {t('plan2Feat4')}</li>
                <li><span className="text-[var(--jp-foam)]"><SvgCheckIcon /></span> {t('plan2Feat5')}</li>
                <li><span className="text-[var(--jp-foam)]"><SvgCheckIcon /></span> {t('plan2Feat6')}</li>
              </ul>
              <Link href="/" className="jp-btn jp-btn-primary w-full justify-center">
                {t('plan2Btn')}
              </Link>
            </div>

            {/* PLAN 3 (Enterprise) */}
            <div className="plan-card">
              <h3 className="text-lg font-bold text-[var(--jp-foam)] mb-2" style={{ fontFamily: 'var(--font-jp-display)' }}>
                {t('plan3Name')}
              </h3>
              <div className="text-3xl font-extrabold text-[var(--jp-foam)] mb-4" style={{ fontFamily: 'var(--font-jp-heading)' }}>
                {t('plan3Price')} <span className="text-sm text-[var(--text-muted)] font-normal">{t('plan3Sub')}</span>
              </div>
              <p className="text-sm text-[var(--text-muted)] mb-6">{t('plan3Desc')}</p>
              <div className="h-[1px] bg-[var(--glass-border)] mb-6"></div>
              <ul className="plan-features-list text-[var(--text-secondary)] mb-8">
                <li><span className="text-[var(--jp-foam)]"><SvgCheckIcon /></span> {t('plan3Feat1')}</li>
                <li><span className="text-[var(--jp-foam)]"><SvgCheckIcon /></span> {t('plan3Feat2')}</li>
                <li><span className="text-[var(--jp-foam)]"><SvgCheckIcon /></span> {t('plan3Feat3')}</li>
                <li><span className="text-[var(--jp-foam)]"><SvgCheckIcon /></span> {t('plan3Feat4')}</li>
                <li><span className="text-[var(--jp-foam)]"><SvgCheckIcon /></span> {t('plan3Feat5')}</li>
              </ul>
              <a href="https://t.me/ShopCC_app" target="_blank" rel="noopener noreferrer" className="jp-btn jp-btn-primary w-full justify-center">
                {t('plan3Btn')}
              </a>
            </div>

          </div>
        </div>

      </section>

      {/* FOOTER */}
      <footer className="scroll-reveal reveal-fade duration-1000 border-t-4 border-[var(--glass-border)] py-16 bg-black text-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-start justify-between gap-8">
          
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-white">
                <SvgMailIcon />
              </span>
              <span className="font-semibold text-base tracking-widest text-white uppercase" style={{ fontFamily: 'var(--font-jp-heading)' }}>
                tmail<span className="text-white italic font-normal">CC</span>
              </span>
            </div>
            <p className="text-xs text-white/50 font-light max-w-sm leading-relaxed">
              {t('footerText')}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-semibold uppercase tracking-widest text-white font-mono text-xs">{t('docs')}</span>
            <div className="flex gap-6 text-xs text-white/60 mt-2">
              <a href="/docs/api-guide.md" className="hover:text-white transition-colors">API Guide</a>
              <a href="/docs/developer-api.md" className="hover:text-white transition-colors">Developer API</a>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-semibold uppercase tracking-widest text-white font-mono text-xs">{t('support')}</span>
            <div className="flex gap-4 items-center mt-2">
              <a href="https://t.me/ShopCC_app" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors flex items-center justify-center p-2 border border-white/20 hover:border-white" title="Telegram: @ShopCC_app">
                <SvgTelegramIcon />
              </a>
              <a href="https://zalo.me/0916775071" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors flex items-center justify-center p-2 border border-white/20 hover:border-white" title="Zalo: 0916 775 071">
                <SvgZaloIcon />
              </a>
              <a href="https://facebook.com/inte.kaih.384" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors flex items-center justify-center p-2 border border-white/20 hover:border-white" title="Facebook: inte.kaih.384">
                <SvgFacebookIcon />
              </a>
            </div>
          </div>

        </div>
      </footer>

    </div>
    </>
  );
}
