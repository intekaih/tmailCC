import fs from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import DocHeader from './DocHeader';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tmailcc.app';

// ============ SEO: Dynamic metadata for docs pages ============

// Map friendly slug → display title + meta description
const DOCS_META: Record<string, { title: string; description: string; keywords: string[] }> = {
  'api-guide': {
    title: 'tmailCC API Guide - Hướng dẫn sử dụng API đầy đủ',
    description:
      'Tài liệu hướng dẫn sử dụng tmailCC API v1 đầy đủ nhất. Tạo email, xem hộp thư, đọc email, chờ OTP, xóa tài khoản, webhook. Có ví dụ JavaScript/TypeScript.',
    keywords: [
      'tmailcc api',
      'email api',
      'webhook api',
      'api documentation',
      'email developer',
      'mail api',
      'rest api email',
      'api endpoint',
    ],
  },
  'developer-api': {
    title: 'tmailCC Developer API - Tích hợp API cho nhà phát triển',
    description:
      'Tích hợp tmailCC API vào ứng dụng của bạn. API keys, rate limiting, webhook events, OAuth2, ví dụ code JavaScript/Python/Go, SDK documentation.',
    keywords: [
      'tmailcc developer api',
      'email api integration',
      'webhook email',
      'api key authentication',
      'developer documentation',
      'rate limiting api',
      'email automation api',
    ],
  },
  'chucnang-tmailCC': {
    title: 'tmailCC - Tính năng đầy đủ | Gmail Hub, Dotmail, OTP, Webhook',
    description:
      'Khám phá tất cả tính năng của tmailCC: nhận mail tập trung, Gmail Hub, email tên miền riêng, sinh dotmail, trích xuất OTP tự động, 2FA Authenticator, webhook.',
    keywords: [
      'tính năng tmailcc',
      'gmail hub',
      'gmail dotmail',
      'email tên miền riêng',
      'otp tự động',
      'webhook email',
    ],
  },
  'bocauhoi': {
    title: 'tmailCC FAQ - Câu hỏi thường gặp',
    description:
      'Trả lời các câu hỏi thường gặp về tmailCC: cách tạo email tạm thời, sử dụng Gmail Hub, sinh dotmail, lấy mã OTP, tích hợp webhook, bảo mật và quyền riêng tư.',
    keywords: ['faq tmailcc', 'câu hỏi thường gặp', 'hướng dẫn sử dụng', 'trợ giúp'],
  },
  'docker-guide': {
    title: 'tmailCC Docker Guide - Triển khai bằng Docker',
    description:
      'Hướng dẫn cài đặt và triển khai tmailCC bằng Docker và Docker Compose. Cấu hình môi trường, biến môi trường, SSL, reverse proxy, database setup.',
    keywords: ['docker tmailcc', 'docker compose', 'deploy tmailcc', 'self-hosted email', 'container email'],
  },
  'deploy-vps': {
    title: 'tmailCC VPS Deployment Guide - Triển khai trên VPS',
    description:
      'Hướng dẫn triển khai tmailCC trên VPS với Nginx, SSL, domain configuration, PM2 process manager, và tối ưu hiệu suất cho production.',
    keywords: ['deploy tmailcc vps', 'nginx setup', 'vps email', 'self-hosted mail'],
  },
  'supabase-setup': {
    title: 'tmailCC Supabase Setup - Cấu hình Supabase Database',
    description:
      'Hướng dẫn cấu hình Supabase cho tmailCC: database schema, authentication, Row Level Security policies, storage buckets, realtime subscriptions, environment variables.',
    keywords: ['supabase tmailcc', 'database setup', 'row level security', 'supabase auth', 'postgresql'],
  },
  'technical-report': {
    title: 'tmailCC Technical Report - Báo cáo kỹ thuật',
    description:
      'Báo cáo kỹ thuật chi tiết về kiến trúc tmailCC: tech stack, database design, security model, realtime architecture, API design, và các decision records.',
    keywords: ['technical report tmailcc', 'architecture', 'system design', 'database schema'],
  },
  'api-test-checklist': {
    title: 'tmailCC API Test Checklist - Danh sách kiểm tra API',
    description:
      'Danh sách kiểm tra đầy đủ cho tmailCC API endpoints: authentication, rate limiting, error handling, webhook delivery, OTP extraction, email operations.',
    keywords: ['api test', 'test checklist', 'endpoint testing', 'api validation'],
  },
  'quychethi': {
    title: 'tmailCC Terms of Service - Quy chế và điều khoản sử dụng',
    description: 'Quy chế và điều khoản sử dụng dịch vụ tmailCC.',
    keywords: ['điều khoản sử dụng', 'quy chế', 'terms of service', 'privacy policy'],
  },
  'ai-prompts-appendix': {
    title: 'tmailCC AI Prompts Appendix - Prompt cho AI Assistant',
    description:
      'Danh sách prompt mẫu để sử dụng tmailCC API với AI assistant như Claude, GPT, Gemini. Ví dụ code và best practices.',
    keywords: ['ai prompts', 'claude code', 'openai api', 'prompt engineering'],
  },
  'realtime-audit-report': {
    title: 'tmailCC Realtime Audit Report - Kiểm toán realtime system',
    description:
      'Báo cáo kiểm toán hệ thống realtime của tmailCC: Supabase Realtime, Broadcast channels, multi-tab sync, WebSocket connections, và performance analysis.',
    keywords: ['realtime system', 'websocket', 'supabase realtime', 'real-time email'],
  },
};

