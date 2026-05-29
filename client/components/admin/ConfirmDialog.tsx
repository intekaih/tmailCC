'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ConfirmAction } from './types';

interface ConfirmDialogProps {
  action: ConfirmAction;
  onClose: () => void;
  t: (key: string) => string;
}

export default function ConfirmDialog({ action, onClose, t }: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  async function handleConfirm() {
    setLoading(true);
    try {
      await action.onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div className="confirm-overlay" onClick={() => !loading && onClose()}>
      <div className="confirm-dialog fade-in" role="dialog" aria-modal="true" aria-label={action.title} onClick={e => e.stopPropagation()}>
        <div className="confirm-header">
          <div className="confirm-title">{action.title}</div>
        </div>
        <div className="confirm-body">{action.message}</div>
        <div className="confirm-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={loading} style={{ height: '38px', borderRadius: 0 }}>
            {t('no')}
          </button>
          <button className="btn btn-primary btn-danger-monochrome" onClick={handleConfirm} disabled={loading} style={{ height: '38px', borderRadius: 0 }}>
            {loading ? t('loading') : t('yes')}
          </button>
        </div>
      </div>

      <style jsx>{`
        .confirm-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(2px);
          padding: 16px;
        }
        .confirm-dialog {
          background: var(--bg-primary);
          border: 2px solid var(--border);
          border-radius: 0px;
          width: min(400px, 100%);
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          box-shadow: 0 15px 50px rgba(0, 0, 0, 0.5);
          position: relative;
          text-align: center;
        }
        .confirm-header {
          display: flex;
          justify-content: center;
          border-bottom: 2px solid var(--border-light);
          padding-bottom: 12px;
        }
        .confirm-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
          font-family: var(--font-display), Georgia, serif;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .confirm-body {
          font-size: 14.5px;
          color: var(--text-secondary);
          line-height: 1.6;
          padding: 4px 0;
        }
        .confirm-actions {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-top: 8px;
        }
        .btn-danger-monochrome {
          background-color: var(--accent);
          color: var(--bg-primary);
        }
        .btn-danger-monochrome:hover {
          background-color: #ff3366 !important;
          color: #ffffff !important;
          border-color: #ff3366 !important;
        }
        
        .fade-in {
          animation: fadeIn 0.12s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.96);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>,
    document.body
  );
}
