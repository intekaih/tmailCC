/**
 * tmailCC - Root Layout (Server Component)
 * 
 * This is a Next.js Server Component that:
 * - Provides global metadata (SEO)
 * - Loads Google Fonts for the Cyberpunk Design System
 * - Fetches initial session state server-side
 * - Sets the HTML lang attribute
 */
import type { Metadata } from 'next';
import { Playfair_Display, Source_Serif_4, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const playfairDisplay = Playfair_Display({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
  variable: '--font-playfair-display',
  display: 'swap',
});

const sourceSerif4 = Source_Serif_4({
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-source-serif',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '700'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'tmailCC - Hệ thống Webmail Tạm thời & Tên miền Riêng',
  description: 'Hệ thống webmail tạm thời và tên miền riêng chuyên nghiệp. Nhận email thời gian thực, tích hợp API hiệu năng cao.',
  keywords: ['email tạm thời', 'temp mail', 'monochrome mail', 'mail api', 'otp detector', 'dotmail', 'custom domain mail'],
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="vi"
      className={`${playfairDisplay.variable} ${sourceSerif4.variable} ${jetbrainsMono.variable} light`}
    >
      <body>{children}</body>
    </html>
  );
}

