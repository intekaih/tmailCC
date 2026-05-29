'use client';

import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/lib/AppContext';
import { useFocusTrap } from './useFocusTrap';
import type { ConfirmAction } from './admin/types';

// Admin tab components
import AdminStatsTab from './admin/AdminStatsTab';
import AdminUsersTab from './admin/AdminUsersTab';
import AdminDomainsTab from './admin/AdminDomainsTab';
import AdminConfigTab from './admin/AdminConfigTab';
import AdminBlocklistTab from './admin/AdminBlocklistTab';
import AdminOtpKeysTab from './admin/AdminOtpKeysTab';
import AdminDotmailsTab from './admin/AdminDotmailsTab';

// Developer / Account settings components
import DeveloperUsageTab from './admin/DeveloperUsageTab';
import DeveloperKeysTab from './admin/DeveloperKeysTab';
import DeveloperWebhooksTab from './admin/DeveloperWebhooksTab';
import ChangePasswordTab from './admin/ChangePasswordTab';

import ConfirmDialog from './admin/ConfirmDialog';

interface SettingsPanelProps {
  onClose: () => void;
  onDomainsChanged?: () => void;
  defaultTab?: string;
}

export default function SettingsPanel({ onClose, onDomainsChanged, defaultTab }: SettingsPanelProps) {
  const { user, t, toast } = useApp();
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, true);

  // Initialize active tab based on defaultTab or fallback to 'stats'
  const [tab, setTab] = useState<string>(defaultTab || (user?.role === 'admin' ? 'domains' : 'keys'));

  // Shared state for child tabs
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  // Cast t to match AdminTabProps signature
  const tFn = t as (key: string) => string;

  // Shared props passed to all tab components
  const sharedProps = {
    loadingData,
    loading,
    setLoading,
    error,
    setError,
    toast,
    t: tFn,
    setConfirmAction,
  };

  const tabs = [
    // Most-used tabs first (admin-only)
    ...(user?.role === 'admin'
      ? [
          { id: 'domains', label: t('domains') || 'Tên miền', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg> },
          { id: 'dotmails', label: 'Dotmail', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> },
        ]
      : []),
    // Developer & User tabs
    { id: 'keys', label: 'API Keys', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg> },
    { id: 'webhooks', label: 'Webhooks', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg> },
    // Admin-only management tabs
    ...(user?.role === 'admin'
      ? [
          { id: 'otpkeys', label: 'OTP Keys', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round"/></svg> },
          { id: 'users', label: t('users') || 'Người dùng', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
          { id: 'config', label: t('config') || 'Cấu hình', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
          { id: 'blocklist', label: t('blocklist') || 'Chặn IP', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg> },
          { id: 'stats', label: t('stats') || 'Thống kê', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="18" y="3" width="4" height="18" rx="1"/><rect x="10" y="8" width="4" height="13" rx="1"/><rect x="2" y="13" width="4" height="8" rx="1"/></svg> },
        ]
      : [
          // Non-admin: stats tab
          { id: 'stats', label: t('stats') || 'Thống kê', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="18" y="3" width="4" height="18" rx="1"/><rect x="10" y="8" width="4" height="13" rx="1"/><rect x="2" y="13" width="4" height="8" rx="1"/></svg> },
        ]),
    // Profile tab always last
    { id: 'password', label: t('changeInfo') || 'Đổi thông tin', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
  ];

  function handleTabChange(newTab: string) {
    setTab(newTab);
    setError('');
  }

  function renderActiveTab() {
    switch (tab) {
      // Admin tabs
      case 'stats':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {user?.role === 'admin' && <AdminStatsTab loadingData={loadingData} t={tFn} />}
            <DeveloperUsageTab {...sharedProps} />
          </div>
        );
      case 'users':
        return <AdminUsersTab {...sharedProps} />;
      case 'domains':
        return <AdminDomainsTab {...sharedProps} onDomainsChanged={onDomainsChanged} />;
      case 'config':
        return <AdminConfigTab {...sharedProps} />;
      case 'blocklist':
        return <AdminBlocklistTab {...sharedProps} />;
      case 'otpkeys':
        return <AdminOtpKeysTab {...sharedProps} />;
      case 'dotmails':
        return <AdminDotmailsTab {...sharedProps} />;

      // Developer tabs
      case 'keys':
        return <DeveloperKeysTab {...sharedProps} />;
      case 'webhooks':
        return <DeveloperWebhooksTab {...sharedProps} />;
      case 'password':
        return <ChangePasswordTab {...sharedProps} />;

      default:
        return null;
    }
  }

  // Handle keyboard listener to close Settings modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !confirmAction) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmAction, onClose]);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-label={t('settings') || 'Cài đặt'}>
      <div className="settings-panel fade-in" ref={modalRef}>
        <div className="modal-header">
          <h2 className="modal-title">{t('settings') || 'Cài đặt hệ thống & Tài khoản'}</h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}

        <div className="tab-bar">
          {tabs.map(tb => (
            <button
              key={tb.id}
              className={`tab-btn ${tab === tb.id ? 'active' : ''}`}
              onClick={() => handleTabChange(tb.id)}
            >
              {tb.icon}
              <span style={{ marginLeft: 6 }}>{tb.label}</span>
            </button>
          ))}
        </div>

        <div className="tab-content">
          {renderActiveTab()}
        </div>
      </div>

      {confirmAction && (
        <ConfirmDialog
          action={confirmAction}
          onClose={() => setConfirmAction(null)}
          t={tFn}
        />
      )}

      <style jsx>{`
        .settings-panel {
          background: var(--bg-primary);
          border: 2px solid var(--border);
          border-radius: 0px;
          width: 95vw;
          max-width: 1400px;
          height: 700px;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow);
          position: relative;
        }
        .settings-panel::before {
          content: '';
          display: none;
        }
        .settings-panel > * {
          position: relative;
          z-index: 1;
        }
        .modal-header {
          padding: 20px 24px;
          margin: 0;
          border-bottom: 2px solid var(--border-light);
        }
        .tab-bar {
          display: flex;
          border-bottom: 2px solid var(--border-light);
          padding: 0 24px;
          background: var(--bg-secondary);
          gap: 4px;
          overflow-x: auto;
          scrollbar-width: none;
          ms-overflow-style: none;
        }
        .tab-bar::-webkit-scrollbar { display: none; }
        @media (max-width: 640px) {
          .tab-bar { gap: 0; padding: 0 12px; }
          .tab-btn { padding: 10px 10px; font-size: 12px; }
        }
        .tab-btn {
          display: flex;
          align-items: center;
          padding: 14px 18px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 13.5px;
          font-family: inherit;
          color: var(--text-secondary);
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          transition: all 0.15s var(--ease-out);
          white-space: nowrap;
          font-weight: 500;
        }
        .tab-btn:hover {
          color: var(--text-primary);
        }
        .tab-btn.active {
          color: var(--accent) !important;
          border-bottom-color: var(--accent) !important;
          font-weight: 600;
        }
        .tab-content {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }

        :global(.add-domain-form) {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-light);
          padding: 16px;
          border-radius: 0px;
          margin-bottom: 24px;
        }
        :global(html[data-theme="light"]) :global(.add-domain-form) {
          background: rgba(0, 0, 0, 0.02);
        }
        :global(.add-domain-form .input) {
          flex: 1 1 160px;
          max-width: 260px;
          padding: 8px 12px;
          height: 38px;
          font-size: 13px;
        }
        :global(.checkbox-label) {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-family: var(--font-mono);
          cursor: pointer;
          user-select: none;
          color: var(--text-secondary);
        }
        :global(.checkbox-label input) {
          width: 15px;
          height: 15px;
          accent-color: var(--accent);
        }
        :global(.add-domain-form .btn) {
          height: 38px;
          padding: 0 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </div>
  );
}
