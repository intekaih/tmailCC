import type { Metadata } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tmailcc.app';

export const metadata: Metadata = {
  title: 'tmailCC OTP - Lấy mã xác minh OTP tự động | 2FA Authenticator',
  description:
    'Lấy mã OTP xác minh tự động qua email. Hỗ trợ nhập email|key hoặc dùng 2FA Authenticator TOTP (RFC 6238). Nhận mã 6 số trực tiếp trên trình duyệt mà không cần app.',
  keywords: [
    'lấy mã otp',
    'otp detector',
    'trích xuất otp',
    'mã xác minh email',
    '2fa authenticator',
    'totp',
    'email otp',
    'mã otp tự động',
    'nhận mã xác minh',
    'otp verification code',
    '2fa code viewer',
    'email verification code',
    'google auth',
    'tài khoản google',
  ],
  robots: {
    index: true,
    follow: false,
    googleBot: { index: true, follow: false },
  },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: `${APP_URL}/otp`,
    siteName: 'tmailCC',
    title: 'tmailCC OTP - Lấy mã xác minh OTP tự động',
    description:
      'Lấy mã OTP xác minh tự động qua email. Hỗ trợ TOTP 2FA Authenticator, nhận mã 6 số trực tiếp trên trình duyệt.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'tmailCC OTP' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'tmailCC OTP - Lấy mã xác minh tự động',
    description: 'Nhận mã OTP tự động qua email. Hỗ trợ TOTP 2FA Authenticator trên trình duyệt.',
    images: ['/og-image.png'],
  },
};

export default function OTPLayout({ children }: { children: React.ReactNode }) {
  return children;
}
