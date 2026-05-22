'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/AppContext';
import { useFocusTrap } from './useFocusTrap';
import { API_KEY_SCOPES, WEBHOOK_EVENTS } from '@/lib/constants';
import { StatsSkeleton, TableSkeleton } from './SkeletonLoader';

interface DeveloperSettingsProps {
  onClose: () => void;
}

type Tab = 'keys' | 'webhooks' | 'usage';

const SCOPE_LABELS: Record<string, { label: string; description: string }> = {
  'accounts:create': { label: 'Tạo tài khoản email', description: 'Cho phép tạo email accounts mới' },
  'accounts:read': { label: 'Xem tài khoản', description: 'Xem danh sách email accounts' },
  'accounts:delete': { label: 'Xóa tài khoản', description: 'Xóa email accounts' },
  'emails:read': { label: 'Đọc email', description: 'Xem inbox và nội dung email' },
  'emails:delete': { label: 'Xóa email', description: 'Xóa email trong hộp thư' },
  'otp:read': { label: 'Chờ OTP', description: 'Sử dụng endpoint wait-otp' },
  'domains:read': { label: 'Xem domains', description: 'Xem danh sách domains khả dụng' },
  'webhooks:manage': { label: 'Quản lý webhooks', description: 'Tạo và xóa webhooks' },
  'usage:read': { label: 'Xem usage', description: 'Xem thống kê sử dụng' },
};

const WEBHOOK_EVENT_LABELS: Record<string, { label: string; description: string }> = {
  'email.received': { label: 'Email nhận được', description: 'Khi có email mới gửi đến' },
  'otp.detected': { label: 'OTP được phát hiện', description: 'Khi mã OTP/code được tìm thấy trong email' },
};

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  isActive: boolean;
  createdAt: string;
}

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  secretHint: string;
  isActive: boolean;
  lastTriggeredAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  createdAt: string;
}

interface UsageStats {
  apiKeys: { total: number; active: number };
  webhooks: { total: number; active: number };
  apiCalls: { today: number; thisMonth: number };
  webhookDeliveries: { today: number; thisMonth: number };
  accounts: { total: number };
}

