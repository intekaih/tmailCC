'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/AppContext';
import { useFocusTrap } from './useFocusTrap';
import { StatsSkeleton, TableSkeleton, ConfigSkeleton } from './SkeletonLoader';

interface AdminPanelProps {
  onClose: () => void;
  onDomainsChanged?: () => void;
}

type Tab = 'stats' | 'users' | 'domains' | 'config' | 'blocklist' | 'otpkeys' | 'dotmails';
type ConfirmAction = {
  title: string;
  message: string;
  onConfirm: () => Promise<void> | void;
};

function formatUptime(seconds: number): string {
  if (!seconds || seconds < 0) return '0s';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  return parts.length > 0 ? parts.join(' ') : `${Math.floor(seconds)}s`;
}

export default function AdminPanel({ onClose, onDomainsChanged }: AdminPanelProps) {
  const { t, toast } = useApp();
  const [tab, setTab] = useState<Tab>('stats');
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, true);
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({});
  const [blocklist, setBlocklist] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [newDomain, setNewDomain] = useState({ domain: '', label: '', isDefault: false });
  const [blockIP, setBlockIP] = useState({ ip: '', reason: '', expiresInHours: '' });
  const [configForm, setConfigForm] = useState<any>({});
  const [newUser, setNewUser] = useState({ username: '', password: '' });
  const [otpKeys, setOtpKeys] = useState<any[]>([]);
  const [newOtpAddress, setNewOtpAddress] = useState('');
  const [newOtpNote, setNewOtpNote] = useState('');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<{ added: string[]; alreadyExisted: string[]; errors: string[]; cloudflareTotal: number } | null>(null);
  const [cfDomains, setCfDomains] = useState<any[] | null>(null);
  const [showCfList, setShowCfList] = useState(false);
  // Dotmail state
  const [dotmailParents, setDotmailParents] = useState<any[]>([]);
  const [newGmailAddress, setNewGmailAddress] = useState('');
  const [newGmailAppPassword, setNewGmailAppPassword] = useState('');
  const [expandedParent, setExpandedParent] = useState<string | null>(null);
  const [dotmailGenerating, setDotmailGenerating] = useState(false);
  const [selectedCfDomains, setSelectedCfDomains] = useState<string[]>([]);

  async function runConfirmAction() {
    if (!confirmAction) return;
    setConfirmLoading(true);
    try {
      await confirmAction.onConfirm();
      setConfirmAction(null);
    } finally {
      setConfirmLoading(false);
    }
  }

  async function loadTabData(t: Tab) {
    setTab(t);
    setError('');
    setLoadingData(true);
    try {
      if (t === 'stats') await loadStats();
      else if (t === 'users') await loadUsers();
      else if (t === 'domains') await loadDomains();
      else if (t === 'config') await loadConfig();
      else if (t === 'blocklist') await loadBlocklist();
      else if (t === 'otpkeys') await loadOtpKeys();
      else if (t === 'dotmails') await loadDotmails();
    } finally {
      setLoadingData(false);
    }
  }

  async function loadStats() {
    try {
      const data = await api.admin.stats();
      setStats(data);
    } catch (err: any) { setError(err.message); }
  }

  async function loadUsers() {
    try {
      const data = await api.admin.users({ limit: 100 });
      setUsers(data.users);
    } catch (err: any) { setError(err.message); }
  }

  async function loadDomains() {
    try {
      const data = await api.admin.domains();
      setDomains(data.domains);
    } catch (err: any) { setError(err.message); }
  }

  async function loadConfig() {
    try {
      const data = await api.admin.config();
      setConfig(data);
      setConfigForm(data);
    } catch (err: any) { setError(err.message); }
  }

  async function loadBlocklist() {
    try {
      const data = await api.admin.blocklist();
      setBlocklist(data.entries);
    } catch (err: any) { setError(err.message); }
  }

  useEffect(() => {
    async function init() {
      setLoadingData(true);
      try {
        await loadStats();
      } finally {
        setLoadingData(false);
      }
    }
    init();
  }, []);

  async function handleAddDomain() {
    if (!newDomain.domain) return;
    setLoading(true);
    try {
      await api.admin.addDomain(newDomain);
      setNewDomain({ domain: '', label: '', isDefault: false });
      loadDomains();
      toast(t('created') + ': ' + newDomain.domain, 'success');
      // Notify parent to refresh domains in sidebar
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
    setSyncLoading(true);
    setError('');
    setSyncResult(null);
    try {
      const res = await api.admin.listCloudflare();
      if (res.success && Array.isArray(res.domains)) {
        setCfDomains(res.domains);
        // Auto select all active domains that aren't already synced in the system
        const unsynced = res.domains
          .filter(d => !d.alreadySynced && d.status === 'active')
          .map(d => d.domain);
        setSelectedCfDomains(unsynced);
        setShowCfList(true);
      } else {
        throw new Error('Không thể tải danh sách domain từ Cloudflare.');
      }
    } catch (err: any) {
      setError(err.message);
      toast(err.message || 'Lỗi khi kết nối Cloudflare', 'error');
    } finally {
      setSyncLoading(false);
    }
  }

  async function executeSelectedSync() {
    if (selectedCfDomains.length === 0) {
      toast('Vui lòng chọn ít nhất 1 domain để đồng bộ', 'info');
      return;
    }
    setSyncLoading(true);
    setError('');
    setSyncResult(null);
    try {
      const result = await api.admin.syncCloudflare(selectedCfDomains);
      setSyncResult(result);
      if (result.added.length > 0) {
        toast(`Đã thêm ${result.added.length} domain từ Cloudflare: ${result.added.join(', ')}`, 'success');
        loadDomains();
        onDomainsChanged?.();
        // Hide list view upon successful sync
        setShowCfList(false);
        setCfDomains(null);
      } else {
        toast('Không có domain mới nào được thêm vào', 'info');
      }
    } catch (err: any) {
      setError(err.message);
      toast(err.message || 'Lỗi khi đồng bộ Cloudflare', 'error');
    } finally {
      setSyncLoading(false);
    }
  }

  async function handleBlockIP() {
    if (!blockIP.ip) return;
    setLoading(true);
    try {
      await api.admin.blockIP({
        ip: blockIP.ip,
        reason: blockIP.reason,
        expiresInHours: blockIP.expiresInHours ? Number(blockIP.expiresInHours) : undefined,
      });
      setBlockIP({ ip: '', reason: '', expiresInHours: '' });
      loadBlocklist();
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  }

  async function handleUnblockIP(ip: string) {
    try {
      await api.admin.unblockIP(ip);
      loadBlocklist();
    } catch (err: any) { setError(err.message); }
  }

  async function handleSaveConfig() {
    setLoading(true);
    try {
      await api.admin.updateConfig(configForm);
      toast(t('configSaved'), 'success');
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  }

  async function handleCreateUser() {
    if (!newUser.username.trim() || newUser.password.length < 8) return;
    setLoading(true);
    setError('');
    try {
      await api.admin.createUser({
        username: newUser.username.trim().toLowerCase(),
        password: newUser.password,
      });
      toast(t('created') + ': ' + newUser.username.trim().toLowerCase(), 'success');
      setNewUser({ username: '', password: '' });
      loadUsers();
      loadStats();
    } catch (err: any) {
      setError(err.message);
      toast(err.message || t('error'), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleUserRole(user: any) {
    try {
      await api.admin.updateUser(user._id, { role: user.role === 'admin' ? 'user' : 'admin' });
      loadUsers();
    } catch (err: any) { setError(err.message); }
  }

  function handleDeleteUser(id: string, username: string) {
    setConfirmAction({
      title: t('deleteUser'),
      message: `Delete user "${username}" and all their emails?`,
      onConfirm: async () => {
        try {
          await api.admin.deleteUser(id);
          loadUsers();
          loadStats();
        } catch (err: any) { setError(err.message); }
      },
    });
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
      // Copy to clipboard automatically
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

  // Dotmail functions
  async function loadDotmails() {
    try {
      const data = await api.admin.dotmails();
      setDotmailParents(data.parents || []);
    } catch (err: any) { setError(err.message); }
  }

  async function handleAddGmailParent() {
    if (!newGmailAddress.trim() || !newGmailAppPassword.trim()) return;
    setLoading(true);
    try {
      await api.admin.addGmailParent({ address: newGmailAddress.trim(), app_password: newGmailAppPassword.trim() });
      setNewGmailAddress('');
      setNewGmailAppPassword('');
      toast('Đã thêm Gmail', 'success');
      await loadDotmails();
    } catch (err: any) { toast(err.message, 'error'); }
    setLoading(false);
  }

  function handleDeleteGmailParent(id: string, address: string) {
    setConfirmAction({
      title: 'Xóa Gmail',
      message: `Xóa ${address} và tất cả dotmail liên quan?`,
      onConfirm: async () => {
        await api.admin.deleteGmailParent(id);
        toast('Đã xóa', 'success');
        await loadDotmails();
      },
    });
  }

  async function handleGenerateDotmails(parentId: string) {
    setDotmailGenerating(true);
    try {
      const data = await api.admin.generateDotmails(parentId);
      toast(`Đã tạo ${data.total} dotmail`, 'success');
      await loadDotmails();
    } catch (err: any) { toast(err.message, 'error'); }
    setDotmailGenerating(false);
  }

  function handleDeleteDotmail(id: string, address: string) {
    setConfirmAction({
      title: 'Xóa Dotmail',
      message: `Xóa ${address}?`,
      onConfirm: async () => {
        await api.admin.deleteDotmail(id);
        toast('Đã xóa', 'success');
        await loadDotmails();
      },
    });
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'stats', label: t('stats') },
    { id: 'users', label: t('users') },
    { id: 'domains', label: t('domains') },
    { id: 'config', label: t('config') },
    { id: 'blocklist', label: t('blocklist') },
    { id: 'otpkeys', label: 'OTP Keys' },
    { id: 'dotmails', label: 'Dotmail' },
  ];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-label={t('admin')}>
      <div className="admin-panel fade-in" ref={modalRef}>
        <div className="modal-header">
          <h2 className="modal-title">{t('admin')}</h2>
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
              onClick={() => loadTabData(tb.id)}
            >
              {tb.label}
            </button>
          ))}
        </div>

        <div className="tab-content">
          {tab === 'stats' && (
            loadingData ? (
              <StatsSkeleton />
            ) : stats ? (
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">{stats.totalUsers}</div>
                  <div className="stat-label">{t('totalUsers')}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats.totalAccounts}</div>
                  <div className="stat-label">{t('emailAddresses')}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats.totalEmails}</div>
                  <div className="stat-label">{t('totalEmails')}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats.totalDomains}</div>
                  <div className="stat-label">{t('activeDomains')}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats.recentEmails}</div>
                  <div className="stat-label">{t('emails24h')}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{formatUptime(stats.uptime)}</div>
                  <div className="stat-label">{t('uptime')}</div>
                </div>
              </div>
            ) : null
          )}

          {tab === 'users' && (
            loadingData ? (
              <TableSkeleton />
            ) : (
              <div>
                <div className="add-domain-form">
                  <input
                    className="input"
                    placeholder={t('username')}
                    value={newUser.username}
                    onChange={e => setNewUser(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') }))}
                  />
                  <input
                    className="input"
                    type="password"
                    placeholder={t('minChars')}
                    value={newUser.password}
                    onChange={e => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  />
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleCreateUser}
                    disabled={loading || newUser.username.length < 3 || newUser.password.length < 8}
                  >
                    {t('createAccount')}
                  </button>
                </div>

                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{t('username_col')}</th>
                        <th>{t('email_col')}</th>
                        <th>{t('role')}</th>
                        <th>{t('accounts')}</th>
                        <th>{t('joined')}</th>
                        <th>{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => (
                        <tr key={user._id}>
                          <td>{user.username}</td>
                          <td>{user.email}</td>
                          <td>
                            <span className={`role-tag ${user.role}`}>{user.role}</span>
                          </td>
                          <td>{user.emailCount || 0}</td>
                          <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                          <td>
                            <button className="btn btn-ghost btn-sm" onClick={() => handleToggleUserRole(user)}>
                              {user.role === 'admin' ? t('revokeAdmin') : t('makeAdmin')}
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUser(user._id, user.username)}>
                              {t('deleteUser')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {tab === 'domains' && (
            loadingData ? (
              <TableSkeleton />
            ) : (
              <div>
                <div className="add-domain-form">
                  <input
                    className="input"
                    placeholder={t('domain')}
                    value={newDomain.domain}
                    onChange={e => setNewDomain((prev: any) => ({ ...prev, domain: e.target.value }))}
                  />
                  <input
                    className="input"
                    placeholder={t('labelOptional')}
                    value={newDomain.label}
                    onChange={e => setNewDomain((prev: any) => ({ ...prev, label: e.target.value }))}
                  />
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={newDomain.isDefault}
                      onChange={e => setNewDomain((prev: any) => ({ ...prev, isDefault: e.target.checked }))}
                    />
                    {t('default')}
                  </label>
                  <button className="btn btn-primary btn-sm" onClick={handleAddDomain} disabled={loading}>
                    {t('addDomain')}
                  </button>
                  <button 
                    className="btn btn-sm cf-sync-btn" 
                    onClick={handleSyncCloudflare} 
                    disabled={syncLoading}
                    title="Đồng bộ domain từ Cloudflare"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={syncLoading ? 'spin-animation' : ''}>
                      <path d="M4 4v5h5M20 20v-5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L4 7m16 10l-1.64 1.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    {syncLoading ? 'Đang đồng bộ...' : 'Sync Cloudflare'}
                  </button>
                </div>

                {/* Cloudflare Domains Selection List */}
                {showCfList && cfDomains && (
                  <div className="cf-domains-list">
                    <div className="cf-domains-title">Danh sách tên miền trên Cloudflare</div>
                    <div className="cf-domains-grid">
                      {cfDomains.map((zone: any) => (
                        <div key={zone.id} className="cf-domain-row">
                          <label className={`cf-domain-check ${zone.alreadySynced ? 'disabled' : ''}`}>
                            <input
                              type="checkbox"
                              checked={zone.alreadySynced || selectedCfDomains.includes(zone.domain)}
                              disabled={zone.alreadySynced}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCfDomains(prev => [...prev, zone.domain]);
                                } else {
                                  setSelectedCfDomains(prev => prev.filter(d => d !== zone.domain));
                                }
                              }}
                            />
                            <span>{zone.domain}</span>
                          </label>
                          <span className={`cf-domain-status ${zone.alreadySynced ? 'synced' : ''}`}>
                            {zone.alreadySynced ? 'Đã liên kết' : zone.status}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="cf-actions-row">
                      <label className="checkbox-label" style={{ margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={
                            cfDomains.filter(d => !d.alreadySynced).length > 0 &&
                            cfDomains.filter(d => !d.alreadySynced).every(d => selectedCfDomains.includes(d.domain))
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              const allUnsynced = cfDomains
                                .filter(d => !d.alreadySynced)
                                .map(d => d.domain);
                              setSelectedCfDomains(allUnsynced);
                            } else {
                              setSelectedCfDomains([]);
                            }
                          }}
                        />
                        Chọn tất cả
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setShowCfList(false);
                            setCfDomains(null);
                          }}
                          disabled={syncLoading}
                        >
                          Hủy
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={executeSelectedSync}
                          disabled={syncLoading || selectedCfDomains.length === 0}
                        >
                          {syncLoading ? 'Đang đồng bộ...' : 'Đồng bộ đã chọn'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cloudflare Sync Result */}
                {syncResult && (
                  <div className="cf-sync-result">
                    <div className="cf-sync-header">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Cloudflare: {syncResult.cloudflareTotal} domains</span>
                    </div>
                    {syncResult.added.length > 0 && (
                      <div className="cf-sync-added">
                        <strong>Đã thêm mới ({syncResult.added.length}):</strong> {syncResult.added.join(', ')}
                      </div>
                    )}
                    {syncResult.added.length === 0 && (
                      <div className="cf-sync-info">Tất cả domain đã được đồng bộ.</div>
                    )}
                    {(syncResult as any).logs && (syncResult as any).logs.length > 0 && (
                      <div className="cf-sync-logs">
                        <details>
                          <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '8px' }}>
                            Xem chi tiết log cấu hình Cloudflare ({(syncResult as any).logs.length} dòng)
                          </summary>
                          <pre style={{
                            marginTop: '6px',
                            padding: '10px',
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            maxHeight: '150px',
                            overflowY: 'auto',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            color: 'var(--text-primary)',
                            whiteSpace: 'pre-wrap'
                          }}>
                            {(syncResult as any).logs.join('\n')}
                          </pre>
                        </details>
                      </div>
                    )}
                    {syncResult.errors.length > 0 && (
                      <div className="cf-sync-errors">
                        <strong>Lỗi:</strong> {syncResult.errors.join('; ')}
                      </div>
                    )}
                  </div>
                )}

                <div className="domain-list">
                  {domains.map(d => (
                    <div key={d._id} className="domain-item">
                      <div className="domain-info">
                        <span className="domain-name">{d.domain}</span>
                        {d.label && <span className="domain-label">{d.label}</span>}
                        {d.isDefault && <span className="badge">{t('default')}</span>}
                        {d.isActive ? (
                          <span className="status-dot active" />
                        ) : (
                          <span className="status-dot inactive" />
                        )}
                      </div>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteDomain(d._id)}>
                        {t('remove')}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Cloudflare Guide Section */}
                <div className="cloudflare-guide-card">
                  <div className="guide-header">
                    <svg className="guide-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Hướng dẫn cấu hình Cloudflare</span>
                  </div>
                  <div className="guide-content">
                    <p className="guide-desc">Để nhận được email trên hệ thống TMail, vui lòng thực hiện các bước cấu hình sau trên trang quản trị DNS của Cloudflare:</p>
                    <div className="guide-steps">
                      <div className="guide-step">
                        <div className="step-num">1</div>
                        <div className="step-text">
                          <strong>Tắt Email Routing:</strong> Đi tới mục <strong>Email &gt; Email Routing</strong> và đảm bảo tính năng này đã được <strong>Tắt (Disabled)</strong> để tránh xung đột MX.
                        </div>
                      </div>
                      <div className="guide-step">
                        <div className="step-num">2</div>
                        <div className="step-text">
                          <strong>Bản ghi A (Trỏ tên miền mail):</strong>
                          <div className="dns-code-block">
                            <span className="dns-badge">A</span> Name: <code>mail</code> trỏ đến <strong>IP máy chủ VPS</strong> của bạn. Trạng thái đám mây: <strong>DNS Only / Tắt Đám Mây (Bắt buộc)</strong>
                            <svg style={{ marginLeft: 4 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-3.25-6.05-6.5-6.5C13 5 8 5 6.5 9.5a5 5 0 0 0-4.5 5c0 2.76 2.24 5 5 5h10.5z" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div className="guide-step">
                        <div className="step-num">3</div>
                        <div className="step-text">
                          <strong>Bản ghi MX (Nhận Email):</strong>
                          <div className="dns-code-block">
                            <span className="dns-badge mx">MX</span> Name: <code>@</code> trỏ đến <code>mail.yourdomain.com</code> (Priority: <strong>10</strong>).
                          </div>
                        </div>
                      </div>
                      <div className="guide-step">
                        <div className="step-num">4</div>
                        <div className="step-text">
                          <strong>Bản ghi SPF (TXT):</strong>
                          <div className="dns-code-block">
                            <span className="dns-badge txt">TXT</span> Name: <code>@</code> giá trị <code>v=spf1 mx ip4:IP_VPS_CỦA_BẠN -all</code>.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          )}

          {tab === 'config' && (
            loadingData ? (
              <ConfigSkeleton />
            ) : (
              <div className="config-form">
                <div className="form-group">
                  <label className="form-label">{t('emailsPerMinute')}</label>
                  <input
                    className="input"
                    type="number"
                    value={configForm.rateLimit?.emailsPerMinute ?? 5}
                    onChange={e => setConfigForm((prev: any) => ({
                      ...prev,
                      rateLimit: { ...(prev.rateLimit || {}), emailsPerMinute: Number(e.target.value) }
                    }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('emailsPerDay')}</label>
                  <input
                    className="input"
                    type="number"
                    value={configForm.rateLimit?.emailsPerDay ?? 50}
                    onChange={e => setConfigForm((prev: any) => ({
                      ...prev,
                      rateLimit: { ...(prev.rateLimit || {}), emailsPerDay: Number(e.target.value) }
                    }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('maxMailboxStorage')}</label>
                  <input
                    className="input"
                    type="number"
                    value={configForm.maxMailboxStorageMB ?? 50}
                    onChange={e => setConfigForm((prev: any) => ({ ...prev, maxMailboxStorageMB: Number(e.target.value) }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('maxEmailSize')}</label>
                  <input
                    className="input"
                    type="number"
                    value={configForm.maxEmailSizeMB ?? 25}
                    onChange={e => setConfigForm((prev: any) => ({ ...prev, maxEmailSizeMB: Number(e.target.value) }))}
                  />
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={configForm.captchaEnabled ?? false}
                      onChange={e => setConfigForm((prev: any) => ({ ...prev, captchaEnabled: e.target.checked }))}
                    />
                    {t('enableCaptcha')}
                  </label>
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={configForm.allowUserOtpKey ?? false}
                      onChange={e => setConfigForm((prev: any) => ({ ...prev, allowUserOtpKey: e.target.checked }))}
                    />
                    Cho phép User tự tạo OTP Key
                  </label>
                </div>
                <button className="btn btn-primary" onClick={handleSaveConfig} disabled={loading}>
                  {t('saveConfig')}
                </button>
              </div>
            )
          )}

          {tab === 'blocklist' && (
            loadingData ? (
              <TableSkeleton />
            ) : (
              <div>
                <div className="add-domain-form">
                  <input
                    className="input"
                    placeholder={t('ipAddress')}
                    value={blockIP.ip}
                    onChange={e => setBlockIP((prev: any) => ({ ...prev, ip: e.target.value }))}
                  />
                  <input
                    className="input"
                    placeholder={t('reasonOptional')}
                    value={blockIP.reason}
                    onChange={e => setBlockIP((prev: any) => ({ ...prev, reason: e.target.value }))}
                  />
                  <button className="btn btn-danger btn-sm" onClick={handleBlockIP} disabled={loading}>
                    {t('blockIP')}
                  </button>
                </div>

                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{t('ipAddress')}</th>
                        <th>{t('reason')}</th>
                        <th>{t('blockedAt')}</th>
                        <th>{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {blocklist.map((entry, idx) => (
                        <tr key={entry.ip || idx}>
                          <td><code>{entry.ip}</code></td>
                          <td>{entry.reason || '-'}</td>
                          <td>{new Date(entry.blockedAt).toLocaleString()}</td>
                          <td>
                            <button className="btn btn-ghost btn-sm" onClick={() => handleUnblockIP(entry.ip)}>
                              {t('unblock')}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {blocklist.length === 0 && (
                        <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{t('noBlockedIPs')}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {tab === 'otpkeys' && (
            loadingData ? (
              <TableSkeleton />
            ) : (
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
                        try {
                          await api.admin.updateConfig({ allowUserOtpKey: checked });
                        } catch (err: any) {
                          console.error(err);
                        }
                      }}
                      style={{ width: 16, height: 16 }}
                    />
                  </label>
                </div>

                <div className="add-domain-form">
                  <input
                    className="input"
                    placeholder="Email (vd: user1@kaih.co.uk)"
                    value={newOtpAddress}
                    onChange={e => setNewOtpAddress(e.target.value)}
                  />
                  <input
                    className="input"
                    placeholder="Ghi chú (tùy chọn)"
                    value={newOtpNote}
                    onChange={e => setNewOtpNote(e.target.value)}
                    style={{ maxWidth: 160 }}
                  />
                  <button className="btn btn-primary btn-sm" onClick={handleGenerateOtpKey} disabled={loading || !newOtpAddress.trim()}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
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
                        <code style={{ fontSize: 12, color: 'var(--accent)', background: 'var(--bg-primary)', padding: '4px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>
                          key hidden
                        </code>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            toast('Key chỉ hiển thị một lần khi tạo mới.', 'info');
                          }}
                          title="Copy"
                          style={{ minWidth: 32 }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2"/></svg>
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteOtpKey(k.address)}>
                          {t('remove')}
                        </button>
                      </div>
                    </div>
                  ))}
                  {otpKeys.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 13 }}>
                      Chưa có OTP key nào. Nhập email và nhấn Tạo key để bắt đầu.
                    </div>
                  )}
                </div>
              </div>
            )
          )}

          {tab === 'dotmails' && (
            loadingData ? (
              <TableSkeleton />
            ) : (
              <div>
                <div className="add-domain-form">
                  <input
                    className="input"
                    placeholder="Gmail gốc (vd: 00yt0001@gmail.com)"
                    value={newGmailAddress}
                    onChange={e => setNewGmailAddress(e.target.value)}
                  />
                  <input
                    className="input"
                    type="password"
                    placeholder="App Password (16 ký tự)"
                    value={newGmailAppPassword}
                    onChange={e => setNewGmailAppPassword(e.target.value)}
                  />
                  <button className="btn btn-primary btn-sm" onClick={handleAddGmailParent} disabled={loading || !newGmailAddress.trim() || !newGmailAppPassword.trim()}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    Thêm Gmail
                  </button>
                </div>

                {dotmailParents.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 13 }}>
                    Chưa có Gmail nào. Thêm Gmail gốc và App Password để bắt đầu.
                  </div>
                )}

                {dotmailParents.map((parent: any) => {
                  const isExpanded = expandedParent === parent.id;
                  const dotmails = parent.dotmails || [];

                  return (
                    <div key={parent.id} style={{ marginBottom: 12, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                      <div
                        style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: 'var(--bg-tertiary)' }}
                        onClick={() => setExpandedParent(isExpanded ? null : parent.id)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2"/><polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2"/></svg>
                          <span style={{ fontWeight: 600, fontSize: 13.5 }}>{parent.address}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            {dotmails.length} dotmail
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); handleGenerateDotmails(parent.id); }} disabled={dotmailGenerating} title="Sinh dotmail">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); handleDeleteGmailParent(parent.id, parent.address); }} title="Xóa">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                          </button>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s' }}><polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      </div>

                      {isExpanded && dotmails.length > 0 && (
                        <div style={{ maxHeight: 300, overflowY: 'auto', padding: '8px 14px' }}>
                          {dotmails.map((d: any) => (
                            <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                              <span style={{ fontFamily: 'monospace', fontSize: 12.5, color: 'var(--text-primary)' }}>{d.address}</span>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button className="btn btn-ghost btn-sm" style={{ padding: '3px 6px' }} onClick={() => { navigator.clipboard.writeText(d.address); toast('Đã copy', 'success'); }} title="Copy">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2"/></svg>
                                </button>
                                <button className="btn btn-danger btn-sm" style={{ padding: '3px 6px' }} onClick={() => handleDeleteDotmail(d.id, d.address)} title="Xóa">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {isExpanded && dotmails.length === 0 && (
                        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>
                          Chưa có dotmail. Nhấn nút sinh dotmail ở trên.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {confirmAction && (
          <div className="confirm-overlay" onClick={() => !confirmLoading && setConfirmAction(null)}>
            <div className="confirm-dialog" role="dialog" aria-modal="true" aria-label={confirmAction.title} onClick={e => e.stopPropagation()}>
              <div className="confirm-title">{confirmAction.title}</div>
              <div className="confirm-body">{confirmAction.message}</div>
              <div className="confirm-actions">
                <button className="btn btn-ghost" onClick={() => setConfirmAction(null)} disabled={confirmLoading}>
                  {t('no')}
                </button>
                <button className="btn btn-primary danger" onClick={runConfirmAction} disabled={confirmLoading}>
                  {confirmLoading ? t('loading') : t('yes')}
                </button>
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          .admin-panel {
            background: linear-gradient(135deg, #0a1424 0%, #050a12 100%);
            border: 1px solid rgba(197, 160, 89, 0.18);
            border-radius: 20px;
            width: 90vw;
            max-width: 900px;
            height: 650px;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-shadow: 0 25px 80px -10px rgba(0, 0, 0, 0.65), 0 0 40px rgba(197, 160, 89, 0.05);
            position: relative;
          }
          .admin-panel::before {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 60px;
            opacity: 0.03;
            background-image: var(--wave-pattern);
            background-size: 80px 40px;
            pointer-events: none;
            z-index: 0;
          }
          .admin-panel > * {
            position: relative;
            z-index: 1;
          }
          .modal-header {
            padding: 20px 24px;
            margin: 0;
            border-bottom: 1px solid rgba(197, 160, 89, 0.12);
          }
          .tab-bar {
            display: flex;
            border-bottom: 1px solid rgba(197, 160, 89, 0.12);
            padding: 0 24px;
            overflow-x: auto;
            flex-shrink: 0;
            background: rgba(0, 0, 0, 0.25);
            gap: 4px;
          }
          .tab-btn {
            padding: 14px 18px;
            border: none;
            background: transparent;
            cursor: pointer;
            font-size: 13.5px;
            font-family: inherit;
            color: var(--text-secondary);
            border-bottom: 2px solid transparent;
            margin-bottom: -1px;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
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
            text-shadow: 0 0 10px rgba(197, 160, 89, 0.25);
          }
          .tab-content {
            flex: 1;
            overflow-y: auto;
            padding: 24px;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 16px;
          }
          .stat-card {
            background: linear-gradient(135deg, rgba(18, 29, 45, 0.6) 0%, rgba(10, 18, 28, 0.6) 100%);
            border: 1px solid rgba(197, 160, 89, 0.12);
            border-radius: 14px;
            padding: 24px 16px;
            text-align: center;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          }
          .stat-card:hover {
            transform: translateY(-2px);
            border-color: rgba(197, 160, 89, 0.3);
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(197, 160, 89, 0.05);
          }
          .stat-value {
            font-size: 32px;
            font-weight: 700;
            color: var(--accent);
            font-family: 'Cinzel', 'Playfair Display', Georgia, serif;
            text-shadow: 0 0 20px rgba(197, 160, 89, 0.18);
          }
          .stat-label {
            font-size: 12.5px;
            color: var(--text-secondary);
            margin-top: 6px;
            font-weight: 500;
            letter-spacing: 0.02em;
          }
          .table-container {
            overflow-x: auto;
          }
          .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
          }
          .data-table th {
            text-align: left;
            padding: 12px 14px;
            border-bottom: 2px solid rgba(197, 160, 89, 0.15);
            color: var(--text-secondary);
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .data-table td {
            padding: 12px 14px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            color: var(--text-primary);
          }
          .data-table tr:hover td {
            background: rgba(197, 160, 89, 0.03);
          }
          .role-tag {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
          }
          .role-tag.admin {
            background: rgba(197, 160, 89, 0.15);
            color: var(--accent);
          }
          .role-tag.user {
            background: var(--bg-tertiary);
            color: var(--text-secondary);
          }
          .add-domain-form {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-bottom: 16px;
            align-items: center;
          }
          .add-domain-form .input {
            flex: 1;
            min-width: 150px;
          }
          .checkbox-label {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            color: var(--text-secondary);
            cursor: pointer;
          }
          .domain-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .domain-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: var(--bg-tertiary);
            border: 1px solid var(--border);
            border-radius: 10px;
          }
          .domain-info {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .domain-name {
            font-weight: 600;
            font-size: 14px;
          }
          .domain-label {
            font-size: 12px;
            color: var(--text-secondary);
          }
          .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
          }
          .status-dot.active { background: var(--success); }
          .status-dot.inactive { background: var(--text-muted); }
          .config-form {
            display: flex;
            flex-direction: column;
            gap: 12px;
            max-width: 400px;
          }
          .confirm-overlay {
            position: fixed;
            inset: 0;
            z-index: 1100;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            padding: 16px;
          }
          .confirm-dialog {
            width: min(360px, 100%);
            border: 1px solid var(--border);
            border-radius: 8px;
            background: var(--bg-secondary);
            box-shadow: 0 18px 48px var(--shadow);
            padding: 16px;
          }
          .confirm-title {
            font-size: 15px;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 8px;
          }
          .confirm-body {
            font-size: 13px;
            color: var(--text-secondary);
            margin-bottom: 16px;
            word-break: break-word;
          }
          .confirm-actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
          }
          .danger {
            background: var(--error);
          }
          :global(html[data-theme="light"]) .admin-panel {
            background: linear-gradient(135deg, #ffffff 0%, #f0f4f8 100%);
            border: 1px solid rgba(28, 108, 161, 0.18);
            box-shadow: 0 25px 80px -10px rgba(0, 0, 0, 0.15), 0 0 40px rgba(28, 108, 161, 0.02);
          }
          :global(html[data-theme="light"]) .modal-header {
            border-bottom-color: rgba(28, 108, 161, 0.12);
          }
          :global(html[data-theme="light"]) .admin-panel::before {
            opacity: 0.08;
          }
          :global(html[data-theme="light"]) .tab-bar {
            border-bottom-color: rgba(28, 108, 161, 0.12);
            background: rgba(0, 0, 0, 0.03);
          }
          :global(html[data-theme="light"]) .tab-btn.active {
            text-shadow: 0 0 10px rgba(28, 108, 161, 0.15);
          }
          :global(html[data-theme="light"]) .stat-card {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(240, 244, 248, 0.8) 100%);
            border-color: rgba(28, 108, 161, 0.12);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
          }
          :global(html[data-theme="light"]) .stat-card:hover {
            border-color: rgba(28, 108, 161, 0.3);
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.1), 0 0 20px rgba(28, 108, 161, 0.02);
          }
          :global(html[data-theme="light"]) .stat-value {
            text-shadow: 0 0 20px rgba(28, 108, 161, 0.1);
          }
          :global(html[data-theme="light"]) .data-table th {
            border-bottom-color: rgba(28, 108, 161, 0.15);
          }
          :global(html[data-theme="light"]) .data-table td {
            border-bottom-color: rgba(28, 108, 161, 0.05);
          }
          :global(html[data-theme="light"]) .data-table tr:hover td {
            background: rgba(28, 108, 161, 0.03);
          }
          :global(html[data-theme="light"]) .role-tag.admin {
            background: rgba(28, 108, 161, 0.1);
          }
          .cloudflare-guide-card {
            margin-top: 24px;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 16px 20px;
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.2);
            backdrop-filter: blur(10px);
          }
          .guide-header {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 14px;
            font-weight: 700;
            color: var(--accent);
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.03em;
          }
          .guide-icon {
            color: var(--accent);
          }
          .guide-desc {
            font-size: 12.5px;
            color: var(--text-secondary);
            margin-bottom: 14px;
            line-height: 1.5;
          }
          .guide-steps {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .guide-step {
            display: flex;
            gap: 12px;
            align-items: flex-start;
          }
          .step-num {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: var(--accent-subtle);
            border: 1px solid var(--accent);
            color: var(--accent);
            font-size: 11px;
            font-weight: 700;
            flex-shrink: 0;
            margin-top: 2px;
          }
          .step-text {
            font-size: 12.5px;
            color: var(--text-primary);
            line-height: 1.5;
            flex: 1;
          }
          .dns-code-block {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 6px;
            background: var(--bg-primary);
            padding: 6px 12px;
            border-radius: 6px;
            border: 1px solid var(--border);
            font-size: 11.5px;
          }
          .dns-badge {
            background: var(--accent-subtle);
            border: 1px solid var(--accent);
            color: var(--accent);
            font-weight: 700;
            font-size: 9.5px;
            padding: 1px 6px;
            border-radius: 4px;
            text-transform: uppercase;
          }
          .dns-badge.mx {
            background: rgba(76, 163, 116, 0.12);
            border-color: var(--success);
            color: var(--success);
          }
          .dns-badge.txt {
            background: rgba(148, 163, 184, 0.12);
            border-color: var(--text-muted);
            color: var(--text-secondary);
          }
          :global(html[data-theme="light"]) .cloudflare-guide-card {
            background: rgba(0, 0, 0, 0.01);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
          }
          .cf-sync-btn {
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.08) 100%);
            border: 1px solid rgba(245, 158, 11, 0.3);
            color: #f59e0b;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.25s ease;
            white-space: nowrap;
          }
          .cf-sync-btn:hover:not(:disabled) {
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(245, 158, 11, 0.15) 100%);
            border-color: rgba(245, 158, 11, 0.5);
            box-shadow: 0 0 20px rgba(245, 158, 11, 0.12);
          }
          .cf-sync-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .spin-animation {
            animation: spin 1s linear infinite;
          }
          .cf-sync-result {
            margin-top: 12px;
            padding: 14px 16px;
            border-radius: 10px;
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.03) 100%);
            border: 1px solid rgba(16, 185, 129, 0.2);
            font-size: 12.5px;
          }
          .cf-sync-header {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            color: #10b981;
            margin-bottom: 8px;
          }
          .cf-sync-added {
            color: #10b981;
            margin-top: 4px;
          }
          .cf-sync-info {
            color: var(--text-secondary);
            margin-top: 4px;
          }
          .cf-sync-errors {
            color: var(--error);
            margin-top: 6px;
            font-size: 12px;
          }
          .cf-domains-list {
            margin-top: 14px;
            margin-bottom: 14px;
            padding: 16px;
            background: rgba(245, 158, 11, 0.03);
            border: 1px solid rgba(245, 158, 11, 0.2);
            border-radius: 12px;
          }
          .cf-domains-title {
            font-size: 13.5px;
            font-weight: 700;
            color: #f59e0b;
            margin-bottom: 12px;
          }
          .cf-domains-grid {
            display: flex;
            flex-direction: column;
            gap: 8px;
            max-height: 200px;
            overflow-y: auto;
            margin-bottom: 12px;
            padding-right: 4px;
          }
          .cf-domain-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            border-radius: 8px;
            font-size: 13px;
          }
          .cf-domain-check {
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            user-select: none;
            color: var(--text-primary);
          }
          .cf-domain-check.disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
          .cf-domain-status {
            font-size: 11px;
            font-weight: 600;
            padding: 1px 6px;
            border-radius: 4px;
            background: rgba(16, 185, 129, 0.15);
            color: #10b981;
          }
          .cf-domain-status.synced {
            background: rgba(99, 102, 241, 0.15);
            color: var(--accent);
          }
          .cf-actions-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 12px;
            border-top: 1px solid rgba(245, 158, 11, 0.15);
            padding-top: 12px;
            margin-top: 12px;
          }
        `}</style>
      </div>
    </div>
  );
}
