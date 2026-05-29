'use client';

import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/lib/AppContext';

interface DotmailViewProps {
  account: {
    id: string;
    address: string;
    domain: string;
    isDotmail?: boolean;
    parentAddress?: string;
  };
}

// ============================================
// Email Safe Rendering Helpers
// ============================================
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isAllowedUrl(value: string, isSource: boolean): boolean {
  if (!value) return false;
  const lower = value.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('vbscript:')) return false;
  if (lower.startsWith('data:')) return isSource && lower.startsWith('data:image/');
  if (lower.startsWith('cid:')) return isSource;

  try {
    const url = new URL(value, window.location.origin);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function sanitizeEmailHtml(html: string): string {
  if (typeof window === 'undefined') return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const blockedTags = [
    'script', 'iframe', 'object', 'embed', 'link', 'meta', 'base',
    'form', 'input', 'button', 'textarea', 'select', 'option',
    'animate', 'animatemotion', 'animatetransform', 'set',
    'math', 'maction', 'semantics', 'annotation-xml',
    'template', 'slot', 'portal', 'dialog',
  ];

  doc.querySelectorAll(blockedTags.join(',')).forEach(node => node.remove());

  const dangerousAttrPrefixes = ['on', 'form', 'xlink', 'xml', 'xmlns'];
  const dangerousAttrs = new Set([
    'srcdoc', 'style', 'formaction', 'action', 'data', 'dynsrc', 'lowsrc',
    'background', 'poster', 'ping', 'loading', 'is', 'integrity',
  ]);

  doc.querySelectorAll('*').forEach((el) => {
    const tag = el.tagName.toLowerCase();

    if (tag.includes(':') || el.namespaceURI?.includes('math')) {
      el.remove();
      return;
    }

    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();

      if (dangerousAttrPrefixes.some(p => name.startsWith(p)) || dangerousAttrs.has(name)) {
        el.removeAttribute(attr.name);
        continue;
      }

      if (value.startsWith('javascript:') || value.startsWith('vbscript:') || value.startsWith('data:text/html')) {
        el.removeAttribute(attr.name);
        continue;
      }

      if (['href', 'src'].includes(name)) {
        if (!isAllowedUrl(attr.value.trim(), name === 'src')) {
          el.removeAttribute(attr.name);
          continue;
        }
      }
    }

    if (tag === 'a') {
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    }
  });

  return doc.body.innerHTML;
}

function renderBody(text: string, html: string): string {
  if (html && html.trim()) {
    return sanitizeEmailHtml(html);
  }
  if (text) {
    return text
      .split('\n')
      .map(line => `<div style="margin-bottom:4px">${escapeHtml(line) || '&nbsp;'}</div>`)
      .join('');
  }
  return '<p style="color:var(--text-muted)">No content</p>';
}

