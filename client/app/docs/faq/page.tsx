import type { Metadata } from 'next';
import { FAQPageJsonLd } from '@/components/StructuredData';
import FAQClient from './FAQClient';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tmailcc.app';

export const metadata: Metadata = {
  title: 'tmailCC FAQ - Câu hỏi thường gặp | Gmail Hub, OTP, Email tạm',
  description:
    'Trả lời các câu hỏi thường gặp về tmailCC: cách tạo email tạm thời, sử dụng Gmail Hub, sinh dotmail, lấy mã OTP, tích hợp webhook, bảo mật và quyền riêng tư.',
  keywords: [
    'faq tmailcc',
    'câu hỏi thường gặp',
    'email tạm thời là gì',
    'gmail hub là gì',
    'dotmail là gì',
    'otp là gì',
    'webhook là gì',
    'email tên miền riêng',
    'tmailcc hướng dẫn',
    'trợ giúp tmailcc',
  ],
  alternates: {
    canonical: `${APP_URL}/docs/faq`,
  },
  openGraph: {
    type: 'article',
    locale: 'vi_VN',
    url: `${APP_URL}/docs/faq`,
    siteName: 'tmailCC',
    title: 'tmailCC FAQ - Câu hỏi thường gặp',
    description:
      'Trả lời các câu hỏi thường gặp: email tạm thời, Gmail Hub, dotmail, OTP, webhook, bảo mật.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'tmailCC FAQ' }],
  },
};

export default function FAQPage() {
  return (
    <>
      <FAQPageJsonLd />
      <FAQClient />
    </>
  );
}
