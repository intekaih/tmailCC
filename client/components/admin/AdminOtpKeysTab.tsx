'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { TableSkeleton } from '../SkeletonLoader';
import type { AdminTabProps } from './types';

export default function AdminOtpKeysTab({
  loadingData, loading, setLoading, error, setError, toast, t, setConfirmAction,
}: AdminTabProps) {
  const [otpKeys, setOtpKeys] = useState<any[]>([]);
  const [newOtpAddress, setNewOtpAddress] = useState('');
  const [newOtpNote, setNewOtpNote] = useState('');
  const [configForm, setConfigForm] = useState<any>({});
  const [initialized, setInitialized] = useState(false);

  if (!initialized && !loadingData) {
    setInitialized(true);
    loadOtpKeys();
    loadConfig();
  }

  async function loadConfig() {
    try {
      const data = await api.admin.config();
      setConfigForm(data);
    } catch (_) {}
  }

  async function loadOtpKeys() {
    try {
      const res = await fetch('/api/admin/otp-keys', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('tmail_token')}` },
      });
      const data = await res.json();
      setOtpKeys(data.keys || []);
    } catch (err: any) { setError(err.message); }
  }

  async function handleGenerateOtpKey() {
    if (!newOtpAddress.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/otp-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('tmail_token')}`,
        },
        body: JSON.stringify({ address: newOtpAddress.trim(), note: newOtpNote.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      navigator.clipboard?.writeText(data.credential);
      toast(`Đã tạo: ${data.credential}`, 'success');
      setNewOtpAddress('');
      setNewOtpNote('');
      loadOtpKeys();
    } catch (err: any) {
      setError(err.message);
      toast(err.message || 'Lỗi', 'error');
    }
    setLoading(false);
  }

  function handleDeleteOtpKey(address: string) {
    setConfirmAction({
      title: t('remove'),
      message: `Xoa OTP key cho ${address}?`,
      onConfirm: async () => {
        try {
          await fetch(`/api/admin/otp-key/${encodeURIComponent(address)}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('tmail_token')}` },
          });
          loadOtpKeys();
          toast('Da xoa', 'success');
        } catch (err: any) { setError(err.message); }
      },
    });
  }

  if (loadingData) return <TableSkeleton />;

  return (
    <div>
      <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-tertiary)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>Cho phép User tự tạo OTP Key</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Khi bật, user có thể tự bấm nút tạo mã OTP cho các email của mình ở Sidebar.</div>
        </div>
        <label className="checkbox-label" style={{ margin: 0 }}>
          <input
            type="checkbox"
            checked={configForm.allowUserOtpKey ?? false}
            onChange={async (e) => {
              const checked = e.target.checked;
              setConfigForm((prev: any) => ({ ...prev, allowUserOtpKey: checked }));
              try { await api.admin.updateConfig({ allowUserOtpKey: checked }); } catch (err: any) { console.error(err); }
            }}
            style={{ width: 16, height: 16 }}
          />
        </label>
      </div>

      <div className="add-domain-form">
        <input className="input" placeholder="Email (vd: user1@tmailcc.app)" value={newOtpAddress} onChange={e => setNewOtpAddress(e.target.value)} />
        <input className="input" placeholder="Ghi chú (tùy chọn)" value={newOtpNote} onChange={e => setNewOtpNote(e.target.value)} style={{ maxWidth: 160 }} />
        <button className="btn btn-primary btn-sm" onClick={handleGenerateOtpKey} disabled={loading || !newOtpAddress.trim()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          Tạo key
        </button>
      </div>

      <div className="domain-list">
        {otpKeys.map(k => (
          <div key={k.address} className="domain-item" style={{ flexWrap: 'wrap', gap: 8 }}>
            <div className="domain-info" style={{ flex: 1, minWidth: 0 }}>
              <span className="domain-name" style={{ fontSize: 13 }}>{k.address}</span>
              {k.note && <span className="domain-label">{k.note}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <code style={{ fontSize: 12, color: 'var(--accent)', background: 'var(--bg-primary)', padding: '4px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>key hidden</code>
              <button className="btn btn-ghost btn-sm" onClick={() => toast('Key chỉ hiển thị một lần khi tạo mới.', 'info')} title="Copy" style={{ minWidth: 32 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2"/></svg>
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => handleDeleteOtpKey(k.address)}>{t('remove')}</button>
            </div>
          </div>
        ))}
        {otpKeys.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 13 }}>
            Chưa có OTP key nào. Nhập email và nhấn Tạo key để bắt đầu.
          </div>
        )}
      </div>

      <style jsx>{`
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
      `}</style>
    </div>
  );
}