export default function DeveloperSettings({ onClose }: DeveloperSettingsProps) {
  const { t, toast } = useApp();
  const [tab, setTab] = useState<Tab>('keys');
  const modalRef = useRef<HTMLDivElement>(null);
  const subModalRef = useRef<HTMLDivElement>(null);

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modal states
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [newKeyData, setNewKeyData] = useState({ name: '', scopes: [] as string[], expiresAt: '' });
  const [newWebhookData, setNewWebhookData] = useState({ url: '', name: '', events: [] as string[] });
  const [createdKey, setCreatedKey] = useState<{ name: string; key: string } | null>(null);
  const [createdWebhook, setCreatedWebhook] = useState<{ name: string; secret: string } | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [confirmDeleteWebhook, setConfirmDeleteWebhook] = useState<string | null>(null);

  const hasSubModal = showCreateKey || showCreateWebhook || !!createdKey || !!createdWebhook || !!confirmRevoke || !!confirmDeleteWebhook;

  useFocusTrap(modalRef, !hasSubModal);
  useFocusTrap(subModalRef, hasSubModal);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showCreateKey) setShowCreateKey(false);
        else if (showCreateWebhook) setShowCreateWebhook(false);
        else if (createdKey) setCreatedKey(null);
        else if (createdWebhook) setCreatedWebhook(null);
        else if (confirmRevoke) setConfirmRevoke(null);
        else if (confirmDeleteWebhook) setConfirmDeleteWebhook(null);
        else onClose();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [showCreateKey, showCreateWebhook, createdKey, createdWebhook, confirmRevoke, confirmDeleteWebhook, onClose]);

  useEffect(() => {
    loadData();
  }, [tab]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      if (tab === 'keys') {
        const data = await api.developer.keys.list();
        setKeys(data.keys || []);
      } else if (tab === 'webhooks') {
        const data = await api.developer.webhooks.list();
        setWebhooks(data.webhooks || []);
      } else if (tab === 'usage') {
        const data = await api.developer.usage();
        setUsage(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateKey() {
    if (!newKeyData.name.trim()) {
      toast('Vui lòng nhập tên API key', 'error');
      return;
    }
    if (newKeyData.scopes.length === 0) {
      toast('Vui lòng chọn ít nhất 1 scope', 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await api.developer.keys.create({
        name: newKeyData.name.trim(),
        scopes: newKeyData.scopes,
        expiresAt: newKeyData.expiresAt || undefined,
      });
      setCreatedKey({ name: result.name, key: result.key });
      setShowCreateKey(false);
      setNewKeyData({ name: '', scopes: [], expiresAt: '' });
      loadData();
      toast('API key đã được tạo. Hãy lưu lại!', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to create API key', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleRevokeKey(id: string) {
    try {
      await api.developer.keys.revoke(id);
      setConfirmRevoke(null);
      loadData();
      toast('API key đã bị thu hồi', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to revoke key', 'error');
    }
  }

  async function handleCreateWebhook() {
    if (!newWebhookData.url.trim()) {
      toast('Vui lòng nhập URL webhook', 'error');
      return;
    }
    if (!newWebhookData.url.startsWith('http://') && !newWebhookData.url.startsWith('https://')) {
      toast('URL phải bắt đầu bằng http:// hoặc https://', 'error');
      return;
    }
    if (newWebhookData.events.length === 0) {
      toast('Vui lòng chọn ít nhất 1 event', 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await api.developer.webhooks.create({
        url: newWebhookData.url.trim(),
        name: newWebhookData.name.trim(),
        events: newWebhookData.events,
      });
      setCreatedWebhook({ name: result.name, secret: result.secret });
      setShowCreateWebhook(false);
      setNewWebhookData({ url: '', name: '', events: [] });
      loadData();
      toast('Webhook đã được tạo. Hãy lưu secret!', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to create webhook', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteWebhook(id: string) {
    try {
      await api.developer.webhooks.delete(id);
      setConfirmDeleteWebhook(null);
      loadData();
      toast('Webhook đã bị xóa', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to delete webhook', 'error');
    }
  }

  function toggleScope(scopeId: string) {
    setNewKeyData(prev => ({
      ...prev,
      scopes: prev.scopes.includes(scopeId)
        ? prev.scopes.filter(s => s !== scopeId)
        : [...prev.scopes, scopeId],
    }));
  }

  function toggleWebhookEvent(eventId: string) {
    setNewWebhookData(prev => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter(e => e !== eventId)
        : [...prev.events, eventId],
    }));
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast('Đã copy!', 'success');
    } catch {
      toast('Failed to copy', 'error');
    }
  }

  const tabs: { id: Tab; label: string; icon: JSX.Element }[] = [
    {
      id: 'keys',
      label: 'API Keys',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    },
    {
      id: 'webhooks',
      label: 'Webhooks',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    },
    {
      id: 'usage',
      label: 'Usage',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    },
  ];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-label="Developer Settings">
      <div className="developer-panel fade-in" ref={modalRef}>
        <div className="modal-header">
          <h2 className="modal-title">Developer API</h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="tab-bar">
          {tabs.map(tb => (
            <button
              key={tb.id}
              className={`tab-btn ${tab === tb.id ? 'active' : ''}`}
              onClick={() => setTab(tb.id)}
            >
              {tb.icon}
              <span style={{ marginLeft: 6 }}>{tb.label}</span>
            </button>
          ))}
        </div>

        <div className="tab-content">
          {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}

          {/* API Keys Tab */}
          {tab === 'keys' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>API Keys của bạn</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    Sử dụng API keys để tích hợp với bên thứ 3. Key chỉ hiển thị một lần khi tạo!
                  </p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowCreateKey(true)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Tạo Key
                </button>
              </div>

              {loading ? (
                <TableSkeleton />
              ) : keys.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                  Chưa có API key nào. Nhấn &quot;Tạo Key&quot; để bắt đầu.
                </div>
              ) : (
                <div className="key-list">
                  {keys.map(key => (
                    <div key={key.id} className="key-item">
                      <div className="key-header">
                        <div className="key-name">{key.name}</div>
                        <span className={`key-status ${key.isActive ? 'active' : 'revoked'}`}>
                          {key.isActive ? 'Active' : 'Revoked'}
                        </span>
                      </div>
                      <div className="key-meta">
                        <code className="key-prefix">{key.prefix}</code>
                        <span className="key-date">
                          Tạo: {new Date(key.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                        {key.expiresAt && (
                          <span className="key-date">
                            Hết hạn: {new Date(key.expiresAt).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                        {key.lastUsedAt && (
                          <span className="key-date">
                            Sử dụng cuối: {new Date(key.lastUsedAt).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                      </div>
                      <div className="key-scopes">
                        {key.scopes.map(scope => (
                          <span key={scope} className="scope-tag">{scope}</span>
                        ))}
                      </div>
                      {key.isActive && (
                        <button
                          className="btn btn-danger btn-sm"
                          style={{ marginTop: 8 }}
                          onClick={() => setConfirmRevoke(key.id)}
                        >
                          Thu hồi Key
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Webhooks Tab */}
          {tab === 'webhooks' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Webhooks</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    Nhận thông báo khi có email mới hoặc OTP được phát hiện.
                  </p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowCreateWebhook(true)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Tạo Webhook
                </button>
              </div>

              {loading ? (
                <TableSkeleton />
              ) : webhooks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                  Chưa có webhook nào. Nhấn &quot;Tạo Webhook&quot; để bắt đầu.
                </div>
              ) : (
                <div className="webhook-list">
                  {webhooks.map(webhook => (
                    <div key={webhook.id} className="webhook-item">
                      <div className="webhook-header">
                        <div className="webhook-name">{webhook.name || 'Webhook'}</div>
                        <span className={`key-status ${webhook.isActive ? 'active' : 'revoked'}`}>
                          {webhook.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="key-meta">
                        <span className="key-url" title={webhook.url}>{webhook.url}</span>
                      </div>
                      <div className="key-scopes">
                        {webhook.events.map(event => (
                          <span key={event} className="scope-tag">{event}</span>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                        {webhook.lastSuccessAt && (
                          <span className="key-date" style={{ color: 'var(--success)' }}>
                            Thành công: {new Date(webhook.lastSuccessAt).toLocaleString('vi-VN')}
                          </span>
                        )}
                        {webhook.lastError && (
                          <span className="key-date" style={{ color: 'var(--error)' }}>
                            Lỗi: {webhook.lastError.slice(0, 50)}...
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <code style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--bg-primary)', padding: '4px 8px', borderRadius: 4 }}>
                          Secret: {webhook.secretHint}
                        </code>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => setConfirmDeleteWebhook(webhook.id)}
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Usage Tab */}
          {tab === 'usage' && (
            loading ? (
              <StatsSkeleton />
            ) : usage ? (
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
                  Thống kê sử dụng
                </h3>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{usage.apiKeys.active}</div>
                    <div className="stat-label">API Keys Active</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{usage.webhooks.active}</div>
                    <div className="stat-label">Webhooks Active</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{usage.accounts.total}</div>
                    <div className="stat-label">Email Accounts</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{usage.apiCalls.today}</div>
                    <div className="stat-label">API Calls Hôm nay</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{usage.apiCalls.thisMonth}</div>
                    <div className="stat-label">API Calls Tháng này</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{usage.webhookDeliveries.today}</div>
                    <div className="stat-label">Webhook Deliveries Hôm nay</div>
                  </div>
                </div>
              </div>
            ) : null
          )}
        </div>
      </div>

      {/* Create API Key Modal */}
      {showCreateKey && (
        <div className="create-modal-overlay">
          <div className="create-modal" ref={subModalRef} onClick={e => e.stopPropagation()}>
            <div className="create-modal-header">
              <h3>Tạo API Key mới</h3>
              <button className="modal-close" onClick={() => setShowCreateKey(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="create-modal-body">
              <div className="form-group">
                <label className="form-label">Tên API Key *</label>
                <input
                  className="input"
                  placeholder="VD: My App Integration"
                  value={newKeyData.name}
                  onChange={e => setNewKeyData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Ngày hết hạn (tùy chọn)</label>
                <input
                  className="input"
                  type="date"
                  value={newKeyData.expiresAt}
                  onChange={e => setNewKeyData(prev => ({ ...prev, expiresAt: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Scopes *</label>
                <div className="scope-list">
                  {API_KEY_SCOPES.map(scopeId => {
                    const scope = SCOPE_LABELS[scopeId];
                    return (
                      <label key={scopeId} className="scope-option">
                        <input
                          type="checkbox"
                          checked={newKeyData.scopes.includes(scopeId)}
                          onChange={() => toggleScope(scopeId)}
                        />
                        <div>
                          <span className="scope-label">{scope.label}</span>
                          <span className="scope-desc">{scope.description}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="create-modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowCreateKey(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleCreateKey} disabled={loading}>
                {loading ? 'Đang tạo...' : 'Tạo Key'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Created Key Modal */}
      {createdKey && (
        <div className="create-modal-overlay">
          <div className="create-modal" ref={subModalRef} onClick={e => e.stopPropagation()}>
            <div className="create-modal-header">
              <h3 style={{ color: 'var(--success)' }}>API Key đã được tạo!</h3>
            </div>
            <div className="create-modal-body">
              <div style={{ padding: 16, background: 'var(--bg-tertiary)', borderRadius: 8, marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Tên: {createdKey.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  API Key:
                </div>
                <code style={{ fontSize: 13, wordBreak: 'break-all', color: 'var(--accent)' }}>
                  {createdKey.key}
                </code>
              </div>
              <div style={{ padding: 12, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, border: '1px solid var(--error)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--error)', marginBottom: 4 }}>
                  Quan trọng!
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  API Key chỉ hiển thị một lần duy nhất. Hãy lưu lại ngay bây giờ!
                </div>
              </div>
            </div>
            <div className="create-modal-footer">
              <button className="btn btn-primary" onClick={() => {
                copyToClipboard(createdKey.key);
                setCreatedKey(null);
              }}>
                Copy Key
              </button>
              <button className="btn btn-ghost" onClick={() => setCreatedKey(null)}>
                Đã lưu, đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Webhook Modal */}
      {showCreateWebhook && (
        <div className="create-modal-overlay">
          <div className="create-modal" ref={subModalRef} onClick={e => e.stopPropagation()}>
            <div className="create-modal-header">
              <h3>Tạo Webhook mới</h3>
              <button className="modal-close" onClick={() => setShowCreateWebhook(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="create-modal-body">
              <div className="form-group">
                <label className="form-label">URL Webhook *</label>
                <input
                  className="input"
                  placeholder="https://your-server.com/webhook"
                  value={newWebhookData.url}
                  onChange={e => setNewWebhookData(prev => ({ ...prev, url: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Tên (tùy chọn)</label>
                <input
                  className="input"
                  placeholder="VD: Production Webhook"
                  value={newWebhookData.name}
                  onChange={e => setNewWebhookData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Events *</label>
                <div className="scope-list">
                  {WEBHOOK_EVENTS.map(eventId => {
                    const event = WEBHOOK_EVENT_LABELS[eventId];
                    return (
                      <label key={eventId} className="scope-option">
                        <input
                          type="checkbox"
                          checked={newWebhookData.events.includes(eventId)}
                          onChange={() => toggleWebhookEvent(eventId)}
                        />
                        <div>
                          <span className="scope-label">{event.label}</span>
                          <span className="scope-desc">{event.description}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="create-modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowCreateWebhook(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleCreateWebhook} disabled={loading}>
                {loading ? 'Đang tạo...' : 'Tạo Webhook'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Created Webhook Modal */}
      {createdWebhook && (
        <div className="create-modal-overlay">
          <div className="create-modal" ref={subModalRef} onClick={e => e.stopPropagation()}>
            <div className="create-modal-header">
              <h3 style={{ color: 'var(--success)' }}>Webhook đã được tạo!</h3>
            </div>
            <div className="create-modal-body">
              <div style={{ padding: 16, background: 'var(--bg-tertiary)', borderRadius: 8, marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Tên: {createdWebhook.name || 'Webhook'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Webhook Secret:
                </div>
                <code style={{ fontSize: 13, wordBreak: 'break-all', color: 'var(--accent)' }}>
                  {createdWebhook.secret}
                </code>
              </div>
              <div style={{ padding: 12, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, border: '1px solid var(--error)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--error)', marginBottom: 4 }}>
                  Quan trọng!
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Secret chỉ hiển thị một lần duy nhất. Hãy lưu lại ngay bây giờ!
                </div>
              </div>
            </div>
            <div className="create-modal-footer">
              <button className="btn btn-primary" onClick={() => {
                copyToClipboard(createdWebhook.secret);
                setCreatedWebhook(null);
              }}>
                Copy Secret
              </button>
              <button className="btn btn-ghost" onClick={() => setCreatedWebhook(null)}>
                Đã lưu, đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Revoke Modal */}
      {confirmRevoke && (
        <div className="create-modal-overlay">
          <div className="create-modal confirm-modal" ref={subModalRef} onClick={e => e.stopPropagation()}>
            <div className="create-modal-header">
              <h3>Xác nhận thu hồi</h3>
            </div>
            <div className="create-modal-body">
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                Bạn có chắc muốn thu hồi API key này? Key sẽ không còn hoạt động và tất cả request sử dụng key này sẽ bị từ chối.
              </p>
            </div>
            <div className="create-modal-footer">
              <button className="btn btn-ghost" onClick={() => setConfirmRevoke(null)}>Hủy</button>
              <button className="btn btn-danger" onClick={() => handleRevokeKey(confirmRevoke)}>
                Thu hồi Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Webhook Modal */}
      {confirmDeleteWebhook && (
        <div className="create-modal-overlay">
          <div className="create-modal confirm-modal" ref={subModalRef} onClick={e => e.stopPropagation()}>
            <div className="create-modal-header">
              <h3>Xác nhận xóa</h3>
            </div>
            <div className="create-modal-body">
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                Bạn có chắc muốn xóa webhook này? Webhook sẽ không còn nhận được thông báo.
              </p>
            </div>
            <div className="create-modal-footer">
              <button className="btn btn-ghost" onClick={() => setConfirmDeleteWebhook(null)}>Hủy</button>
              <button className="btn btn-danger" onClick={() => handleDeleteWebhook(confirmDeleteWebhook)}>
                Xóa Webhook
              </button>
            </div>
          </div>
        </div>
      )}

        <style jsx>{`
          .developer-panel {
            background: linear-gradient(135deg, #0a1424 0%, #050a12 100%);
            border: 1px solid rgba(197, 160, 89, 0.18);
            border-radius: 20px;
            width: 90vw;
            max-width: 800px;
            height: 600px;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-shadow: 0 25px 80px -10px rgba(0, 0, 0, 0.65), 0 0 40px rgba(197, 160, 89, 0.05);
            position: relative;
          }
          .developer-panel::before {
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
          .developer-panel > * {
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
            background: rgba(0, 0, 0, 0.25);
            gap: 4px;
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
          .key-list, .webhook-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .key-item, .webhook-item {
            background: linear-gradient(135deg, rgba(18, 29, 45, 0.4) 0%, rgba(10, 18, 28, 0.4) 100%);
            border: 1px solid rgba(197, 160, 89, 0.1);
            border-radius: 12px;
            padding: 16px;
            transition: all 0.2s ease;
          }
          .key-item:hover, .webhook-item:hover {
            border-color: rgba(197, 160, 89, 0.25);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
          }
          .key-header, .webhook-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
          }
          .key-name, .webhook-name {
            font-weight: 600;
            font-size: 14.5px;
            color: var(--text-primary);
          }
          .key-status {
            font-size: 11px;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: 4px;
          }
          .key-status.active {
            background: rgba(34, 197, 94, 0.15);
            color: var(--success);
          }
          .key-status.revoked {
            background: rgba(239, 68, 68, 0.15);
            color: var(--error);
          }
          .key-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-bottom: 8px;
          }
          .key-prefix {
            font-size: 12px;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.05);
            padding: 2px 8px;
            border-radius: 4px;
            color: var(--accent);
          }
          .key-url {
            font-size: 12px;
            color: var(--text-secondary);
            max-width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .key-date {
            font-size: 11px;
            color: var(--text-muted);
          }
          .key-scopes {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
          }
          .scope-tag {
            font-size: 11px;
            padding: 2px 8px;
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 4px;
            color: var(--text-secondary);
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
          .create-modal-overlay {
            position: fixed;
            inset: 0;
            z-index: 1100;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(6, 13, 23, 0.5);
            backdrop-filter: blur(4px);
            padding: 16px;
          }
          .create-modal {
            background: linear-gradient(135deg, #0a1424 0%, #050a12 100%);
            border: 1px solid rgba(197, 160, 89, 0.18);
            border-radius: 16px;
            width: min(480px, 100%);
            max-height: min(650px, 90vh);
            display: flex;
            flex-direction: column;
            box-shadow: 0 25px 80px -10px rgba(0, 0, 0, 0.65), 0 0 40px rgba(197, 160, 89, 0.04);
            position: relative;
            overflow: hidden;
          }
          .confirm-modal {
            width: min(360px, 100%);
            max-height: fit-content;
          }
          .create-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            border-bottom: 1px solid var(--border);
            flex-shrink: 0;
          }
          .create-modal-header h3 {
            font-size: 16px;
            font-weight: 700;
            color: var(--text-primary);
          }
          .create-modal-body {
            padding: 20px;
            overflow-y: auto;
            flex: 1;
          }
          .create-modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            padding: 16px 20px;
            border-top: 1px solid var(--border);
            flex-shrink: 0;
          }
          .form-group {
            margin-bottom: 16px;
          }
          .form-group:last-child {
            margin-bottom: 0;
          }
          .form-label {
            display: block;
            font-size: 13px;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 6px;
          }
          .scope-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding: 4px;
          }
          .scope-option {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 10px 12px;
            background: var(--bg-tertiary);
            border: 1px solid var(--border);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.15s;
          }
          .scope-option:hover {
            border-color: var(--accent);
          }
          .scope-option input {
            margin-top: 2px;
          }
          .scope-option div {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .scope-label {
            font-size: 13px;
            font-weight: 500;
            color: var(--text-primary);
          }
          .scope-desc {
            font-size: 11px;
            color: var(--text-secondary);
          }
          :global(html[data-theme="light"]) .developer-panel {
            background: linear-gradient(135deg, #ffffff 0%, #f0f4f8 100%);
            border: 1px solid rgba(28, 108, 161, 0.18);
            box-shadow: 0 25px 80px -10px rgba(0, 0, 0, 0.15), 0 0 40px rgba(28, 108, 161, 0.02);
          }
          :global(html[data-theme="light"]) .developer-panel::before {
            opacity: 0.08;
          }
          :global(html[data-theme="light"]) .modal-header {
            border-bottom-color: rgba(28, 108, 161, 0.12);
          }
          :global(html[data-theme="light"]) .tab-bar {
            border-bottom-color: rgba(28, 108, 161, 0.12);
            background: rgba(0, 0, 0, 0.03);
          }
          :global(html[data-theme="light"]) .tab-btn.active {
            text-shadow: 0 0 10px rgba(28, 108, 161, 0.15);
          }
          :global(html[data-theme="light"]) .key-item,
          :global(html[data-theme="light"]) .webhook-item {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(240, 244, 248, 0.8) 100%);
            border-color: rgba(28, 108, 161, 0.12);
          }
          :global(html[data-theme="light"]) .key-item:hover,
          :global(html[data-theme="light"]) .webhook-item:hover {
            border-color: rgba(28, 108, 161, 0.3);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
          }
          :global(html[data-theme="light"]) .key-prefix {
            background: rgba(0, 0, 0, 0.05);
            border-color: rgba(0, 0, 0, 0.05);
          }
          :global(html[data-theme="light"]) .scope-tag {
            background: rgba(0, 0, 0, 0.05);
            border-color: rgba(0, 0, 0, 0.05);
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
          :global(html[data-theme="light"]) .create-modal {
            background: linear-gradient(135deg, #ffffff 0%, #f0f4f8 100%);
            border-color: rgba(28, 108, 161, 0.18);
            box-shadow: 0 25px 80px -10px rgba(0, 0, 0, 0.15), 0 0 40px rgba(28, 108, 161, 0.02);
          }
        `}</style>
    </div>
  );
}
