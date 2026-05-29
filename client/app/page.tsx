/**
 * tmailCC - Root Page (Server Component)
 * 
 * Đây là Server Component cho route / - phục vụ trang Landing Page mặc định.
 */
import LandingClient from './landing/LandingClient';

// ============ SEO / GEO METADATA ============

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tmailcc.app';

export const metadata = {
  metadataBase: new URL(APP_URL),
  title: 'tmailCC - Nhận Mail Tập Trung & Tên Miền Riêng Vô Hạn | Gmail Hub, OTP, Webhook',
  description:
    'tmailCC là nền tảng nhận email tập trung tốt nhất. Gom Gmail về một nơi, tạo email ảo không giới hạn trên tên miền riêng, sinh dotmail tự động, trích xuất OTP, webhook thời gian thực. API cho developer. Miễn phí bắt đầu.',
  keywords: [
    'email tạm thời',
    'email ảo',
    'nhận mail tập trung',
    'gmail hub',
    'gmail dotmail',
    'dotmail gmail',
    'email tên miền riêng',
    'custom domain email',
    'mail api',
    'webhook email',
    'lấy mã otp',
    'otp detector',
    'trích xuất otp tự động',
    'temp mail',
    'disposable email',
    'fake email',
    'email dùng một lần',
    'email aggregator',
    'email forwarding service',
    'catch-all email',
    'email developer api',
    'email automation',
  ],
  authors: [{ name: 'Kaih Co.uk', url: 'https://kaih.co.uk' }],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    alternateLocale: ['en_US'],
    url: APP_URL,
    siteName: 'tmailCC',
    title: 'tmailCC - Nhận Mail Tập Trung & Tên Miền Riêng Vô Hạn',
    description:
      'Nền tảng nhận email tập trung hàng đầu. Gmail Hub, custom domain vô hạn, sinh dotmail, trích xuất OTP tự động, Webhook cho developer.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'tmailCC - Nền tảng nhận email tập trung',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'tmailCC - Nhận Mail Tập Trung & Tên Miền Riêng Vô Hạn',
    description:
      'Gom Gmail về một nơi. Tạo email ảo không giới hạn, sinh dotmail, trích xuất OTP tự động, Webhook thời gian thực. API cho developer.',
    images: ['/og-image.png'],
  },
};

export default function RootPage() {
  return <LandingClient />;
}
