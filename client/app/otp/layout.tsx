import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'tmailCC OTP - Lấy mã xác minh',
  description: 'Nhập email và 2FA key để lấy mã xác minh real-time',
};

export default function OTPLayout({ children }: { children: React.ReactNode }) {
  return children;
}
