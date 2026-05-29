/**
 * tmailCC - JSON-LD Structured Data Components
 *
 * Implements Schema.org markup for WebApplication, Organization, SoftwareApplication,
 * FAQPage, and APIDocumentation to boost SEO and GEO (AI search engine) visibility.
 */
import type { Metadata } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tmailcc.app';
const APP_NAME = 'tmailCC';
const APP_DESCRIPTION =
  'Nền tảng nhận email tập trung hàng đầu. Gmail Hub, custom domain vô hạn, sinh dotmail, trích xuất OTP tự động, Webhook cho developer.';

// ============ Organization ============
export function OrganizationJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${APP_URL}/#organization`,
    name: APP_NAME,
    alternateName: 'tmailCC - Nhận Mail Tập Trung',
    url: APP_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${APP_URL}/logo.png`,
      width: 512,
      height: 512,
    },
    sameAs: [
      'https://t.me/ShopCC_app',
      'https://github.com/tmailCC',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      availableLanguage: ['Vietnamese', 'English'],
      url: `https://t.me/ShopCC_app`,
    },
    foundingDate: '2024',
    areaServed: 'Worldwide',
    serviceType: 'Email Service Platform',
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 0) }}
    />
  );
}

// ============ WebApplication (Landing Page) ============
export function WebApplicationJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': `${APP_URL}/#webapp`,
    name: APP_NAME,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web Browser, iOS, Android',
    url: APP_URL,
    description: APP_DESCRIPTION,
    softwareVersion: '1.0',
    author: {
      '@type': 'Organization',
      name: 'Kaih Co.uk',
      url: 'https://kaih.co.uk',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Kaih Co.uk',
      url: 'https://kaih.co.uk',
    },
    offers: [
      {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: 'Free tier - Tạo email ảo không giới hạn',
        availability: 'https://schema.org/InStock',
      },
      {
        '@type': 'Offer',
        name: 'Pro Plan',
        price: '9.99',
        priceCurrency: 'USD',
        description: 'Pro plan - Gmail Hub nâng cao, API rate limit cao hơn',
        availability: 'https://schema.org/InStock',
        url: `${APP_URL}/#pricing`,
      },
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '1247',
      bestRating: '5',
      worstRating: '1',
    },
    screenshot: {
      '@type': 'ImageObject',
      url: `${APP_URL}/og-image.png`,
      width: 1200,
      height: 630,
    },
    featureList: [
      'Nhận email tập trung (Inbox Aggregation)',
      'Tạo email tạm thời không giới hạn',
      'Tên miền riêng tùy chỉnh (Custom Domain)',
      'Gmail Hub - Gom nhiều tài khoản Gmail',
      'Sinh dotmail tự động (Dotmail Generation)',
      'Trích xuất mã OTP tự động',
      '2FA Authenticator (TOTP RFC 6238)',
      'Webhook thời gian thực cho developer',
      'API cho nhà phát triển với API keys',
      'Email API với rate limiting',
      'Nhận email real-time với Supabase Realtime',
      'Web notification và browser notification',
    ],
    browserRequirements: 'Requires modern web browser with JavaScript enabled',
    permissions: 'email address (optional)',
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 0) }}
    />
  );
}

// ============ SoftwareApplication (API Docs) ============
export function SoftwareApplicationJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: `${APP_NAME} API`,
    alternateName: 'tmailCC Developer API',
    url: `${APP_URL}/docs/developer-api`,
    description:
      'REST API cho tmailCC - tạo email, đọc hộp thư, chờ OTP, webhook, quản lý API keys.',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    programmingLanguage: ['JavaScript', 'TypeScript', 'Python', 'Go', 'curl'],
    author: {
      '@type': 'Organization',
      name: 'Kaih Co.uk',
      url: 'https://kaih.co.uk',
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free tier với rate limit cơ bản',
    },
    provider: {
      '@type': 'Organization',
      name: APP_NAME,
      url: APP_URL,
    },
    areaServed: 'Worldwide',
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 0) }}
    />
  );
}

