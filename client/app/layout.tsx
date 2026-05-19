/**
 * tmailCC - Root Layout (Server Component)
 * 
 * This is a Next.js Server Component that:
 * - Provides global metadata (SEO)
 * - Loads Google Fonts
 * - Fetches initial session state server-side
 * - Sets the HTML lang attribute
 */
import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Playfair_Display, Noto_Serif_JP, Shippori_Mincho, Cinzel } from 'next/font/google';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '600', '700'],
  variable: '--font-playfair-display',
  display: 'swap',
});

const notoSerifJp = Noto_Serif_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto-serif-jp',
  display: 'swap',
});

const shipporiMincho = Shippori_Mincho({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-shippori-mincho',
  display: 'swap',
});

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-cinzel',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'tmailCC - Webmail System',
  description: 'Permanent webmail system with real-time inbox, multi-domain support, and advanced management. Built with Next.js, Supabase, and TypeScript.',
  keywords: ['webmail', 'email', 'tmailCC', 'supabase', 'nextjs'],
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
      className={`${plusJakartaSans.variable} ${playfairDisplay.variable} ${notoSerifJp.variable} ${shipporiMincho.variable} ${cinzel.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}

