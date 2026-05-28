'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import AnimatedBackground from '@/components/AnimatedBackground';

interface EmailItem {
  id: string;
  from: string;
  subject: string;
  preview: string;
  code: string | null;
  receivedAt: string;
}

export default function OTPPage() {
  const [credential, setCredential] = useState('');
  const [verified, setVerified] = useState(false);
  const [address, setAddress] = useState('');
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [latestCode, setLatestCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null);
  const intervalRef = useRef<any>(null);
  const credentialRef = useRef('');

  // 2FA Authenticator Widget States
  const [twofaSecret, setTwofaSecret] = useState('');
  const [twofaOtp, setTwofaOtp] = useState('------');
  const [twofaRemaining, setTwofaRemaining] = useState(0);
  const [twofaError, setTwofaError] = useState('');
  const [twofaActive, setTwofaActive] = useState(false);
  const [copied2fa, setCopied2fa] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [show2faGuide, setShow2faGuide] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchEmails = useCallback(async (cred: string) => {
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: cred }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Lỗi');
        setVerified(false);
        return;
      }

      setVerified(true);
      setAddress(data.address);
      setEmails(data.emails || []);
      setError('');

      const withCode = (data.emails || []).find((e: EmailItem) => e.code);
      setLatestCode(withCode?.code || null);
    } catch {
      setError('Không thể kết nối server');
    }
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let trimmed = credential.trim();
    
    // Extract clean email|key credential from text
    const cleanRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\|([a-fA-F0-9]{32})(?:\|([a-zA-Z0-9]{16,64}))?/i;
    const match = trimmed.match(cleanRegex);
    if (match) {
      const email = match[1];
      const key = match[2];
      const twofa = match[3];
      trimmed = twofa ? `${email}|${key}|${twofa}` : `${email}|${key}`;
      setCredential(trimmed);
    }

    if (!trimmed || !trimmed.includes('|')) {
      setError('Nhập đúng định dạng: email|key hoặc email|key|2fa_secret');
      return;
    }
    
    setLoading(true);
    setError('');
    credentialRef.current = trimmed;

    // Extract 2FA secret if present
    const parts = trimmed.split('|');
    if (parts.length >= 3) {
      const secret = parts[2].trim();
      if (secret) {
        setTwofaSecret(secret);
        setTwofaActive(true);
      }
    } else {
      setTwofaSecret('');
      setTwofaActive(false);
    }

    // Clear old timers
    if (intervalRef.current) clearInterval(intervalRef.current);

    fetchEmails(trimmed).finally(() => setLoading(false));

    // Auto-refresh every 15s
    intervalRef.current = setInterval(() => fetchEmails(credentialRef.current), 15000);
  }

  function handleLogout() {
    setVerified(false);
    setCredential('');
    setAddress('');
    setEmails([]);
    setLatestCode(null);
    setSelectedEmail(null);
    setError('');
    credentialRef.current = '';
    setTwofaSecret('');
    setTwofaActive(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const calculate2fa = useCallback(async (secret: string) => {
    if (!secret.trim()) {
      setTwofaOtp('------');
      setTwofaRemaining(0);
      setTwofaError('');
      return;
    }

    try {
      const base32tohex = (b32: string) => {
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        let bits = "";
        let hex = "";
        let clean = b32.replace(/=+$/, "").replace(/\s/g, "").toUpperCase();
        for (let i = 0; i < clean.length; i++) {
          const val = alphabet.indexOf(clean.charAt(i));
          if (val === -1) throw new Error("Ký tự 2FA Secret không hợp lệ: " + clean.charAt(i));
          bits += val.toString(2).padStart(5, '0');
        }
        for (let i = 0; i + 4 <= bits.length; i += 4) {
          let chunk = bits.substr(i, 4);
          hex += parseInt(chunk, 2).toString(16);
        }
        return hex;
      };

      const hex = base32tohex(secret);
      const keyBytes = new Uint8Array((hex.match(/.{1,2}/g) || []).map(byte => parseInt(byte, 16)));
      
      const epoch = Math.floor(Date.now() / 1000);
      const counter = Math.floor(epoch / 30);
      
      const counterBytes = new Uint8Array(8);
      let tmp = counter;
      for (let i = 7; i >= 0; i--) {
        counterBytes[i] = tmp & 0xff;
        tmp = tmp >> 8;
      }

      const cryptoKey = await window.crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "HMAC", hash: { name: "SHA-1" } },
        false,
        ["sign"]
      );

      const signature = await window.crypto.subtle.sign(
        "HMAC",
        cryptoKey,
        counterBytes
      );

      const hmacResult = new Uint8Array(signature);
      const offset = hmacResult[hmacResult.length - 1] & 0xf;
      const code =
        ((hmacResult[offset] & 0x7f) << 24) |
        ((hmacResult[offset + 1] & 0xff) << 16) |
        ((hmacResult[offset + 2] & 0xff) << 8) |
        (hmacResult[offset + 3] & 0xff);

      const otp = code % 1000000;
      const formattedOtp = otp.toString().padStart(6, '0');
      setTwofaOtp(`${formattedOtp.substr(0, 3)} ${formattedOtp.substr(3, 3)}`);
      setTwofaRemaining(30 - (epoch % 30));
      setTwofaError('');
    } catch (err: any) {
      setTwofaOtp('ERROR');
      setTwofaError(err.message || 'Mã Secret không hợp lệ');
    }
  }, []);

  useEffect(() => {
    let timer: any = null;
    if (twofaActive && twofaSecret) {
      calculate2fa(twofaSecret);
      timer = setInterval(() => {
        calculate2fa(twofaSecret);
      }, 1000);
    } else {
      setTwofaOtp('------');
      setTwofaRemaining(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [twofaActive, twofaSecret, calculate2fa]);

  function copyCode(code: string, id: string) {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'Vừa xong';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
    return d.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  if (!mounted) {
    return (
      <div className="otp-page">
        <AnimatedBackground variant="gradient" intensity="low" />
        <div className="otp-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
          <div className="spinner" />
        </div>
        <style jsx>{`
          .otp-page {
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
          }
          .otp-container {
            width: 100%;
            max-width: 460px;
            z-index: 10;
            background: linear-gradient(135deg, #0c1523 0%, #060d17 100%);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 40px;
          }
          .spinner {
            width: 28px;
            height: 28px;
            border: 2px solid var(--border);
            border-top-color: var(--accent);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="otp-page">
      <AnimatedBackground variant="gradient" intensity="low" />
      <div 
        className="otp-container" 
        style={{ 
          maxWidth: verified ? '900px' : '460px', 
          width: '100%', 
          transition: 'max-width 0.4s cubic-bezier(0.16, 1, 0.3, 1)' 
        }}
      >
        {/* Header */}
        <div className="otp-header">
          <div className="otp-logo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="2"/>
              <path d="M2 7L12 13L22 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>tmailCC</span>
          </div>
          <p className="otp-subtitle">Nhập mã truy cập để lấy mã xác minh email</p>
        </div>

        {!verified ? (
          /* Login Form */
          <form className="otp-form fade-in" onSubmit={handleSubmit}>
            <div className="input-group">
              <label>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Mã truy cập
              </label>
              <input
                type="text"
                placeholder="email@domain.com|accesskey hoặc email@domain.com|accesskey|2fa_secret"
                value={credential}
                onChange={e => {
                  setCredential(e.target.value);
                  setError('');
                }}
                autoFocus
                spellCheck={false}
              />
              <span className="input-hint">Định dạng: email|key hoặc email|key|2fa_secret</span>
            </div>

            {error && <div className="form-error-otp">{error}</div>}

            <button type="submit" className="submit-btn" disabled={loading || !credential.trim()}>
              {loading ? (
                <span className="spinner" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="10 17 15 12 10 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="15" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              )}
              Truy cập
            </button>
          </form>
        ) : (
          /* Verified — show codes & emails */
          <div className="verified-section fade-in">
            {/* Account bar */}
            <div className="account-bar">
              <div className="account-info">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M2 7L12 13L22 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span className="account-addr">{address}</span>
                <span className="live-badge">
                  <span className="pulse-dot" />
                  Live
                </span>
              </div>
              <button className="logout-btn" onClick={handleLogout} title="Đăng xuất">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="otp-columns">
              {/* Left Column - Mailbox OTP */}
              <div className="otp-column-left">
                {/* Latest OTP Code */}
                <div className="code-card">
                  <div className="code-card-header">
                    <span className="code-label">Mã xác minh mới nhất</span>
                    <span className="auto-refresh-badge">
                      <span className="pulse-dot" />
                      Tự động cập nhật
                    </span>
                  </div>
                  <div className="code-display">
                    {latestCode ? (
                      <>
                        <span className="code-value">{latestCode}</span>
                        <button
                          className={`copy-btn ${copied === 'main' ? 'copied' : ''}`}
                          onClick={() => copyCode(latestCode, 'main')}
                          title="Copy mã xác minh"
                        >
                          {copied === 'main' ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                              <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2"/>
                            </svg>
                          )}
                        </button>
                      </>
                    ) : (
                      <span className="code-empty">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" opacity="0.4">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                          <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        Đang chờ mã mới...
                      </span>
                    )}
                  </div>
                </div>

                {/* Email List */}
                {emails.length > 0 && (
                  <div className="email-section">
                    <div className="email-section-header">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M2 7L12 13L22 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      Thư đến ({emails.length})
                    </div>
                    <div className="email-list-otp">
                      {emails.map(em => (
                        <button
                          key={em.id}
                          className={`email-row ${selectedEmail?.id === em.id ? 'active' : ''}`}
                          onClick={() => setSelectedEmail(selectedEmail?.id === em.id ? null : em)}
                        >
                          <div className="email-row-top">
                            <span className="email-from">{em.from}</span>
                            <span className="email-time">{formatTime(em.receivedAt)}</span>
                          </div>
                          <div className="email-subject-otp">{em.subject}</div>
                          {em.code && (
                            <div className="email-code-badge" onClick={(ev) => { ev.stopPropagation(); copyCode(em.code!, 'e-' + em.id); }} title="Click để copy mã">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2"/>
                              </svg>
                              <span>{em.code}</span>
                              {copied === 'e-' + em.id && (
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                                </svg>
                              )}
                            </div>
                          )}
                          {selectedEmail?.id === em.id && (
                            <div className="email-preview-expanded">{em.preview}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {emails.length === 0 && (
                  <div className="empty-state-otp">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" opacity="0.2">
                      <rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M2 7L12 13L22 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <p>Chưa có thư — đang chờ email mới...</p>
                  </div>
                )}
              </div>

              {/* Right Column - 2FA Authenticator */}
              <div className="otp-column-right">
                {/* Widget 2FA Authenticator */}
                <div className="code-card mfa-card" style={{ height: '100%' }}>
                  <div className="code-card-header">
                    <span className="code-label mfa-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                      Giải mã 2FA (Authenticator)
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button 
                        className={`mfa-toggle-btn ${twofaActive ? 'active' : ''}`}
                        onClick={() => setTwofaActive(!twofaActive)}
                        disabled={!twofaSecret.trim()}
                      >
                        {twofaActive ? 'Đang chạy' : 'Bật sinh mã'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShow2faGuide(true)}
                        title="Hướng dẫn sử dụng 2FA"
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          border: '1px solid var(--border)',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          background: 'transparent',
                          padding: 0
                        }}
                        className="hover-accent"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5"/>
                          <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                          <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="mfa-input-wrapper">
                    <input 
                      type="text" 
                      className="mfa-input"
                      placeholder="Dán mã 2FA Secret Key (Base32) tại đây..."
                      value={twofaSecret}
                      onChange={(e) => {
                        setTwofaSecret(e.target.value);
                        if (e.target.value.trim()) {
                          setTwofaActive(true);
                        } else {
                          setTwofaActive(false);
                        }
                      }}
                      spellCheck={false}
                    />
                    <button 
                      type="button"
                      className="mfa-paste-btn"
                      onClick={async () => {
                        try {
                          if (!navigator.clipboard || !navigator.clipboard.readText) {
                            throw new Error("Clipboard API not supported");
                          }
                          const text = await navigator.clipboard.readText();
                          if (text) {
                            setTwofaSecret(text);
                            setTwofaActive(true);
                            setTwofaError("");
                          }
                        } catch (err) {
                          console.error("Failed to read clipboard:", err);
                          setTwofaError("Không có quyền đọc Clipboard. Hãy cấp quyền cho trình duyệt hoặc dùng phím tắt Ctrl+V để dán.");
                          setTimeout(() => setTwofaError(""), 5000);
                        }
                      }}
                      title="Dán từ Clipboard"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                      </svg>
                    </button>
                  </div>

                  {twofaError && <div className="form-error-otp" style={{ marginTop: '10px' }}>{twofaError}</div>}

                  {twofaSecret && !twofaError && (
                    <div className="mfa-display-area">
                      <div className="code-display" style={{ marginTop: '15px' }}>
                        <span className="code-value">{twofaOtp}</span>
                        {twofaOtp !== '------' && (
                          <button
                            className={`copy-btn ${copied2fa ? 'copied' : ''}`}
                            onClick={() => {
                              const rawOtp = twofaOtp.replace(/\s/g, '');
                              navigator.clipboard?.writeText(rawOtp).then(() => {
                                setCopied2fa(true);
                                setTimeout(() => setCopied2fa(false), 2000);
                              });
                            }}
                            title="Copy mã 2FA"
                          >
                            {copied2fa ? (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            ) : (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2"/>
                              </svg>
                            )}
                          </button>
                        )}
                      </div>

                      {twofaRemaining > 0 && (
                        <div className="mfa-progress-row">
                          <span className="mfa-timer-text">Xoay vòng sau {twofaRemaining} giây</span>
                          <div className="mfa-progress-track">
                            <div 
                              className="mfa-progress-bar" 
                              style={{ 
                                width: `${(twofaRemaining / 30) * 100}%`
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {show2faGuide && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 fade-in"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(4px)',
              zIndex: 200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            <div 
              className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl max-w-lg w-full p-6 shadow-2xl relative"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                maxWidth: '512px',
                width: '100%',
                padding: '24px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                position: 'relative',
              }}
            >
              <button 
                onClick={() => setShow2faGuide(false)}
                className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <h3 
                className="text-lg font-bold text-[var(--accent)] mb-4 flex items-center gap-2"
                style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: 'var(--accent)',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5"/>
                  <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                  <line x1="12" y1="8" x2="12.01" y2="8" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                </svg>
                Hướng dẫn Giải mã 2FA
              </h3>

              <div 
                className="text-sm text-[var(--text-secondary)] space-y-4 leading-relaxed"
                style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.6',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <p>
                  Chức năng <strong>Giải mã 2FA (Authenticator)</strong> trên trang <strong>/otp</strong> được xây dựng theo tiêu chuẩn quốc tế <strong>TOTP (RFC 6238)</strong> — đây chính là chuẩn chung mà Google Authenticator và Microsoft Authenticator đang sử dụng.
                </p>
                <p>
                  Vì vậy, chức năng này hoàn toàn sử dụng được cho <strong>Spotify, Grok (X), Facebook, GitHub, Google, Discord, Microsoft...</strong> và hầu hết mọi dịch vụ trực tuyến hiện nay, chứ không chỉ giới hạn ở ChatGPT.
                </p>
                
                <div 
                  className="bg-[var(--bg-primary)] p-4 rounded-lg border border-[var(--border)]"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <h4 className="font-semibold text-[var(--text-primary)] mb-2" style={{ fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '8px' }}>
                    Cách sử dụng cho các dịch vụ khác:
                  </h4>
                  <ol className="list-decimal list-inside space-y-2 pl-1" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li>
                      Khi bạn bật bảo mật 2 lớp (2FA) trên các trang web như Spotify, Grok,... họ sẽ hiển thị một mã QR kèm theo một dòng mã chữ và số viết hoa gọi là <strong>Secret Key</strong> (Khóa bí mật hoặc Mã thiết lập thủ công).
                    </li>
                    <li>
                      Bạn chỉ cần sao chép đoạn <strong>Secret Key</strong> đó và dán vào ô <strong>Giải mã 2FA (Authenticator)</strong> trên tmailCC.
                    </li>
                    <li>
                      Hệ thống sẽ ngay lập tức sinh ra mã 6 chữ số tự động xoay vòng sau mỗi 30 giây, trùng khớp hoàn toàn với mã hiển thị trên ứng dụng Google Authenticator ở điện thoại của bạn.
                    </li>
                  </ol>
                </div>
              </div>

              <div className="mt-6 flex justify-end" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => setShow2faGuide(false)}
                  className="btn btn-primary px-5 py-2 text-sm font-semibold"
                  style={{
                    padding: '8px 20px',
                    fontSize: '14px',
                    fontWeight: 'semibold',
                    borderRadius: '6px',
                    backgroundColor: 'var(--accent)',
                    color: 'var(--bg-primary)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Đã hiểu
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .otp-container {
          transition: max-width 0.3s ease;
        }
        .otp-container.verified-wide {
          max-width: 900px;
        }
        .otp-columns {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 16px;
          align-items: start;
          width: 100%;
          margin-top: 12px;
        }
        .otp-column-left,
        .otp-column-right {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }
        @media (max-width: 768px) {
          .otp-columns {
            grid-template-columns: 1fr;
          }
        }
        .mfa-card {
          margin-top: 0;
        }
        .mfa-toggle-btn {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-muted);
          padding: 3px 8px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .mfa-toggle-btn.active {
          color: var(--success);
          border-color: var(--success);
          background: rgba(76, 163, 116, 0.05);
        }
        .mfa-toggle-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .mfa-input-wrapper {
          position: relative;
          margin-top: 10px;
        }
        .mfa-input {
          width: 100%;
          padding: 10px 40px 10px 12px;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 13px;
          font-family: 'JetBrains Mono', monospace;
          outline: none;
          transition: border-color 0.2s;
        }
        .mfa-input:focus {
          border-color: var(--accent);
        }
        .mfa-paste-btn {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          border-radius: 6px;
          transition: all 0.2s;
        }
        .mfa-paste-btn:hover {
          color: var(--accent);
          background: rgba(255, 255, 255, 0.06);
        }
        .mfa-display-area {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .mfa-progress-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
        }
        .mfa-timer-text {
          font-size: 11px;
          color: var(--text-muted);
          white-space: nowrap;
        }
        .mfa-progress-track {
          flex: 1;
          height: 4px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 99px;
          overflow: hidden;
          position: relative;
        }
        .mfa-progress-bar {
          height: 100%;
          border-radius: 99px;
          transition: width 1s linear;
          background: var(--success);
        }
        .otp-page {
          height: 100vh;
          overflow-y: auto;
          background: transparent;
          color: var(--text-primary);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 40px 16px;
          font-family: var(--font-body), sans-serif;
          position: relative;
        }
        .otp-container { width: 100%; max-width: 460px; z-index: 10; }
        .otp-header { text-align: center; margin-bottom: 28px; }
        .otp-logo {
          display: flex; align-items: center; justify-content: center;
          gap: 10px; font-size: 24px; font-weight: 700; color: var(--accent); margin-bottom: 6px;
          font-family: var(--font-display), 'Cinzel', serif;
        }
        .otp-subtitle { font-size: 13px; color: var(--text-muted); }

        /* Form */
        .otp-form {
          background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 14px;
          padding: 24px; display: flex; flex-direction: column; gap: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .input-group label {
          display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600;
          color: var(--text-secondary); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .input-group input {
          width: 100%; padding: 12px 14px; background: var(--bg-primary); border: 1px solid var(--border);
          border-radius: 10px; color: var(--text-primary); font-size: 15px;
          font-family: 'JetBrains Mono', 'Fira Code', monospace; outline: none; transition: border-color 0.2s;
        }
        .input-group input:focus { border-color: var(--accent); }
        .input-group input::placeholder { color: var(--text-muted); opacity: 0.5; }
        .input-hint { font-size: 11px; color: var(--text-muted); margin-top: 4px; }
        .form-error-otp {
          font-size: 13px; color: var(--error); background: rgba(212, 85, 76, 0.1);
          padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(212, 85, 76, 0.2);
        }
        .submit-btn {
          display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px;
          background: linear-gradient(135deg, var(--accent), var(--accent-hover)); border: none; border-radius: 10px;
          color: var(--bg-primary); font-size: 14px; font-weight: 700; font-family: inherit;
          cursor: pointer; transition: opacity 0.2s, transform 0.15s;
        }
        .submit-btn:hover:not(:disabled) { opacity: 0.95; transform: translateY(-1px); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .spinner {
          width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Verified Section */
        .verified-section { display: flex; flex-direction: column; gap: 14px; }
        .account-bar {
          display: flex; align-items: center; justify-content: space-between;
          background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px;
        }
        .account-info { display: flex; align-items: center; gap: 8px; }
        .account-addr {
          font-size: 13px; font-family: 'JetBrains Mono', monospace;
          color: var(--text-secondary); max-width: 250px; overflow: hidden; text-overflow: ellipsis;
        }
        .live-badge {
          display: flex; align-items: center; gap: 4px;
          font-size: 10px; font-weight: 700; color: var(--success); text-transform: uppercase;
        }
        .pulse-dot {
          width: 6px; height: 6px; border-radius: 50%; background: var(--success);
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.8)} }
        .logout-btn {
          width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border);
          background: transparent; color: var(--text-muted); cursor: pointer;
          display: flex; align-items: center; justify-content: center; transition: all 0.15s;
        }
        .logout-btn:hover { background: var(--bg-hover); color: var(--error); }

        /* Code Card */
        .code-card {
          background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 14px; padding: 18px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .code-card-header {
          display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;
        }
        .code-label {
          font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;
        }
        .auto-refresh-badge {
          display: flex; align-items: center; gap: 5px; font-size: 10px; color: var(--success);
        }
        .code-display { display: flex; align-items: center; gap: 12px; }
        .code-value {
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 36px; font-weight: 700; letter-spacing: 8px; color: var(--accent); flex: 1;
        }
        .code-empty {
          display: flex; align-items: center; gap: 8px;
          font-size: 13px; color: var(--text-muted); font-style: italic;
        }
        .copy-btn {
          width: 40px; height: 40px; border-radius: 10px; border: 1px solid var(--border);
          background: var(--bg-tertiary); color: var(--text-secondary); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s; flex-shrink: 0;
        }
        .copy-btn:hover { background: var(--bg-hover); color: var(--text-primary); border-color: var(--border-light); }
        .copy-btn.copied { border-color: var(--success); color: var(--success); background: rgba(76, 163, 116, 0.1); }

        /* Email List */
        .email-section { margin-top: 4px; }
        .email-section-header {
          display: flex; align-items: center; gap: 6px;
          font-size: 11px; font-weight: 600; color: var(--text-muted);
          text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; padding: 0 2px;
        }
        .email-list-otp { display: flex; flex-direction: column; gap: 6px; }
        .email-row {
          width: 100%; text-align: left; background: var(--bg-secondary); border: 1px solid var(--border);
          border-radius: 10px; padding: 12px 14px; cursor: pointer; transition: all 0.15s;
          display: flex; flex-direction: column; gap: 4px; color: inherit; font-family: inherit;
        }
        .email-row:hover { border-color: var(--border-light); background: var(--bg-hover); }
        .email-row.active { border-color: var(--accent); background: var(--accent-subtle); }
        .email-row-top { display: flex; justify-content: space-between; align-items: center; }
        .email-from {
          font-size: 13px; font-weight: 600; color: var(--text-primary);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px;
        }
        .email-time { font-size: 11px; color: var(--text-muted); flex-shrink: 0; }
        .email-subject-otp {
          font-size: 12px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .email-code-badge {
          display: inline-flex; align-items: center; gap: 5px;
          background: var(--accent-subtle); color: var(--accent);
          font-size: 13px; font-weight: 700; font-family: 'JetBrains Mono', monospace;
          padding: 4px 10px; border-radius: 6px; cursor: pointer;
          width: fit-content; margin-top: 2px; transition: background 0.15s;
          border: 1px solid rgba(217, 167, 82, 0.2);
        }
        .email-code-badge:hover { background: rgba(217, 167, 82, 0.2); }
        .email-preview-expanded {
          font-size: 12px; color: var(--text-secondary); line-height: 1.5; margin-top: 6px;
          padding-top: 8px; border-top: 1px solid var(--border); white-space: pre-wrap; word-break: break-word;
        }
        .empty-state-otp { text-align: center; padding: 40px 20px; color: var(--text-muted); }
        .empty-state-otp p { font-size: 13px; margin-top: 12px; }
        .fade-in {
          animation: fadeIn 0.4s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        @media (max-width: 480px) {
          .otp-page { padding: 20px 12px; }
          .code-value { font-size: 28px; letter-spacing: 5px; }
          .account-addr { max-width: 160px; }
        }
      `}</style>
    </div>
  );
}
