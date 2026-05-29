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
const CODE_SNIPPETS = {
  createAccount: {
    lang: 'javascript',
    title: 'Tạo Email & Custom Domain',
    endpoint: 'POST /api/v1/accounts',
    request: `// Tạo hộp thư ảo không giới hạn thời gian trên domain riêng của bạn
fetch('https://tmailcc.kaih.co.uk/api/v1/accounts', {
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
})`,
    response: `{
  "success": true,
  "data": {
    "address": "lienhe@tenmienrieng.vn",
    "localPart": "lienhe",
    "domain": "tenmienrieng.vn",
    "expiresAt": null,
    "createdAt": "2026-05-28T20:25:00.000Z"
  }
}`
  },
  gmailHub: {
    lang: 'javascript',
    title: 'Gmail Hub - Nhận Mail Tập Trung',
    endpoint: 'POST /api/v1/gmail/connect',
    request: `// Đăng nhập tài khoản Gmail bằng App Password để nhận email tập trung một nơi
fetch('https://tmailcc.kaih.co.uk/api/v1/gmail/connect', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer tmail_key_example...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    address: 'ungdungkiemtien12@gmail.com',
    appPassword: 'xxxx-yyyy-zzzz-wwww' // Google App Password bảo mật
  })
})`,
    response: `{
  "success": true,
  "data": {
    "id": "gmail_hub_uuid_9988",
    "address": "ungdungkiemtien12@gmail.com",
    "status": "connected",
    "createdAt": "2026-05-28T20:25:00.000Z"
  }
}`
  },
  dotmail: {
    lang: 'javascript',
    title: 'Tạo Dotmail (Biến Thể Dấu Chấm)',
    endpoint: 'POST /api/v1/dotmail/generate',
    request: `// Tự động sinh hàng loạt email dạng dấu chấm (.) từ Gmail gốc đã kết nối
fetch('https://tmailcc.kaih.co.uk/api/v1/dotmail/generate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer tmail_key_example...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    parentId: 'gmail_hub_uuid_9988' // Gmail gốc
  })
})`,
    response: `{
  "success": true,
  "data": {
    "parentAddress": "ungdungkiemtien12@gmail.com",
    "dotmails": [
      "u.ngdungkiemtien12@gmail.com",
      "un.gdungkiemtien12@gmail.com",
      "ung.dungkiemtien12@gmail.com",
      "ungd.ungkiemtien12@gmail.com"
    ],
    "total": 2048 // Tạo tối đa hàng nghìn email dotmail
  }
}`
  },
  otpApi: {
    lang: 'javascript',
    title: 'Truy Xuất Mã OTP Riêng Biệt',
    endpoint: 'GET /api/v1/otp/retrieve',
    request: `// API chuyên dụng trích xuất nhanh mã OTP từ hộp thư tập trung
fetch('https://tmailcc.kaih.co.uk/api/v1/otp/retrieve?address=ungdungkiemtien12@gmail.com', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer tmail_key_example...'
  }
})`,
    response: `{
  "success": true,
  "data": {
    "address": "ungdungkiemtien12@gmail.com",
    "otp": "789120", // Trích xuất chính xác mã OTP bằng thuật toán Regex/AI
    "sender": "noreply@facebook.com",
    "subject": "789120 là mã bảo mật Facebook của bạn",
    "receivedAt": "2026-05-28T20:26:12.000Z"
  }
}`
  },
  webhook: {
    lang: 'javascript',
    title: 'Webhook Tích Hợp Thời Gian Thực',
    endpoint: 'POST /api/v1/webhooks',
    request: `// Đăng ký webhook để đẩy dữ liệu email/OTP lập tức sang máy chủ của bạn
fetch('https://tmailcc.kaih.co.uk/api/v1/webhooks', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer tmail_key_example...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://webhook.myserver.com/tmail-receiver',
    events: ['email.received', 'otp.detected'] // Kích hoạt khi có mail hoặc phát hiện OTP
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
};

export default function LandingClient() {
  const [activeTab, setActiveTab] = useState<keyof typeof CODE_SNIPPETS>('createAccount');
  const [showPlans, setShowPlans] = useState(false);
  const [floatingParticles, setFloatingParticles] = useState<{ id: number; left: number; delay: number; scale: number; speed: number; bottom: number }[]>([]);
  const [darkMode, setDarkMode] = useState(true);
  const [themeLoaded, setThemeLoaded] = useState(false);

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

  return (
    <div className="landing-body bg-rice-paper-texture bg-seigaiha">
      
      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-50 w-full px-6 py-4 transition-all duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between jp-card px-6 py-3">
          
          <div className="flex items-center gap-2">
            <span className="text-[var(--jp-gold)] flex items-center">
              <SvgMailIcon />
            </span>
            <span className="font-semibold text-lg tracking-wider text-[var(--jp-foam)]" style={{ fontFamily: 'var(--font-jp-heading)' }}>
              tmail<span className="text-[var(--jp-gold)]">CC</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#about" className="hover:text-[var(--jp-gold)] hover:underline underline-offset-4 transition-colors">Về Chúng Tôi</a>
            <Link href="/otp" className="hover:text-[var(--jp-gold)] hover:underline underline-offset-4 transition-colors">Giải Mã OTP & 2FA</Link>
            <a href="#api" className="hover:text-[var(--jp-gold)] hover:underline underline-offset-4 transition-colors">Tài Liệu API</a>
            <a href="#plans" className="hover:text-[var(--jp-gold)] hover:underline underline-offset-4 transition-colors" onClick={(e) => {
              e.preventDefault();
              setShowPlans(true);
              const el = document.getElementById('plans');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}>Bảng Giá</a>
          </nav>

          <div className="flex items-center gap-4">
            <button 
              className="flex items-center justify-center p-2 rounded transition-all duration-150" 
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? 'Chuyển sang Giao diện Sáng' : 'Chuyển sang Giao diện Tối'}
              style={{ color: 'var(--jp-gold)', border: '1px solid var(--glass-border)', background: 'transparent', cursor: 'pointer', width: 34, height: 34 }}
            >
              {darkMode ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
            <Link href="/app" className="jp-btn jp-btn-primary">
              Vào Ứng Dụng
            </Link>
          </div>

        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-20 pb-0 overflow-hidden flex flex-col items-center justify-between min-h-[85vh] bg-[var(--jp-navy)]">
        <div className="max-w-6xl mx-auto px-6 text-center z-20 flex-1 flex flex-col justify-center items-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 border border-[var(--glass-border)] text-[var(--jp-foam)] text-xs font-bold uppercase tracking-widest mb-8 font-mono">
            <SvgZapIcon /> HỘP THƯ TẬP TRUNG · CUSTOM DOMAIN VÔ HẠN · DEV API
          </div>
          
          <h1 className="text-5xl md:text-8xl font-black mb-8 text-[var(--jp-foam)] max-w-5xl tracking-tighter leading-none uppercase" style={{ fontFamily: 'var(--font-jp-display)' }}>
            TMAIL<span className="text-[var(--jp-foam)] italic font-normal">CC</span>
            <span className="block text-sm md:text-base font-bold tracking-[0.3em] mt-6 font-mono text-[var(--text-secondary)]">PLATFORM NHẬN MAIL TẬP TRUNG & TÊN MIỀN RIÊNG</span>
          </h1>

          <p className="text-base md:text-xl text-[var(--jp-foam)] max-w-3xl mb-12 leading-relaxed font-normal opacity-90">
            Gom toàn bộ Gmail về một nơi nhận thư tập trung. Tạo không giới hạn email ảo trên domain riêng sử dụng lâu dài. Tích hợp sâu Dotmail, trích xuất OTP tự động và Webhook thông báo thời gian thực cho developer.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/app" className="jp-btn jp-btn-primary px-8 py-3.5 text-base">
              Vào Không Gian Làm Việc
            </Link>
            <Link href="/otp" className="jp-btn jp-btn-secondary px-8 py-3.5 text-base" style={{ border: '1px solid var(--jp-gold)', color: 'var(--jp-gold)' }}>
              Nhận OTP & 2FA
            </Link>
            <a href="#api" className="jp-btn jp-btn-secondary px-8 py-3.5 text-base" style={{ opacity: 0.85 }}>
              Tài Liệu API & Webhook
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
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[var(--jp-foam)]" style={{ fontFamily: 'var(--font-jp-display)' }}>
            Giải Pháp Quản Trị Email Toàn Diện
          </h2>
          <div className="h-1 w-24 bg-[var(--glass-border)] mx-auto"></div>
        </div>

        <div className="flex flex-wrap justify-center gap-8">
          
          <div className="jp-card p-8 w-full md:w-[calc(50%-16px)] lg:w-[calc(33.333%-22px)]">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 border border-[var(--glass-border)] flex items-center justify-center text-[var(--jp-foam)] flex-shrink-0">
                <SvgHubIcon />
              </div>
              <h3 className="text-xl font-semibold text-[var(--jp-foam)] normal-case" style={{ fontFamily: 'var(--font-jp-display)', textTransform: 'none' }}>
                Nhận thư tập trung (Gmail Hub)
              </h3>
            </div>
            <p className="text-[var(--jp-foam)] text-sm leading-relaxed font-normal opacity-90 drop-cap">
              Gom toàn bộ các tài khoản Gmail của bạn vào một giao diện duy nhất để nhận và đọc thư đồng thời. Đăng nhập Gmail cực kỳ an toàn bằng mật khẩu ứng dụng (App Password), không sợ bỏ lỡ bất cứ hòm thư nào.
            </p>
          </div>

          <div className="jp-card p-8 w-full md:w-[calc(50%-16px)] lg:w-[calc(33.333%-22px)]">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 border border-[var(--glass-border)] flex items-center justify-center text-[var(--jp-foam)] flex-shrink-0">
                <SvgGlobeIcon />
              </div>
              <h3 className="text-xl font-semibold text-[var(--jp-foam)] normal-case" style={{ fontFamily: 'var(--font-jp-display)', textTransform: 'none' }}>
                Custom domain vô hạn
              </h3>
            </div>
            <p className="text-[var(--jp-foam)] text-sm leading-relaxed font-normal opacity-90">
              Kết nối tên miền riêng của bạn qua DNS/Cloudflare chỉ trong vài bước. Tạo không giới hạn số lượng email ảo với thời gian lưu trữ lâu dài bền bỉ, chạy ổn định trọn đời.
            </p>
          </div>

          <div className="jp-card p-8 w-full md:w-[calc(50%-16px)] lg:w-[calc(33.333%-22px)]">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 border border-[var(--glass-border)] flex items-center justify-center text-[var(--jp-foam)] flex-shrink-0">
                <SvgDotIcon />
              </div>
              <h3 className="text-xl font-semibold text-[var(--jp-foam)] normal-case" style={{ fontFamily: 'var(--font-jp-display)', textTransform: 'none' }}>
                Sinh dotmail thông minh
              </h3>
            </div>
            <p className="text-[var(--jp-foam)] text-sm leading-relaxed font-normal opacity-90">
              Tạo hàng ngàn biến thể email dạng dấu chấm (.) từ tài khoản Gmail gốc của bạn. Tất cả email gửi đến các địa chỉ dotmail này đều tự động hội tụ về một hộp thư mẹ duy nhất trên hệ thống.
            </p>
          </div>

          <div className="jp-card p-8 w-full md:w-[calc(50%-16px)] lg:w-[calc(33.333%-22px)]">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 border border-[var(--glass-border)] flex items-center justify-center text-[var(--jp-foam)] flex-shrink-0">
                <SvgOtpIcon />
              </div>
              <h3 className="text-xl font-semibold text-[var(--jp-foam)] normal-case" style={{ fontFamily: 'var(--font-jp-display)', textTransform: 'none' }}>
                Tự động trích xuất OTP
              </h3>
            </div>
            <p className="text-[var(--jp-foam)] text-sm leading-relaxed font-normal opacity-90">
              Sở hữu endpoint lấy OTP riêng biệt. Thuật toán thông minh của tmailCC tự động nhận diện, tách lọc và trích xuất mã OTP từ nội dung thư gửi đến tức thì, giúp bạn kích hoạt tài khoản cực kỳ nhanh chóng.
            </p>
          </div>

          <div className="jp-card p-8 w-full md:w-[calc(50%-16px)] lg:w-[calc(33.333%-22px)]">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 border border-[var(--glass-border)] flex items-center justify-center text-[var(--jp-foam)] flex-shrink-0">
                <SvgWebhookIcon />
              </div>
              <h3 className="text-xl font-semibold text-[var(--jp-foam)] normal-case" style={{ fontFamily: 'var(--font-jp-display)', textTransform: 'none' }}>
                Developer API & Webhooks
              </h3>
            </div>
            <p className="text-[var(--jp-foam)] text-sm leading-relaxed font-normal opacity-90">
              Cung cấp các API Key đầy đủ scopes phân quyền. Đăng ký Webhook để nhận thông báo đẩy thời gian thực sang máy chủ của bạn ngay khi có thư hoặc mã OTP mới phát sinh.
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
            
            <div className="lg:col-span-5">
              <div className="inline-block px-4 py-1.5 border border-[var(--glass-border)] text-[var(--jp-foam)] text-xs font-bold uppercase tracking-widest mb-4 font-mono">
                TÍCH HỢP HỆ THỐNG
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-[var(--jp-foam)]" style={{ fontFamily: 'var(--font-jp-display)' }}>
                API Hiệu Năng Cao Cho Lập Trình Viên
              </h2>
              <p className="text-[var(--jp-foam)] text-sm md:text-base leading-relaxed mb-6 font-normal opacity-90">
                Xây dựng và tự động hóa quy trình làm việc bằng cách tích hợp trực tiếp với API của tmailCC. Đầy đủ các endpoint quản lý tài khoản Gmail Hub, sinh dotmail, lắng nghe OTP và xử lý Webhooks.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 border border-[var(--glass-border)] flex items-center justify-center text-[var(--jp-foam)] mt-1 flex-shrink-0">
                    <SvgCheckIcon />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--jp-foam)]">Xác Thực API Key An Toàn</h4>
                    <p className="text-xs text-[var(--text-muted)]">Cấp khóa API chi tiết phân quyền scope rõ ràng để bảo vệ và giám sát lưu lượng.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 border border-[var(--glass-border)] flex items-center justify-center text-[var(--jp-foam)] mt-1 flex-shrink-0">
                    <SvgCheckIcon />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--jp-foam)]">Quét & Trích Xuất OTP Riêng Biệt</h4>
                    <p className="text-xs text-[var(--text-muted)]">Endpoint trích xuất mã OTP tức thời mà không cần đọc toàn bộ nội dung thư thô.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 border border-[var(--glass-border)] flex items-center justify-center text-[var(--jp-foam)] mt-1 flex-shrink-0">
                    <SvgCheckIcon />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--jp-foam)]">Đồng Bộ Nhận Thư Tập Trung & Webhooks</h4>
                    <p className="text-xs text-[var(--text-muted)]">Đăng ký URL Webhook để máy chủ của bạn nhận dữ liệu thư mới theo thời gian thực.</p>
                  </div>
                </div>
              </div>

              <Link href="/docs/api-guide.md" className="jp-btn jp-btn-primary">
                Xem API Guide Toàn Diện <SvgArrowRightIcon />
              </Link>
            </div>

            {/* Interactive API Console Mockup */}
            <div className="api-console lg:col-span-7 w-full">
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
              
              <div className="flex bg-[var(--jp-ocean)] border-b-2 border-[var(--glass-border)] px-2 overflow-x-auto">
                <button 
                  onClick={() => setActiveTab('createAccount')}
                  className={`api-console-tab ${activeTab === 'createAccount' ? 'active' : ''}`}
                >
                  Email & Domain
                </button>
                <button 
                  onClick={() => setActiveTab('gmailHub')}
                  className={`api-console-tab ${activeTab === 'gmailHub' ? 'active' : ''}`}
                >
                  Gmail Hub
                </button>
                <button 
                  onClick={() => setActiveTab('dotmail')}
                  className={`api-console-tab ${activeTab === 'dotmail' ? 'active' : ''}`}
                >
                  Dotmail
                </button>
                <button 
                  onClick={() => setActiveTab('otpApi')}
                  className={`api-console-tab ${activeTab === 'otpApi' ? 'active' : ''}`}
                >
                  Lấy OTP
                </button>
                <button 
                  onClick={() => setActiveTab('webhook')}
                  className={`api-console-tab ${activeTab === 'webhook' ? 'active' : ''}`}
                >
                  Webhook API
                </button>
              </div>

              <div className="api-console-body jp-scroll">
                <div className="text-[var(--text-muted)] mb-2 font-mono">{"// Endpoint: "}{CODE_SNIPPETS[activeTab].endpoint}</div>
                <pre className="text-[var(--jp-foam)] font-mono text-[11px] md:text-[13px] leading-relaxed whitespace-pre-wrap">
                  {CODE_SNIPPETS[activeTab].request}
                </pre>
                
                <div className="api-console-response">
                  <div className="text-[var(--text-muted)] mb-1 font-mono">{"// Response: 200 OK"}</div>
                  <pre className="text-[var(--text-secondary)] font-mono text-[11px] md:text-[13px] leading-relaxed whitespace-pre-wrap">
                    {CODE_SNIPPETS[activeTab].response}
                  </pre>
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
        <div className="text-center mb-8">
          <div className="inline-block px-4 py-1.5 border border-[var(--glass-border)] text-[var(--jp-foam)] text-xs font-bold uppercase tracking-widest mb-4 font-mono">
            BẢNG GIÁ
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[var(--jp-foam)]" style={{ fontFamily: 'var(--font-jp-display)' }}>
            Lựa Chọn Gói Dịch Vụ Của Bạn
          </h2>
          <p className="text-[var(--jp-foam)] text-sm max-w-lg mx-auto font-normal opacity-90 leading-relaxed">
            Các gói dịch vụ được thiết kế linh hoạt phù hợp với nhu cầu sử dụng cá nhân hoặc quy mô hệ thống doanh nghiệp lớn.
          </p>
        </div>

        <div className="plan-toggle-container">
          <button 
            onClick={() => setShowPlans(!showPlans)} 
            className="jp-btn jp-btn-secondary flex items-center gap-2"
          >
            {showPlans ? 'Ẩn Gói Dịch Vụ' : 'Hiển Thị Gói Dịch Vụ'}
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
                Cơ Bản (Free)
              </h3>
              <div className="text-3xl font-extrabold text-[var(--jp-foam)] mb-4" style={{ fontFamily: 'var(--font-jp-heading)' }}>
                0đ <span className="text-sm text-[var(--text-muted)] font-normal">/ tháng</span>
              </div>
              <p className="text-sm text-[var(--text-muted)] mb-6">Phù hợp nhu cầu cá nhân hoặc thử nghiệm sản phẩm.</p>
              <div className="h-[1px] bg-[var(--glass-border)] mb-6"></div>
              <ul className="plan-features-list text-[var(--text-secondary)] mb-8">
                <li><span className="text-[var(--jp-foam)]"><SvgCheckIcon /></span> 5 email ảo tạo đồng thời</li>
                <li><span className="text-[var(--jp-foam)]"><SvgCheckIcon /></span> Hộp thư tập trung (tối đa 1 Gmail)</li>
                <li><span className="text-[var(--jp-foam)]"><SvgCheckIcon /></span> Lưu trữ thư trong 24 giờ</li>
                <li><span className="text-[var(--jp-foam)]"><SvgCheckIcon /></span> Hỗ trợ domain hệ thống có sẵn</li>
                <li><span className="text-[var(--jp-foam)]"><SvgCheckIcon /></span> Tốc độ API cơ bản (60 requests/phút)</li>
              </ul>
              <Link href="/" className="jp-btn w-full justify-center">
                Bắt Đầu Ngay
              </Link>
            </div>

            {/* PLAN 2 (Pro) */}
            <div className="plan-card premium">
              <h3 className="text-lg font-bold text-[var(--jp-foam)] mb-2" style={{ fontFamily: 'var(--font-jp-display)' }}>
                Nâng Cao (Pro)
              </h3>
              <div className="text-3xl font-extrabold text-[var(--jp-foam)] mb-4" style={{ fontFamily: 'var(--font-jp-heading)' }}>
                99k <span className="text-sm text-[var(--jp-foam)] font-normal">/ tháng</span>
              </div>
              <p className="text-sm text-[var(--jp-foam)] mb-6">Dành cho cá nhân chuyên nghiệp và nhà phát triển ứng dụng.</p>
              <div className="h-[1px] bg-[var(--glass-border)] mb-6"></div>
              <ul className="plan-features-list text-[var(--text-secondary)] mb-8">
                <li><span className="text-[var(--jp-foam)]"><SvgCheckIcon /></span> Không giới hạn email ảo & domain riêng</li>
                <li><span className="text-[var(--jp-foam)]"><SvgCheckIcon /></span> Hộp thư tập trung (tối đa 5 Gmail)</li>
                <li><span className="text-[var(--jp-foam)]"><SvgCheckIcon /></span> Tự động sinh dotmail dấu chấm</li>
                <li><span className="text-[var(--jp-foam)]"><SvgCheckIcon /></span> Lưu trữ thư lên tới 7 ngày</li>
                <li><span className="text-[var(--jp-foam)]"><SvgCheckIcon /></span> OTP tự động & Webhook thời gian thực</li>
                <li><span className="text-[var(--jp-foam)]"><SvgCheckIcon /></span> Tốc độ API cao (180 requests/phút)</li>
              </ul>
              <Link href="/" className="jp-btn jp-btn-primary w-full justify-center">
                Đăng Ký Ngay
              </Link>
            </div>

            {/* PLAN 3 (Enterprise) */}
            <div className="plan-card">
              <h3 className="text-lg font-bold text-[var(--jp-foam)] mb-2" style={{ fontFamily: 'var(--font-jp-display)' }}>
                Doanh Nghiệp
              </h3>
              <div className="text-3xl font-extrabold text-[var(--jp-foam)] mb-4" style={{ fontFamily: 'var(--font-jp-heading)' }}>
                Liên Hệ <span className="text-sm text-[var(--text-muted)] font-normal">/ tháng</span>
              </div>
              <p className="text-sm text-[var(--text-muted)] mb-6">Tối ưu cho doanh nghiệp có lượng yêu cầu lớn và tự động hóa.</p>
              <div className="h-[1px] bg-[var(--glass-border)] mb-6"></div>
              <ul className="plan-features-list text-[var(--text-secondary)] mb-8">
                <li><span className="text-[var(--jp-foam)]"><SvgCheckIcon /></span> Đầy đủ tính năng gói Pro</li>
                <li><span className="text-[var(--jp-foam)]"><SvgCheckIcon /></span> Tích hợp Dotmail & Gmail Hub không giới hạn</li>
                <li><span className="text-[var(--jp-foam)]"><SvgCheckIcon /></span> IMAP fetcher hiệu năng cao trích xuất OTP</li>
                <li><span className="text-[var(--jp-foam)]"><SvgCheckIcon /></span> API Key chuyên dụng không giới hạn rate limit</li>
                <li><span className="text-[var(--jp-foam)]"><SvgCheckIcon /></span> Hỗ trợ kỹ thuật 24/7 trực tiếp</li>
              </ul>
              <a href="https://t.me/ShopCC_app" target="_blank" rel="noopener noreferrer" className="jp-btn jp-btn-primary w-full justify-center">
                Liên Hệ Hỗ Trợ (Telegram)
              </a>
            </div>

          </div>
        </div>

      </section>

      {/* FOOTER */}
      <footer className="border-t-4 border-[var(--glass-border)] py-16 bg-black text-white">
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
              © 2026 tmailCC. Bản quyền nghệ thuật và giải pháp thư điện tử tự động hóa thuộc về Kaih Co.uk.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-semibold uppercase tracking-widest text-white font-mono text-xs">Tài Liệu:</span>
            <div className="flex gap-6 text-xs text-white/60 mt-2">
              <a href="/docs/api-guide.md" className="hover:text-white transition-colors">API Guide</a>
              <a href="/docs/developer-api.md" className="hover:text-white transition-colors">Developer API</a>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-semibold uppercase tracking-widest text-white font-mono text-xs">Hỗ Trợ:</span>
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
  );
}
