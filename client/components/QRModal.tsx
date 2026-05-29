'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/AppContext';
import { useFocusTrap } from './useFocusTrap';

interface QRModalProps {
  address: string;
  onClose: () => void;
}

export default function QRModal({ address, onClose }: QRModalProps) {
  const { t } = useApp();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, true);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    api.accounts.qr(address)
      .then(res => {
        if (!cancelled) setQrCode(res.qrCode);
      })
      .catch(err => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [address]);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-label={t('qrCode')}>
      <div className="modal fade-in" ref={modalRef} style={{ textAlign: 'center', maxWidth: 360 }}>
        <div className="modal-header">
          <h2 className="modal-title">{t('qrCode')}</h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="address-display">{address}</div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <div className="loading-spinner" />
          </div>
        ) : error ? (
          <div className="form-error">{error}</div>
        ) : qrCode ? (
          <img src={qrCode} alt={`QR Code for ${address}`} className="qr-image" />
        ) : null}

        <p className="qr-hint">{t('scanQRCode')}</p>

        <style jsx>{`
          .address-display {
            padding: 10px 16px;
            background: var(--bg-primary);
            border: 1px solid var(--border);
            border-radius: 0px;
            font-family: var(--font-mono), monospace;
            font-size: 14px;
            color: var(--accent);
            margin-bottom: 16px;
            word-break: break-all;
          }
          .qr-image {
            width: 256px;
            height: 256px;
            border-radius: 0px;
            border: 1px solid var(--border);
            display: block;
            margin: 0 auto;
            background: white;
          }
          .qr-hint {
            font-size: 12px;
            color: var(--text-muted);
            margin-top: 12px;
          }
        `}</style>
      </div>
    </div>
  );
}
