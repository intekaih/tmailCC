'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { TableSkeleton } from '../SkeletonLoader';
import type { AdminTabProps } from './types';

interface AdminDomainsTabProps extends AdminTabProps {
  onDomainsChanged?: () => void;
}

export default function AdminDomainsTab({
  loadingData, loading, setLoading, error, setError, toast, t, setConfirmAction, onDomainsChanged,
}: AdminDomainsTabProps) {
  const [domains, setDomains] = useState<any[]>([]);
  const [newDomain, setNewDomain] = useState({ domain: '', label: '', isDefault: false });
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [cfDomains, setCfDomains] = useState<any[] | null>(null);
  const [showCfList, setShowCfList] = useState(false);
  const [selectedCfDomains, setSelectedCfDomains] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  if (!initialized && !loadingData) {
    setInitialized(true);
    loadDomains();
  }

  async function loadDomains() {
    try {
      const data = await api.admin.domains();
      setDomains(data.domains);
    } catch (err: any) { setError(err.message); }
  }

  async function handleAddDomain() {
    if (!newDomain.domain) return;
    setLoading(true);
    try {
      await api.admin.addDomain(newDomain);
      setNewDomain({ domain: '', label: '', isDefault: false });
      loadDomains();
      toast(t('created') + ': ' + newDomain.domain, 'success');
      onDomainsChanged?.();
    } catch (err: any) {
      setError(err.message);
      toast(err.message || t('error'), 'error');
    }
    setLoading(false);
  }

  function handleDeleteDomain(id: string) {
    setConfirmAction({
      title: t('remove'),
      message: t('removeThisDomain'),
      onConfirm: async () => {
        try {
          await api.admin.deleteDomain(id);
          loadDomains();
          onDomainsChanged?.();
        } catch (err: any) { setError(err.message); }
      },
    });
  }

  async function handleSyncCloudflare() {
    setSyncLoading(true); setError(''); setSyncResult(null);
    try {
      const res = await api.admin.listCloudflare();
      if (res.success && Array.isArray(res.domains)) {
        setCfDomains(res.domains);
        setSelectedCfDomains(res.domains.filter((d: any) => !d.alreadySynced && d.status === 'active').map((d: any) => d.domain));
        setShowCfList(true);
      } else { throw new Error('Không thể tải danh sách domain từ Cloudflare.'); }
    } catch (err: any) {
      setError(err.message);
      toast(err.message || 'Lỗi khi kết nối Cloudflare', 'error');
    } finally { setSyncLoading(false); }
  }

  async function executeSelectedSync() {
    if (selectedCfDomains.length === 0) { toast('Vui lòng chọn ít nhất 1 domain để đồng bộ', 'info'); return; }
    setSyncLoading(true); setError(''); setSyncResult(null);
    try {
      const result = await api.admin.syncCloudflare(selectedCfDomains);
      setSyncResult(result);
      if (result.added.length > 0) {
        toast(`Đã thêm ${result.added.length} domain từ Cloudflare: ${result.added.join(', ')}`, 'success');
        loadDomains(); onDomainsChanged?.();
        setShowCfList(false); setCfDomains(null);
      } else { toast('Không có domain mới nào được thêm vào', 'info'); }
    } catch (err: any) {
      setError(err.message);
      toast(err.message || 'Lỗi khi đồng bộ Cloudflare', 'error');
    } finally { setSyncLoading(false); }
  }

  async function handleCheckConfigureDomain(domainName: string) {
    setSyncLoading(true); setError(''); setSyncResult(null);
    try {
      const result = await api.admin.syncCloudflare([domainName]);
      setSyncResult(result);
      if (result.errors.length > 0) {
        toast(`Lỗi khi cấu hình domain ${domainName}: ${result.errors.join('; ')}`, 'error');
      } else {
        toast(`Đã cấu hình thành công domain ${domainName}`, 'success');
        loadDomains(); onDomainsChanged?.();
      }
    } catch (err: any) {
      setError(err.message);
      toast(err.message || 'Lỗi khi cấu hình domain', 'error');
    } finally { setSyncLoading(false); }
  }

  if (loadingData) return <TableSkeleton />;

  return (
    <div>
      {/* Add Domain Form */}
      <div className="add-domain-form">
        <input className="input" placeholder={t('domain')} value={newDomain.domain}
          onChange={e => setNewDomain(prev => ({ ...prev, domain: e.target.value }))} />
        <input className="input" placeholder={t('labelOptional')} value={newDomain.label}
          onChange={e => setNewDomain(prev => ({ ...prev, label: e.target.value }))} />
        <label className="checkbox-label">
          <input type="checkbox" checked={newDomain.isDefault}
            onChange={e => setNewDomain(prev => ({ ...prev, isDefault: e.target.checked }))} />
          {t('default')}
        </label>
        <button className="btn btn-primary btn-sm" onClick={handleAddDomain} disabled={loading}>{t('addDomain')}</button>
        <button className="btn btn-sm cf-sync-btn" onClick={handleSyncCloudflare} disabled={syncLoading} title="Đồng bộ domain từ Cloudflare">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={syncLoading ? 'spin-animation' : ''}>
            <path d="M4 4v5h5M20 20v-5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L4 7m16 10l-1.64 1.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          {syncLoading ? 'Đang đồng bộ...' : 'Sync Cloudflare'}
        </button>
      </div>

      {/* CF Domain Selection */}
      {showCfList && cfDomains && (
        <div className="cf-domains-list">
          <div className="cf-domains-title">Danh sách tên miền trên Cloudflare</div>
          <div className="cf-domains-grid">
            {cfDomains.map((zone: any) => (
              <div key={zone.id} className="cf-domain-row">
                <label className={`cf-domain-check ${zone.alreadySynced ? 'disabled' : ''}`}>
                  <input type="checkbox" checked={zone.alreadySynced || selectedCfDomains.includes(zone.domain)} disabled={zone.alreadySynced}
                    onChange={e => e.target.checked ? setSelectedCfDomains(p => [...p, zone.domain]) : setSelectedCfDomains(p => p.filter(d => d !== zone.domain))} />
                  <span>{zone.domain}</span>
                </label>
                <span className={`cf-domain-status ${zone.alreadySynced ? 'synced' : ''}`}>{zone.alreadySynced ? 'Đã liên kết' : zone.status}</span>
              </div>
            ))}
          </div>
          <div className="cf-actions-row">
            <label className="checkbox-label" style={{ margin: 0 }}>
              <input type="checkbox"
                checked={cfDomains.filter(d => !d.alreadySynced).length > 0 && cfDomains.filter(d => !d.alreadySynced).every(d => selectedCfDomains.includes(d.domain))}
                onChange={e => setSelectedCfDomains(e.target.checked ? cfDomains.filter(d => !d.alreadySynced).map(d => d.domain) : [])} />
              Chọn tất cả
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowCfList(false); setCfDomains(null); }} disabled={syncLoading}>Hủy</button>
              <button className="btn btn-primary btn-sm" onClick={executeSelectedSync} disabled={syncLoading || selectedCfDomains.length === 0}>
                {syncLoading ? 'Đang đồng bộ...' : 'Đồng bộ đã chọn'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Result */}
      {syncResult && (
        <div className="cf-sync-result">
          <div className="cf-sync-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span>Cloudflare: {syncResult.cloudflareTotal} domains</span>
          </div>
          {syncResult.added.length > 0 && <div className="cf-sync-added"><strong>Đã thêm mới ({syncResult.added.length}):</strong> {syncResult.added.join(', ')}</div>}
          {syncResult.added.length === 0 && <div className="cf-sync-info">Tất cả domain đã được đồng bộ.</div>}
          {syncResult.logs?.length > 0 && (
            <div className="cf-sync-logs"><details>
              <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '8px' }}>Xem chi tiết log ({syncResult.logs.length} dòng)</summary>
              <pre style={{ marginTop: '6px', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', maxHeight: '150px', overflowY: 'auto', fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{syncResult.logs.join('\n')}</pre>
            </details></div>
          )}
          {syncResult.errors.length > 0 && <div className="cf-sync-errors"><strong>Lỗi:</strong> {syncResult.errors.join('; ')}</div>}
        </div>
      )}

      {/* Domain List */}
      <div className="domain-list">
        {domains.map(d => (
          <div key={d._id} className="domain-item">
            <div className="domain-info">
              <span className="domain-name">{d.domain}</span>
              {d.label && <span className="domain-label">{d.label}</span>}
              {d.isDefault && <span className="badge">{t('default')}</span>}
              <span className={`status-dot ${d.isActive ? 'active' : 'inactive'}`} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => handleCheckConfigureDomain(d.domain)} disabled={syncLoading} title="Kiểm tra & Cấu hình Cloudflare" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '2px' }}>
                  <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Cấu hình
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => handleDeleteDomain(d._id)}>{t('remove')}</button>
            </div>
          </div>
        ))}
      </div>

      {/* Cloudflare Guide */}
      <div className="cloudflare-guide-card">
        <div className="guide-header">
          <svg className="guide-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span>Hướng dẫn cấu hình Cloudflare</span>
        </div>
        <div className="guide-content">
          <p className="guide-desc">Để nhận được email trên hệ thống TMail, vui lòng thực hiện các bước cấu hình sau trên trang quản trị DNS của Cloudflare:</p>
          <div className="guide-steps">
            <div className="guide-step"><div className="step-num">1</div><div className="step-text"><strong>Tắt Email Routing:</strong> Đi tới mục <strong>Email &gt; Email Routing</strong> và đảm bảo tính năng này đã được <strong>Tắt (Disabled)</strong> để tránh xung đột MX.</div></div>
            <div className="guide-step"><div className="step-num">2</div><div className="step-text"><strong>Bản ghi A (Trỏ tên miền mail):</strong><div className="dns-code-block"><span className="dns-badge">A</span> Name: <code>mail</code> trỏ đến <strong>IP máy chủ VPS</strong> của bạn. Trạng thái: <strong>DNS Only (Bắt buộc)</strong></div></div></div>
            <div className="guide-step"><div className="step-num">3</div><div className="step-text"><strong>Bản ghi MX (Nhận Email):</strong><div className="dns-code-block"><span className="dns-badge mx">MX</span> Name: <code>@</code> trỏ đến <code>mail.yourdomain.com</code> (Priority: <strong>10</strong>).</div></div></div>
            <div className="guide-step"><div className="step-num">4</div><div className="step-text"><strong>Bản ghi SPF (TXT):</strong><div className="dns-code-block"><span className="dns-badge txt">TXT</span> Name: <code>@</code> giá trị <code>v=spf1 mx ip4:IP_VPS_CỦA_BẠN -all</code>.</div></div></div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .cf-sync-btn {
          background: rgba(244, 171, 180, 0.08) !important;
          border-color: rgba(244, 171, 180, 0.2) !important;
          color: var(--accent) !important;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        :global(html[data-theme="light"]) .cf-sync-btn {
          background: rgba(28, 108, 161, 0.05) !important;
          border-color: rgba(28, 108, 161, 0.2) !important;
          color: var(--text-primary) !important;
        }
        
        .spin-animation {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Domain List */
        .domain-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 24px;
        }
        .domain-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-light);
          border-radius: 0px;
          transition: all 0.2s ease;
        }
        .domain-item:hover {
          background: var(--bg-hover);
          border-color: var(--accent);
        }
        .domain-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .domain-name {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-primary);
          font-family: var(--font-mono);
        }
        .domain-label {
          font-size: 11px;
          padding: 2px 8px;
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          border-radius: 0px;
          border: 1px solid var(--border-light);
        }
        .badge {
          font-size: 11px;
          padding: 2px 8px;
          background: rgba(244, 171, 180, 0.15);
          color: var(--accent);
          font-weight: 600;
          border-radius: 0px;
        }
        :global(html[data-theme="light"]) .badge {
          background: rgba(28, 108, 161, 0.1);
          color: var(--text-primary);
        }
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }
        .status-dot.active {
          background-color: #10B981;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
        }
        .status-dot.inactive {
          background-color: #EF4444;
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
        }

        /* Cloudflare Sync list */
        .cf-domains-list {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-light);
          padding: 16px;
          border-radius: 0px;
          margin-bottom: 20px;
        }
        .cf-domains-title {
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 12px;
          color: var(--text-primary);
        }
        .cf-domains-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 8px;
          max-height: 200px;
          overflow-y: auto;
          margin-bottom: 16px;
          padding-right: 4px;
        }
        .cf-domain-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 10px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          border-radius: 0px;
        }
        .cf-domain-check {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          cursor: pointer;
        }
        .cf-domain-check input {
          accent-color: var(--accent);
        }
        .cf-domain-status {
          font-size: 11px;
          color: var(--text-muted);
        }
        .cf-domain-status.synced {
          color: var(--accent);
          font-weight: 600;
        }
        .cf-actions-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid var(--border-light);
          padding-top: 12px;
        }

        /* Cloudflare Guide Card */
        .cloudflare-guide-card {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-light);
          border-radius: 0px;
          padding: 16px;
          margin-top: 24px;
        }
        .guide-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 13.5px;
          margin-bottom: 12px;
          color: var(--text-primary);
          font-family: var(--font-display);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .guide-icon {
          color: var(--accent);
        }
        .guide-desc {
          font-size: 12.5px;
          color: var(--text-secondary);
          margin-bottom: 14px;
        }
        .guide-steps {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .guide-step {
          display: flex;
          gap: 10px;
          font-size: 12.5px;
          line-height: 1.5;
        }
        .step-num {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--bg-tertiary);
          color: var(--text-primary);
          font-size: 11px;
          font-weight: 600;
          font-family: var(--font-mono);
          flex-shrink: 0;
        }
        .dns-code-block {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          padding: 6px 12px;
          border-radius: 0px;
          margin-top: 6px;
          font-family: var(--font-mono);
          font-size: 11.5px;
          width: fit-content;
        }
        .dns-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 1px 6px;
          background: #3B82F6;
          color: white;
          border-radius: 0px;
        }
        .dns-badge.mx {
          background: #10B981;
        }
        .dns-badge.txt {
          background: #8B5CF6;
        }
      `}</style>
    </div>
  );
}
