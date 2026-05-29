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
import {
  OrganizationJsonLd,
  WebApplicationJsonLd,
} from '@/components/StructuredData';

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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tmailcc.app';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'tmailCC - Nhận Mail Tập Trung & Tên Miền Riêng Vô Hạn',
    template: '%s | tmailCC',
  },
  description:
    'tmailCC - Nền tảng nhận email tập trung hàng đầu. Tạo không giới hạn hòm thư ảo trên tên miền riêng, Gmail Hub, sinh dotmail, trích xuất OTP tự động, Webhook thời gian thực cho developer.',
  keywords: [
    // Vietnamese primary keywords
    'email tạm thời',
    'email ảo',
    'email dùng một lần',
    'nhận mail tập trung',
    'gmail hub',
    'gmail dotmail',
    'dotmail gmail',
    'email tên miền riêng',
    'custom domain email',
    'mail api',
    'webhook email',
    'lấy mã otp tự động',
    'otp detector',
    'trích xuất otp',
    'email developer api',
    'email tập trung',
    'hòm thư ảo',
    'tên miền riêng email',
    'email không giới hạn',
    // English secondary keywords
    'temp mail',
    'disposable email',
    'fake email',
    'email alias',
    'bulk email',
    'email aggregator',
    'inbox aggregator',
    'forwarding email',
    'catch-all email',
    'email forwarding service',
    'disposable email address',
    'throwaway email',
    'fake email generator',
    // OTP/verification
    'otp verification',
    '2fa code',
    'email verification code',
    'auto otp extractor',
    // Developer
    'email api service',
    'email webhooks',
    'transactional email api',
    'email automation',
    'smtp api',
  ],
  authors: [{ name: 'Kaih Co.uk', url: 'https://kaih.co.uk' }],
  creator: 'Kaih Co.uk',
  publisher: 'Kaih Co.uk',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    alternateLocale: ['en_US'],
    url: APP_URL,
    siteName: 'tmailCC',
    title: 'tmailCC - Nhận Mail Tập Trung & Tên Miền Riêng Vô Hạn',
    description:
      'Nền tảng nhận email tập trung hàng đầu. Tạo không giới hạn hòm thư ảo trên tên miền riêng, Gmail Hub, sinh dotmail, trích xuất OTP tự động, Webhook thời gian thực cho developer.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'tmailCC - Nền tảng nhận email tập trung',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'tmailCC - Nhận Mail Tập Trung & Tên Miền Riêng Vô Hạn',
    description:
      'Nền tảng nhận email tập trung hàng đầu. Gmail Hub, custom domain vô hạn, sinh dotmail, trích xuất OTP tự động, Webhook cho developer.',
    images: ['/og-image.png'],
    creator: '@tmailCC',
    site: '@tmailCC',
  },
  alternates: {
    canonical: APP_URL,
    languages: {
      'vi-VN': APP_URL,
      'en-US': `${APP_URL}/en`,
    },
    types: {
      'application/rss+xml': `${APP_URL}/feed.xml`,
    },
  },
  category: 'Technology',
  classification: 'Email Service / Developer Tools',
  referrer: 'origin-when-cross-origin',
  appLinks: {
    ios: {
      url: 'https://apps.apple.com/app/tmailcc',
      app_store_id: '123456789',
    },
    android: {
      url: 'https://play.google.com/store/apps/details?id=app.tmailcc',
      package: 'app.tmailcc',
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-32x32.png',
    apple: '/apple-touch-icon.png',
    other: [
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        url: '/favicon-32x32.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        url: '/favicon-16x16.png',
      },
    ],
  },
  other: {
    'application-name': 'tmailCC',
    'msapplication-TileColor': '#0a1424',
    'msapplication-config': '/browserconfig.xml',
    'theme-color': '#0a1424',
    colorScheme: 'dark light',
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
      <head>
        {/* Preconnect to external resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://tmailcc.app" />
        <link rel="preconnect" href="https://tmailcc.app" />

        {/* DNS Prefetch for performance */}
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />

        {/* Geo Tags */}
        <meta name="geo.region" content="VN" />
        <meta name="geo.country" content="Vietnam" />
        <meta name="geo.placename" content="Ho Chi Minh City" />
        <meta name="geo.position" content="10.8231;106.6297" />
        <meta name="ICBM" content="10.8231, 106.6297" />

        {/* Business/Organization */}
        <meta name="organization" content="Kaih Co.uk" />
        <meta name="author" content="Kaih Co.uk" />
        <meta name="designer" content="Kaih Co.uk" />
        <meta name="owner" content="Kaih Co.uk" />
        <meta name="contactOrganization" content="Kaih Co.uk" />
        <meta name="contact" content="t.me/ShopCC_app" />
        <meta name="telegram" content="https://t.me/ShopCC_app" />

        {/* Brand Identity */}
        <meta name="brand" content="tmailCC" />
        <meta name="product" content="tmailCC Email Platform" />
        <meta name="version" content="1.0" />
        <meta name="rating" content="General" />
        <meta name="distribution" content="Global" />
        <meta name="revisit-after" content="7 days" />

        {/* Global JSON-LD Structured Data for SEO & GEO */}
        <OrganizationJsonLd />
        <WebApplicationJsonLd />
      </head>

      <body>{children}</body>
    </html>
  );
}


