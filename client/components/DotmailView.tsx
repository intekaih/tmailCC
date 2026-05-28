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

export default function DotmailView({ account }: DotmailViewProps) {
  const { t, toast } = useApp();
  const [loading, setLoading] = useState(false);
  const [otpData, setOtpData] = useState<{ otp: string | null; from: string; subject: string } | null>(null);
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
      setOtpData(data);
      if (data.otp) {
        toast('Đã tìm thấy mã OTP thành công!', 'success');
      } else if (isManual) {
        toast('Không tìm thấy mã OTP mới nào. Vui lòng thử lại.', 'info');
      }
    } catch (err: any) {
      toast(`Lỗi lấy OTP: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchOtpSilent = async () => {
    if (loadingRef.current) return;
    try {
      const { api } = await import('@/lib/api');
      const data = await api.admin.getDotmailOtp(account.address);
      if (data.otp) {
        setOtpData(data);
        setHasSearched(true);
        toast('Đã tự động tìm thấy mã OTP mới nhận!', 'success');
        setAutoRefresh(false);
      }
    } catch (err) {
      console.warn('Silent IMAP fetch error:', err);
    }
  };

  useEffect(() => {
    // Reset when selected account changes
    setOtpData(null);
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
  }, [autoRefresh, account.address]);

  const handleCopyOtp = (code: string) => {
    navigator.clipboard.writeText(code);
    toast(`Đã sao chép mã OTP: ${code}`, 'success');
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-[var(--bg-secondary)]" style={{ flex: 1 }}>
      {/* Left panel: Info & Trigger */}
      <div className="w-full md:w-[360px] border-r border-[var(--border)] p-6 flex flex-col gap-6 bg-[var(--bg-secondary)] flex-shrink-0">
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

        <div className="border-t border-[var(--border)] pt-5 flex flex-col gap-3">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Hệ thống sẽ kết nối bảo mật qua giao thức IMAP tới Gmail gốc để tìm kiếm các thư mới nhận có chứa mã xác thực (OTP).
          </p>

          <div className="flex items-center justify-between my-1">
            <span className="text-xs text-[var(--text-secondary)] font-medium">Tự động quét (IMAP)</span>
            <button
              className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-all duration-200
                ${autoRefresh 
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20' 
                  : 'bg-transparent text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--bg-hover)]'
                }`}
              onClick={() => setAutoRefresh(prev => !prev)}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {autoRefresh ? `Tự động quét (${countdown}s)` : 'Tắt tự động quét'}
            </button>
          </div>

          <button
            onClick={() => fetchOtp(true)}
            disabled={loading}
            className="btn btn-primary w-full justify-center py-2.5 text-sm font-semibold flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Đang quét hộp thư...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M21 2v6h-6M3 22v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L21 8M3 16l4.64 4.36A9 9 0 0 0 19.49 17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Lấy mã OTP (IMAP)
              </>
            )}
          </button>
        </div>

        <div className="mt-auto bg-[var(--bg-tertiary)] p-4 rounded-xl border border-[var(--border)] text-xs text-[var(--text-muted)] leading-relaxed">
          <div className="font-semibold text-[var(--text-secondary)] mb-1 flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="12" y1="8" x2="12.01" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Hướng dẫn sử dụng:
          </div>
          1. Sử dụng địa chỉ Dotmail trên để đăng ký dịch vụ (Netflix, Spotify, ChatGPT, v.v.).<br/>
          2. Thực hiện gửi mã xác nhận từ dịch vụ đó.<br/>
          3. Đợi 10 - 15 giây rồi bấm nút <strong>Lấy mã OTP</strong> ở trên để hiển thị mã.<br/>
          4. Hệ thống sẽ tự động quét thư chưa đọc nhận được trong vòng 10 phút qua.
        </div>
      </div>

      {/* Right panel: Result display */}
      <div className="flex-1 p-8 flex flex-col justify-center items-center bg-[var(--bg-primary)] overflow-y-auto">
        {!hasSearched && !loading && (
          <div className="text-center max-w-md p-6 flex flex-col items-center gap-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-secondary)] border border-[var(--border)]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">Hộp thư chưa được quét</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Nhấn vào nút <strong>Lấy mã OTP (IMAP)</strong> ở cột bên trái để bắt đầu quét hộp thư Gmail gốc của bạn và trích xuất mã xác thực mới nhất.
              </p>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center p-6 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin mb-2" />
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">Đang kết nối tới Google Mail...</h4>
            <p className="text-xs text-[var(--text-muted)]">Giao thức IMAP có thể mất 3-8 giây để hoàn thành quét thư.</p>
          </div>
        )}

        {hasSearched && !loading && otpData && (
          <div className="w-full max-w-lg bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 shadow-sm animate-[fadeIn_0.3s_ease] flex flex-col gap-6">
            {otpData.otp ? (
              <>
                <div className="text-center">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Đã tìm thấy mã OTP mới nhận
                  </div>
                  <h3 className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider mb-2">Mã xác thực của bạn</h3>
                  
                  <div className="flex items-center justify-center gap-4 my-4">
                    <div className="text-4xl md:text-5xl font-bold font-mono tracking-widest text-[var(--accent)] bg-[var(--bg-primary)] px-6 py-3.5 rounded-xl border border-[var(--border)] shadow-inner">
                      {otpData.otp}
                    </div>
                    <button
                      onClick={() => handleCopyOtp(otpData.otp!)}
                      className="btn btn-primary h-12 w-12 flex items-center justify-center p-0 rounded-xl"
                      title="Sao chép OTP"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2.5"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2.5"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="border-t border-[var(--border)] pt-4 flex flex-col gap-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-[var(--border-light)]">
                    <span className="text-[var(--text-muted)]">Người gửi:</span>
                    <span className="font-semibold text-[var(--text-primary)] text-right">{otpData.from}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[var(--text-muted)]">Tiêu đề:</span>
                    <span className="font-semibold text-[var(--text-primary)] text-right truncate max-w-[280px]" title={otpData.subject}>
                      {otpData.subject}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-6 flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">Không tìm thấy mã OTP</h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-sm mx-auto">
                    Hiện tại chưa tìm thấy thư chứa mã xác nhận nào mới (trong 10 phút gần đây) từ hòm thư của bạn.
                  </p>
                </div>
                <button
                  onClick={() => fetchOtp(true)}
                  className="btn btn-secondary btn-sm flex items-center gap-1.5 mt-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Quét lại hộp thư
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