// ============ FAQPage (FAQ Doc) ============
export function FAQPageJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'tmailCC là gì?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'tmailCC là nền tảng nhận email tập trung cho phép bạn gom nhiều tài khoản Gmail vào một nơi, tạo email ảo không giới hạn trên tên miền riêng, sinh dotmail tự động, trích xuất mã OTP và nhận thông báo webhook thời gian thực.',
        },
      },
      {
        '@type': 'Question',
        name: 'Làm sao tạo email tạm thời trên tmailCC?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Sau khi đăng nhập, chọn tên miền và nhập địa chỉ email bạn muốn. Hệ thống sẽ tự động tạo hòm thư ảo ngay lập tức mà không cần đăng ký hay xác minh.',
        },
      },
      {
        '@type': 'Question',
        name: 'Gmail Hub hoạt động như thế nào?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Kết nối tài khoản Gmail của bạn qua IMAP với app password (mã ứng dụng). tmailCC sẽ tự động kiểm tra và hiển thị email từ tất cả tài khoản đã kết nối tại một giao diện duy nhất.',
        },
      },
      {
        '@type': 'Question',
        name: 'Làm sao lấy mã OTP tự động?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Sử dụng API endpoint /api/v1/accounts/{address}/wait-otp hoặc trang OTP tích hợp sẵn. Hệ thống sẽ tự động trích xuất mã OTP (4-8 số) từ email mới nhất và trả về real-time.',
        },
      },
      {
        '@type': 'Question',
        name: 'tmailCC có miễn phí không?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Có, tmailCC có gói miễn phí với đầy đủ tính năng cơ bản: tạo email ảo không giới hạn, nhận email real-time, trích xuất OTP. Gói Pro cung cấp thêm Gmail Hub nâng cao, API rate limit cao hơn và hỗ trợ ưu tiên.',
        },
      },
      {
        '@type': 'Question',
        name: 'Webhook là gì và làm sao sử dụng?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Webhook cho phép nhận thông báo real-time khi có email mới đến tài khoản của bạn. Tạo webhook endpoint qua Developer Settings, chọn events (email.received, otp.detected) và nhận HTTP POST request mỗi khi có sự kiện.',
        },
      },
      {
        '@type': 'Question',
        name: 'Dữ liệu email của tôi có bảo mật không?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'tmailCC sử dụng mã hóa AES-256-GCM cho dữ liệu nhạy cảm (app passwords), Row Level Security (RLS) trên Supabase, HMAC webhook signatures, timing-safe comparisons, và HTTPS/SSL bắt buộc cho tất cả kết nối.',
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 0) }}
    />
  );
}

// ============ BreadcrumbList (Global) ============
export function BreadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 0) }}
    />
  );
}

// ============ HowTo (Usage Guide) ============
export function HowToJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'Cách sử dụng tmailCC - Nhận email tập trung',
    description: 'Hướng dẫn từng bước cách tạo email tạm thời, kết nối Gmail Hub, và lấy mã OTP tự động trên tmailCC.',
    totalTime: 'PT2M',
    step: [
      {
        '@type': 'HowToStep',
        name: 'Bước 1: Truy cập tmailCC',
        text: 'Truy cập tmailcc.app và đăng nhập hoặc sử dụng trực tiếp mà không cần đăng ký.',
        url: APP_URL,
      },
      {
        '@type': 'HowToStep',
        name: 'Bước 2: Tạo email ảo',
        text: 'Chọn tên miền từ danh sách có sẵn hoặc thêm tên miền riêng của bạn, nhập địa chỉ email bạn muốn và nhấn Tạo.',
        url: `${APP_URL}/app`,
      },
      {
        '@type': 'HowToStep',
        name: 'Bước 3: Nhận email',
        text: 'Sử dụng địa chỉ email vừa tạo để đăng ký dịch vụ. Email sẽ đến hộp thư tmailCC theo thời gian thực.',
        url: `${APP_URL}/app`,
      },
      {
        '@type': 'HowToStep',
        name: 'Bước 4: Lấy mã OTP (tùy chọn)',
        text: 'Nếu cần xác minh OTP, sử dụng trang OTP hoặc API endpoint /api/v1/accounts/{address}/wait-otp để nhận mã tự động.',
        url: `${APP_URL}/otp`,
      },
    ],
    supply: [
      { '@type': 'HowToSupply', name: 'Địa chỉ email tạm thời từ tmailCC' },
      { '@type': 'HowToSupply', name: 'Tài khoản tmailCC (miễn phí)' },
    ],
    tool: [
      { '@type': 'HowToTool', name: 'Trình duyệt web hiện đại' },
      { '@type': 'HowToTool', name: 'tmailCC API (tùy chọn)' },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 0) }}
    />
  );
}

// ============ CollectionPage (API Docs) ============
export function CollectionPageJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'tmailCC API Documentation',
    description:
      'Tài liệu đầy đủ về tmailCC REST API v1. Endpoints cho email management, OTP detection, webhook management, và API key authentication.',
    url: `${APP_URL}/docs/api-guide`,
    about: {
      '@type': 'SoftwareApplication',
      name: `${APP_NAME} API v1`,
      applicationCategory: 'DeveloperApplication',
    },
    author: {
      '@type': 'Organization',
      name: 'Kaih Co.uk',
      url: 'https://kaih.co.uk',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 0) }}
    />
  );
}
