'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { saveGuestAccount } from '@/components/Sidebar';

function QuickAccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'linking' | 'error' | 'unauthorized'>('linking');
  const [errorMsg, setErrorMsg] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    const addr = searchParams.get('addr');
    if (!addr || !addr.includes('@')) {
      setStatus('error');
      setErrorMsg('Địa chỉ email không hợp lệ hoặc thiếu thông tin.');
      return;
    }

    const decodedAddr = decodeURIComponent(addr).toLowerCase();
    setAddress(decodedAddr);

    const linkMailbox = async () => {
      try {
        const token = localStorage.getItem('tmail_token');
        if (token) {
          // Logged in user: verify if they have access
          try {
            await api.accounts.get(decodedAddr);
            // Succeeded: they own it! Save select and redirect
            localStorage.setItem('tmail_select_account', decodedAddr);
            router.push('/');
          } catch (err: any) {
            // Failed: they don't own it or it belongs to someone else / anonymous
            setStatus('unauthorized');
            setErrorMsg(
              'Hộp thư này đã được đăng ký và bảo mật bởi một tài khoản khác. Vui lòng đăng nhập đúng tài khoản sở hữu để sử dụng.'
            );
          }
        } else {
          // Guest user: save as guest account and redirect
          const [localPart, domain] = decodedAddr.split('@');
          saveGuestAccount({
            address: decodedAddr,
            localPart,
            domain,
            createdAt: new Date().toISOString(),
            lastUsed: new Date().toISOString()
          });
          localStorage.setItem('tmail_select_account', decodedAddr);
          router.push('/');
        }
      } catch (err: any) {
        setStatus('error');
        setErrorMsg('Không thể liên kết hộp thư: ' + (err.message || 'Lỗi kết nối'));
      }
    };

    linkMailbox();
  }, [searchParams, router]);

  return (
    <div className="quick-access-page">
      <div className="card glass-panel fade-in">
        {status === 'linking' && (
          <div className="flex flex-col items-center gap-6">
            <div className="spinner-glow">
              <div className="double-spin" />
            </div>
            <div className="text-center">
              <h2 className="title outfit">Đang liên kết hộp thư...</h2>
              <p className="subtitle">{address}</p>
            </div>
          </div>
        )}

        {status === 'unauthorized' && (
          <div className="flex flex-col items-center gap-6">
            <div className="icon-error-wrap">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="#ef4444" strokeWidth="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#ef4444" strokeWidth="2"/>
                <path d="M12 15v3" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="text-center">
              <h2 className="title outfit text-red">Quyền truy cập bị từ chối</h2>
              <p className="error-description">{errorMsg}</p>
            </div>
            <div className="flex gap-4 w-full mt-2">
              <button className="action-btn secondary" onClick={() => router.push('/')}>
                Về Trang Chủ
              </button>
              <button 
                className="action-btn primary" 
                onClick={() => {
                  localStorage.removeItem('tmail_token');
                  window.location.href = '/';
                }}
              >
                Đăng Xuất
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-6">
            <div className="icon-error-wrap">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2"/>
                <line x1="12" y1="8" x2="12" y2="12" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="16" r="1" fill="#ef4444"/>
              </svg>
            </div>
            <div className="text-center">
              <h2 className="title outfit text-red">Đã xảy ra lỗi</h2>
              <p className="error-description">{errorMsg}</p>
            </div>
            <button className="action-btn w-full mt-2" onClick={() => router.push('/')}>
              Về Trang Chủ
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .quick-access-page {
          height: 100vh;
          overflow-y: auto;
          background: #0a0a0f;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          font-family: 'Inter', sans-serif;
          color: #e4e4e7;
        }
        .card {
          width: 100%;
          max-width: 400px;
          padding: 32px 24px;
          border-radius: 16px;
          background: rgba(19, 19, 26, 0.65);
          border: 1px solid rgba(39, 39, 42, 0.5);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .title {
          font-size: 20px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 8px;
        }
        .text-red {
          color: #ef4444;
        }
        .subtitle {
          font-size: 14px;
          color: #a78bfa;
          font-family: 'JetBrains Mono', monospace;
          word-break: break-all;
        }
        .error-description {
          font-size: 13.5px;
          color: #a1a1aa;
          line-height: 1.5;
        }
        .spinner-glow {
          position: relative;
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .double-spin {
          width: 100%;
          height: 100%;
          border: 3px solid transparent;
          border-top-color: #a78bfa;
          border-bottom-color: #7c3aed;
          border-radius: 50%;
          animation: spin 1.2s linear infinite;
        }
        .spinner-glow::after {
          content: '';
          position: absolute;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(167, 139, 250, 0.15) 0%, transparent 70%);
          filter: blur(4px);
        }
        .icon-error-wrap {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
          font-size: 14px;
          font-weight: 600;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          flex: 1;
        }
        .action-btn.primary {
          background: linear-gradient(135deg, #7c3aed, #a78bfa);
          color: #fff;
        }
        .action-btn.primary:hover {
          opacity: 0.95;
          transform: translateY(-1px);
        }
        .action-btn.secondary {
          background: #1e1e2a;
          color: #e4e4e7;
          border: 1px solid #27272a;
        }
        .action-btn.secondary:hover {
          background: #27272a;
          border-color: #3f3f46;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .outfit {
          font-family: 'Outfit', sans-serif;
        }
        .fade-in {
          animation: fadeIn 0.4s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

export default function QuickAccessPage() {
  return (
    <Suspense fallback={
      <div style={{
        height: '100vh',
        background: '#0a0a0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#e4e4e7',
        fontFamily: 'sans-serif'
      }}>
        Đang tải...
      </div>
    }>
      <QuickAccessContent />
    </Suspense>
  );
}
