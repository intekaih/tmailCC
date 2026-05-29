import fs from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';
import Link from 'next/link';

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
        <div className="mb-8 border-b-4 border-black pb-4 flex items-center justify-between">
          <Link href="/" className="jp-btn hover:underline text-xs flex items-center gap-2">
            ← Quay Lại Trang Chủ
          </Link>
          <span className="font-mono text-xs uppercase text-neutral-500 tracking-wider">
            Tài Liệu Hệ Thống: {safeFilename}
          </span>
        </div>

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
