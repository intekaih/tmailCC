'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface FaqItem {
  q: string;
  a: string;
}

const FAQS_VI: FaqItem[] = [
  {
    q: 'tmailCC là gì?',
    a: 'tmailCC là nền tảng nhận email tập trung cho phép bạn gom nhiều tài khoản Gmail vào một giao diện duy nhất, tạo email ảo không giới hạn trên tên miền riêng, sinh dotmail tự động, trích xuất mã OTP và nhận thông báo webhook thời gian thực.',
  },
  {
    q: 'Làm sao tạo email tạm thời trên tmailCC?',
    a: 'Sau khi đăng nhập (hoặc dùng trực tiếp không cần đăng ký), chọn tên miền từ danh sách có sẵn hoặc thêm tên miền riêng của bạn, nhập địa chỉ email bạn muốn và nhấn Tạo. Hệ thống sẽ tự động tạo hòm thư ảo ngay lập tức mà không cần đăng ký hay xác minh thêm.',
  },
  {
    q: 'Gmail Hub hoạt động như thế nào?',
    a: 'Kết nối tài khoản Gmail của bạn qua IMAP với app password (mã ứng dụng Google). tmailCC sẽ tự động kiểm tra và hiển thị email từ tất cả tài khoản đã kết nối tại một giao diện duy nhất. Bạn có thể quản lý hàng chục tài khoản Gmail từ một màn hình.',
  },
  {
    q: 'Làm sao lấy mã OTP tự động?',
    a: 'Có hai cách: (1) Sử dụng trang OTP tích hợp tại /otp, nhập địa chỉ email và key để nhận mã; (2) Sử dụng API endpoint /api/v1/accounts/{address}/wait-otp để nhận mã OTP tự động trong code của bạn. Hệ thống trích xuất mã OTP (4-8 số) từ email mới nhất.',
  },
  {
    q: 'tmailCC có miễn phí không?',
    a: 'Có, tmailCC có gói miễn phí với đầy đủ tính năng cơ bản: tạo email ảo không giới hạn trên tên miền có sẵn, nhận email real-time, trích xuất OTP, web notification. Gói Pro cung cấp thêm Gmail Hub nâng cao, tên miền riêng tùy chỉnh, API rate limit cao hơn và hỗ trợ ưu tiên.',
  },
  {
    q: 'Webhook là gì và làm sao sử dụng?',
    a: 'Webhook là cơ chế thông báo real-time. Khi có email mới đến tài khoản của bạn, tmailCC sẽ gửi HTTP POST request đến URL endpoint bạn đã cấu hình. Tạo webhook qua Developer Settings > Webhooks, chọn events (email.received, otp.detected) và nhận dữ liệu trực tiếp vào server của bạn.',
  },
  {
    q: 'Dữ liệu email của tôi có bảo mật không?',
    a: 'tmailCC sử dụng nhiều lớp bảo mật: mã hóa AES-256-GCM cho dữ liệu nhạy cảm (app passwords Gmail), Row Level Security (RLS) trên Supabase để cô lập dữ liệu người dùng, HMAC webhook signatures để xác thực, timing-safe comparisons chống timing attacks, và HTTPS/SSL bắt buộc cho tất cả kết nối.',
  },
  {
    q: 'API là gì và tôi có thể dùng nó để làm gì?',
    a: 'tmailCC cung cấp REST API v1 cho phép bạn tự động hóa mọi thao tác: tạo/xóa email, đọc hộp thư, chờ OTP, quản lý webhooks và API keys. Bạn có thể tích hợp vào chatbot, automation workflow, testing framework, hoặc ứng dụng của riêng mình. Xem tài liệu đầy đủ tại /docs/developer-api.',
  },
  {
    q: 'Làm sao thêm tên miền riêng của tôi?',
    a: 'Trong trang Admin Panel (dành cho admin), thêm tên miền mới và cấu hình bản ghi MX records tại nhà cung cấp tên miền của bạn trỏ về máy chủ tmailCC. Sau khi xác minh MX record, tên miền sẽ sẵn sàng để tạo email ảo trên đó.',
  },
  {
    q: 'Dotmail là gì và tại sao nó hữu ích?',
    a: 'Dotmail là biến thể Gmail sử dụng dấu chấm (.) trong địa chỉ - ví dụ john.doe@gmail.com và j.ohn.doe@gmail.com là cùng một tài khoản. tmailCC có thể sinh tự động hàng ngàn dotmail variants cho một tài khoản Gmail, giúp bạn theo dõi email đến từ dịch vụ nào và chặn spam hiệu quả.',
  },
];

