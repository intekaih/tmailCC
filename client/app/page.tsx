/**
 * tmailCC - Root Page (Server Component)
 * 
 * Đây là Server Component cho route / - phục vụ trang Landing Page mặc định.
 */
import { Metadata } from 'next';
import LandingClient from './landing/LandingClient';

export const metadata: Metadata = {
  title: 'tmailCC - Nền tảng Nhận Mail Tập Trung & Tên Miền Riêng Vô Hạn',
  description: 'Gom các tài khoản Gmail về một mối để nhận mail tập trung. Tạo không giới hạn hòm thư ảo trên tên miền riêng vô hạn thời hạn. Hỗ trợ sinh Dotmail, trích xuất OTP tự động và Webhooks cho nhà phát triển.',
  keywords: ['nhận mail tập trung', 'gmail hub', 'gmail dotmail', 'email tạm thời', 'temp mail', 'tên miền riêng', 'custom domain mail', 'mail api', 'lấy otp', 'webhook mail'],
};

export default function RootPage() {
  return <LandingClient />;
}