interface PageProps {
  params: {
    filename: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { filename } = params;
  const safeFilename = filename.endsWith('.md') ? filename : filename;

  const meta = DOCS_META[safeFilename];
  if (meta) {
    return {
      title: meta.title,
      description: meta.description,
      keywords: meta.keywords,
      alternates: {
        canonical: `${APP_URL}/docs/${safeFilename}`,
      },
      openGraph: {
        type: 'article',
        locale: 'vi_VN',
        url: `${APP_URL}/docs/${safeFilename}`,
        siteName: 'tmailCC',
        title: meta.title,
        description: meta.description,
        images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'tmailCC' }],
      },
    };
  }

  // Fallback: generate from filename
  const displayTitle = safeFilename
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    title: `tmailCC - ${displayTitle}`,
    description: `Tài liệu ${displayTitle} cho tmailCC.`,
    alternates: {
      canonical: `${APP_URL}/docs/${safeFilename}`,
    },
  };
}

interface PageProps {
  params: {
    filename: string;
  };
}

export default function DocPage({ params }: PageProps) {
  const { filename } = params;

  // Validate filename to prevent path traversal
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return notFound();
  }

  // Support both with and without .md extension
  const safeFilename = filename.endsWith('.md') ? filename : `${filename}.md`;

  const docsDir = path.join(process.cwd(), '..', 'docs');
  const filePath = path.join(docsDir, safeFilename);

  if (!fs.existsSync(filePath)) {
    return notFound();
  }

  const rawContent = fs.readFileSync(filePath, 'utf-8');

  // Helper for inline markdown like **bold** and `code`
  const parseInlineMarkdown = (text: string): React.ReactNode => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\))/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-black">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="bg-neutral-100 px-1.5 py-0.5 font-mono text-sm border border-neutral-300 text-black">{part.slice(1, -1)}</code>;
      }
      if (part.startsWith('[') && part.includes('](')) {
        const linkText = part.slice(1, part.indexOf(']'));
        const linkUrl = part.slice(part.indexOf('](') + 2, -1);
        const resolvedUrl = linkUrl.endsWith('.md') ? `/docs/${linkUrl}` : linkUrl;
        return (
          <a key={i} href={resolvedUrl} className="text-black underline font-semibold hover:bg-neutral-100 px-1">
            {linkText}
          </a>
        );
      }
      return part;
    });
  };

  // Improved Markdown parser with table support
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Code blocks
      if (line.trim().startsWith('```')) {
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        elements.push(
          <pre 
            key={`code-${i}`} 
            className="bg-[#F5F5F5] border-2 border-black p-4 font-mono text-sm overflow-x-auto my-6 text-black"
          >
            {codeLines.join('\n')}
          </pre>
        );
        i++; // skip closing tag
        continue;
      }

      // Headers
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={`h1-${i}`} className="text-4xl font-extrabold text-black mt-8 mb-4 border-b-2 border-black pb-2 uppercase tracking-tight">
            {line.replace('# ', '')}
          </h1>
        );
        i++;
        continue;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={`h2-${i}`} className="text-2xl font-bold text-black mt-8 mb-4 border-b border-black pb-1">
            {line.replace('## ', '')}
          </h2>
        );
        i++;
        continue;
      }
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${i}`} className="text-lg font-bold text-black mt-6 mb-2">
            {line.replace('### ', '')}
          </h3>
        );
        i++;
        continue;
      }

      // Table parsing
      if (line.trim().startsWith('|')) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          tableLines.push(lines[i].trim());
          i++;
        }

        if (tableLines.length >= 2) {
          const secondLine = tableLines[1];
          const isDelimiter = /^[|\s:-]+$/.test(secondLine);

          if (isDelimiter) {
            const headers = tableLines[0]
              .split('|')
              .slice(1, -1)
              .map(h => h.trim());

            const rows = tableLines.slice(2).map(rowLine => {
              return rowLine
                .split('|')
                .slice(1, -1)
                .map(r => r.trim());
            });

            elements.push(
              <div key={`table-container-${i}`} className="my-6 overflow-x-auto border-2 border-black">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2 border-black bg-neutral-50 font-mono font-bold">
                      {headers.map((header, hIdx) => (
                        <th key={hIdx} className="p-3 border-r last:border-r-0 border-black text-black uppercase tracking-wider">
                          {parseInlineMarkdown(header)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rIdx) => (
                      <tr key={rIdx} className="border-b last:border-b-0 border-black hover:bg-neutral-50 transition-colors">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="p-3 border-r last:border-r-0 border-black text-neutral-800">
                            {parseInlineMarkdown(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
            continue;
          }
        }
        
        tableLines.forEach((tableLine, tlIdx) => {
          elements.push(
            <p key={`table-fallback-${i}-${tlIdx}`} className="text-base text-neutral-800 leading-relaxed mb-4">
              {parseInlineMarkdown(tableLine)}
            </p>
          );
        });
        continue;
      }

      // Lists
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const listItems: React.ReactNode[] = [];
        while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
          const cleanText = lines[i].trim().replace(/^[-*]\s+/, '');
          listItems.push(
            <li key={`li-${i}`} className="list-disc ml-6 text-neutral-800 text-base mb-1.5 leading-relaxed">
              {parseInlineMarkdown(cleanText)}
            </li>
          );
          i++;
        }
        elements.push(
          <ul key={`ul-${i}`} className="my-4">
            {listItems}
          </ul>
        );
        continue;
      }

      // Blockquotes
      if (line.startsWith('> ')) {
        const quoteLines: string[] = [];
        while (i < lines.length && lines[i].startsWith('> ')) {
          quoteLines.push(lines[i].replace('> ', ''));
          i++;
        }
        elements.push(
          <blockquote key={`quote-${i}`} className="border-l-4 border-black pl-4 py-1 italic my-4 text-neutral-600 bg-neutral-50">
            {quoteLines.map((ql, qlIdx) => (
              <p key={qlIdx} className="mb-2 last:mb-0">
                {parseInlineMarkdown(ql)}
              </p>
            ))}
          </blockquote>
        );
        continue;
      }

      // Horizontal rules
      if (line.trim() === '---' || line.trim() === '***') {
        elements.push(
          <hr key={`hr-${i}`} className="border-t-2 border-black my-8" />
        );
        i++;
        continue;
      }

      // Regular Paragraph
      if (line.trim() === '') {
        i++;
        continue;
      }

      elements.push(
        <p key={`p-${i}`} className="text-base text-neutral-800 leading-relaxed mb-4">
          {parseInlineMarkdown(line)}
        </p>
      );
      i++;
    }

    return elements;
  };

  return (
    <div className="min-h-screen bg-white text-black p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        
        {/* Navigation Breadcrumb */}
        <DocHeader safeFilename={safeFilename} />

        {/* Rendered Document */}
        <article className="prose prose-neutral max-w-none">
          {renderMarkdown(rawContent)}
        </article>

        {/* Footer */}
        <div className="mt-16 border-t-2 border-neutral-200 pt-8 text-center text-xs text-neutral-500 font-mono">
          tmailCC Documentation Node // secure_connection
        </div>

      </div>
    </div>
  );
}