const FAQS_EN: FaqItem[] = [
  {
    q: 'What is tmailCC?',
    a: 'tmailCC is a centralized email reception platform that allows you to collect multiple Gmail accounts into a single interface, create unlimited virtual emails on your own domains, generate dotmails automatically, extract OTP codes, and receive real-time webhook notifications.',
  },
  {
    q: 'How do I create a temporary email on tmailCC?',
    a: 'After logging in (or using directly without registration), select a domain from the available list or add your own custom domain, enter the email address you want, and click Create. The system will automatically create the virtual mailbox instantly without any further registration or verification.',
  },
  {
    q: 'How does Gmail Hub work?',
    a: 'Connect your Gmail accounts via IMAP with a Google App Password. tmailCC will automatically check and display emails from all connected accounts in a single interface. You can manage dozens of Gmail accounts from one screen.',
  },
  {
    q: 'How do I retrieve OTP codes automatically?',
    a: 'There are two ways: (1) Use the integrated OTP page at /otp, enter the email address and key to receive the code; (2) Use the API endpoint /api/v1/accounts/{address}/wait-otp to receive the OTP code automatically in your code. The system extracts the OTP code (4-8 digits) from the latest email.',
  },
  {
    q: 'Is tmailCC free?',
    a: 'Yes, tmailCC offers a free plan with all basic features: create unlimited virtual emails on available domains, receive real-time emails, extract OTPs, and web notifications. The Pro plan provides advanced Gmail Hub, custom domains, higher API rate limits, and priority support.',
  },
  {
    q: 'What is a webhook and how do I use it?',
    a: 'A webhook is a real-time notification mechanism. When a new email arrives in your account, tmailCC sends an HTTP POST request to the URL endpoint you configured. Create webhooks via Developer Settings > Webhooks, select events (email.received, otp.detected), and receive data directly on your server.',
  },
  {
    q: 'Is my email data secure?',
    a: 'tmailCC utilizes multiple security layers: AES-256-GCM encryption for sensitive data (Gmail app passwords), Row Level Security (RLS) on Supabase to isolate user data, HMAC webhook signatures for authentication, timing-safe comparisons to prevent timing attacks, and mandatory HTTPS/SSL for all connections.',
  },
  {
    q: 'What is the API and what can I use it for?',
    a: 'tmailCC provides a REST API v1 that allows you to automate all operations: create/delete emails, read inbox, wait for OTP, manage webhooks, and API keys. You can integrate it into chatbots, automation workflows, testing frameworks, or your own apps. Read full docs at /docs/developer-api.',
  },
  {
    q: 'How do I add my own domain?',
    a: 'In the Admin Panel page (for admin), add a new domain and configure MX records at your domain provider to point to the tmailCC server. After MX record verification, the domain will be ready to create virtual emails.',
  },
  {
    q: 'What is dotmail and why is it useful?',
    a: 'Dotmail is a Gmail variation using dots (.) in the address - for example, john.doe@gmail.com and j.ohn.doe@gmail.com point to the same account. tmailCC can automatically generate thousands of dotmail variants for a Gmail account, helping you track which service sent the email and block spam effectively.',
  },
];

export default function FAQClient() {
  const [locale, setLocale] = useState<'vi' | 'en'>('vi');

  useEffect(() => {
    const stored = localStorage.getItem('tmail_locale');
    if (stored === 'en' || stored === 'vi') {
      setLocale(stored as 'vi' | 'en');
    }
  }, []);

  const faqs = locale === 'vi' ? FAQS_VI : FAQS_EN;

  return (
    <div className="min-h-screen bg-white text-black p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-8 border-b-4 border-black pb-4 flex items-center justify-between">
          <Link href="/" className="text-xs font-mono uppercase tracking-wider hover:underline" style={{ textDecoration: 'none', color: 'black', fontWeight: 'bold' }}>
            {locale === 'vi' ? '← Quay Lại Trang Chủ' : '← Back to Homepage'}
          </Link>
          <span className="font-mono text-xs uppercase text-neutral-500 tracking-wider">
            {locale === 'vi' ? 'FAQ // Câu hỏi thường gặp' : 'FAQ // Frequently Asked Questions'}
          </span>
        </div>

        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-extrabold text-black mb-4 uppercase tracking-tight">
            {locale === 'vi' ? 'Câu Hỏi Thường Gặp' : 'Frequently Asked Questions'}
          </h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            {locale === 'vi' 
              ? 'Tìm câu trả lời nhanh cho các câu hỏi phổ biến về tmailCC. Nếu không tìm thấy câu trả lời, liên hệ qua '
              : 'Find quick answers to common questions about tmailCC. If you cannot find the answer, contact us via '}
            <a
              href="https://t.me/ShopCC_app"
              className="underline font-semibold"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'black' }}
            >
              Telegram
            </a>
            .
          </p>
        </div>

        {/* FAQ Items */}
        <div className="space-y-6" itemScope itemType="https://schema.org/FAQPage">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="border-2 border-black p-6 hover:bg-neutral-50 transition-colors"
              itemScope
              itemProp="mainEntity"
              itemType="https://schema.org/Question"
            >
              <h2
                className="text-xl font-bold text-black mb-3 flex items-start gap-2"
                itemProp="name"
              >
                <span className="font-mono text-sm bg-black text-white px-2 py-0.5 shrink-0">
                  Q{idx + 1}
                </span>
                {faq.q}
              </h2>
              <div
                className="text-base text-neutral-700 leading-relaxed pl-0 md:pl-10"
                itemScope
                itemProp="acceptedAnswer"
                itemType="https://schema.org/Answer"
              >
                <p itemProp="text">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 bg-black text-white p-8 text-center">
          <h3 className="text-2xl font-bold mb-2">
            {locale === 'vi' ? 'Bạn vẫn có câu hỏi?' : 'Still have questions?'}
          </h3>
          <p className="text-neutral-400 mb-6">
            {locale === 'vi' 
              ? 'Liên hệ để được hỗ trợ trực tiếp qua Telegram.' 
              : 'Contact us for direct support via Telegram.'}
          </p>
          <a
            href="https://t.me/ShopCC_app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-white text-black font-bold px-8 py-3 hover:bg-neutral-200 transition-colors"
            style={{ textDecoration: 'none' }}
          >
            {locale === 'vi' ? 'Liên hệ Telegram →' : 'Contact Telegram →'}
          </a>
        </div>

        {/* Footer */}
        <div className="mt-16 border-t-2 border-neutral-200 pt-8 text-center text-xs text-neutral-500 font-mono">
          tmailCC Documentation Node // secure_connection
        </div>
      </div>
    </div>
  );
}