function formatFullDate(dateStr: string, locale: string): string {
  try {
    return new Date(dateStr).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function formatShortDate(dateStr: string, locale: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString(locale === 'vi' ? 'vi-VN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function DotmailView({ account }: DotmailViewProps) {
  const { t, locale, toast } = useApp();
  const [loading, setLoading] = useState(false);
  const [emails, setEmails] = useState<any[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(15);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const loadingRef = useRef(loading);
  loadingRef.current = loading;

  const fetchOtp = async (isManual = true) => {
    setLoading(true);
    setHasSearched(true);
    try {
      const { api } = await import('@/lib/api');
      const data = await api.admin.getDotmailOtp(account.address);
      setEmails(data.emails || []);
      if (data.emails && data.emails.length > 0) {
        toast('Đã cập nhật danh sách thư thành công!', 'success');
        setSelectedEmail(data.emails[0]);
      } else if (isManual) {
        toast('Không tìm thấy thư mới nào. Vui lòng thử lại.', 'info');
      }
    } catch (err: any) {
      toast(`Lỗi lấy thư: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchOtpSilent = async () => {
    if (loadingRef.current) return;
    try {
      const { api } = await import('@/lib/api');
      const data = await api.admin.getDotmailOtp(account.address);
      if (data.emails && data.emails.length > 0) {
        const hasNew = data.emails.length > emails.length;
        setEmails(data.emails);
        if (hasNew) {
          toast('Đã tự động nhận được thư mới!', 'success');
        }
        setSelectedEmail((prev: any) => {
          if (!prev) return data.emails[0];
          const updated = data.emails.find((e: any) => e.id === prev.id);
          return updated || data.emails[0];
        });
      }
    } catch (err) {
      console.warn('Silent IMAP fetch error:', err);
    }
  };

  useEffect(() => {
    // Reset when selected account changes
    setEmails([]);
    setSelectedEmail(null);
    setHasSearched(false);
    setLoading(false);
    setAutoRefresh(true);
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    fetchOtp(false);
  }, [account.address]);

  useEffect(() => {
    if (autoRefresh) {
      setCountdown(15);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            fetchOtpSilent();
            return 15;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    }

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [autoRefresh, account.address, emails.length]);

  const handleCopyOtp = (code: string) => {
    navigator.clipboard.writeText(code);
    toast(`Đã sao chép mã OTP: ${code}`, 'success');
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-[var(--bg-secondary)]" style={{ flex: 1 }}>
      {/* Left panel: Info, Controls & Email List (2nd Column) */}
      <div className="w-full md:w-[360px] border-r border-[var(--border)] p-5 flex flex-col gap-4 bg-[var(--bg-secondary)] flex-shrink-0 h-full overflow-hidden">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center font-bold text-lg">
              G
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)] m-0">Gmail Dotmail</h2>
              <span className="text-[11px] text-[var(--text-muted)]">Biến thể Gmail không giới hạn</span>
            </div>
          </div>
          <div className="text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-tertiary)] p-3 rounded-lg border border-[var(--border)] break-all select-all font-mono mt-3">
            {account.address}
          </div>
          {account.parentAddress && (
            <div className="text-xs text-[var(--text-muted)] mt-1.5 px-1">
              Liên kết với Gmail gốc: <span className="font-semibold text-[var(--text-secondary)]">{account.parentAddress}</span>
            </div>
          )}
        </div>

        <div className="border-t border-[var(--border)] pt-4 flex gap-2 flex-shrink-0">
          <button
            onClick={() => fetchOtp(true)}
            disabled={loading}
            className="btn btn-primary flex-1 justify-center py-2.5 text-sm font-semibold flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Đang quét...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M21 2v6h-6M3 22v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L21 8M3 16l4.64 4.36A9 9 0 0 0 19.49 17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Quét thư
              </>
            )}
          </button>

          <button
            className={`flex items-center justify-center px-3 py-2.5 rounded-xl border text-sm font-semibold cursor-pointer transition-all duration-200 gap-2
              ${autoRefresh 
                ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20' 
                : 'bg-transparent text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--bg-hover)]'
              }`}
            onClick={() => setAutoRefresh(prev => !prev)}
            title={autoRefresh ? `Tự động quét: Bật (${countdown}s)` : 'Tự động quét: Tắt'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {autoRefresh ? `${countdown}s` : 'Auto'}
          </button>
        </div>

        {/* Scrollable Email List */}
        <div className="flex-1 overflow-y-auto min-h-0 border-t border-[var(--border)] pt-4 flex flex-col gap-2">
          <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1 px-1">
            Danh sách thư ({emails.length})
          </h3>
          {emails.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-muted)] text-xs flex flex-col items-center gap-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" opacity="0.4">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.5"/>
                <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              {hasSearched ? 'Không tìm thấy thư nào' : 'Nhấn nút quét để tìm thư mới'}
            </div>
          ) : (
            <div className="flex flex-col gap-2 pr-1">
              {emails.map((email) => {
                const isSelected = selectedEmail?.id === email.id;
                return (
                  <div
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all duration-150 flex flex-col gap-1 relative
                      ${isSelected 
                        ? 'bg-[var(--bg-tertiary)] border-[var(--border)]' 
                        : 'bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border-[var(--border)]'
                      }`}
                  >
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[170px]" title={email.fromName || email.from}>
                        {email.fromName || email.from}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">
                        {formatShortDate(email.date, locale)}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] font-medium truncate pr-4">
                      {email.subject || 'Không có tiêu đề'}
                    </div>
                    {email.otp && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          OTP: {email.otp}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Right panel: Full Email Content (3rd Column) */}
      <div className="flex-1 flex flex-col bg-[var(--bg-primary)] overflow-hidden h-full">
        {loading && emails.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center items-center gap-3">
            <div className="w-12 h-12 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin mb-2" />
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">Đang kết nối tới Google Mail...</h4>
            <p className="text-xs text-[var(--text-muted)]">Giao thức IMAP có thể mất vài giây để hoàn thành quét thư.</p>
          </div>
        ) : !selectedEmail ? (
          <div className="flex-1 flex flex-col justify-center items-center gap-4 text-center max-w-md mx-auto p-6">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-secondary)] border border-[var(--border)]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">Chưa chọn thư</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {hasSearched 
                  ? 'Vui lòng chọn một thư ở danh sách bên trái để đọc nội dung chi tiết.'
                  : 'Nhấn vào nút Quét thư (IMAP) để bắt đầu quét thư mới.'
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden h-full">
            {/* Email Header */}
            <div className="p-5 border-b border-[var(--border)] flex-shrink-0 bg-[var(--bg-secondary)]">
              <h1 className="text-lg font-semibold leading-tight mb-4 text-[var(--text-primary)]">
                {selectedEmail.subject || 'Không có tiêu đề'}
              </h1>
              
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {(selectedEmail.fromName || selectedEmail.from || 'U')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5 mb-0.5">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{selectedEmail.fromName || selectedEmail.from}</span>
                    {selectedEmail.fromName && (
                      <span className="text-xs text-[var(--text-muted)] ml-1.5">&lt;{selectedEmail.from}&gt;</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span>Đến: {account.address}</span>
                    <span>{formatFullDate(selectedEmail.date, locale)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* OTP Banner inside Email view */}
            {selectedEmail.otp && (
              <div className="flex items-center gap-3 p-3 px-6 border-b border-[var(--accent)]/20 flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)' }}>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--accent)] uppercase tracking-wide">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  ĐÃ TÌM THẤY MÃ OTP
                </div>
                <div className="flex-1 text-center font-mono text-xl font-bold text-[var(--accent)] tracking-[6px]"
                  style={{ textShadow: '0 0 20px rgba(99, 102, 241, 0.3)' }}>
                  {selectedEmail.otp}
                </div>
                <button
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer font-sans transition-all duration-200 border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20"
                  onClick={() => handleCopyOtp(selectedEmail.otp!)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  Sao chép mã
                </button>
              </div>
            )}

            {/* Email Body Content */}
            <div className="flex-1 p-6 overflow-y-auto bg-[var(--bg-primary)]">
              <div 
                className="text-sm leading-relaxed text-[var(--text-primary)] break-words"
                dangerouslySetInnerHTML={{ __html: renderBody(selectedEmail.body, selectedEmail.html) }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
