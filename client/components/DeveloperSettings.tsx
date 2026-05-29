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

type Tab = 'keys' | 'webhooks' | 'usage' | 'dotmails' | 'password';

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
  emails: { total: number; today: number };
}

export default function DeveloperSettings({ onClose }: DeveloperSettingsProps) {
  const { t, toast } = useApp();
  const [tab, setTab] = useState<Tab>('usage');
  const modalRef = useRef<HTMLDivElement>(null);
  const subModalRef = useRef<HTMLDivElement>(null);

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [dotmailParents, setDotmailParents] = useState<any[]>([]);
  const [parentStatuses, setParentStatuses] = useState<Record<string, 'unchecked' | 'checking' | 'live' | 'dead'>>({});
  const [newGmailAddress, setNewGmailAddress] = useState('');
  const [newGmailAppPassword, setNewGmailAppPassword] = useState('');
  const [showGmailHelp, setShowGmailHelp] = useState(false);
  const [expandedParent, setExpandedParent] = useState<string | null>(null);
  const [checkingParentId, setCheckingParentId] = useState<string | null>(null);
  const [editingParentId, setEditingParentId] = useState<string | null>(null);
  const [editingAppPassword, setEditingAppPassword] = useState('');
  const [dotmailGenerating, setDotmailGenerating] = useState(false);

  // Modal states
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [newKeyData, setNewKeyData] = useState({ name: '', scopes: [] as string[], expiresAt: '' });
  const [newWebhookData, setNewWebhookData] = useState({ url: '', name: '', events: [] as string[] });
  const [createdKey, setCreatedKey] = useState<{ name: string; key: string } | null>(null);
  const [createdWebhook, setCreatedWebhook] = useState<{ name: string; secret: string } | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [confirmDeleteWebhook, setConfirmDeleteWebhook] = useState<string | null>(null);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const hasSubModal = showCreateKey || showCreateWebhook || !!createdKey || !!createdWebhook || !!confirmRevoke || !!confirmDeleteWebhook || showGmailHelp;

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
        else if (showGmailHelp) setShowGmailHelp(false);
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
      } else if (tab === 'dotmails') {
        const data = await api.admin.dotmails();
        setDotmailParents(data.parents || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  // Dotmail functions
  async function loadDotmails() {
    setLoading(true);
    setError('');
    try {
      const data = await api.admin.dotmails();
      setDotmailParents(data.parents || []);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải Gmail Parents');
    } finally {
      setLoading(false);
    }
  }

  async function triggerParentStatusCheck(id: string) {
    setParentStatuses(prev => ({ ...prev, [id]: 'checking' }));
    try {
      const res = await api.admin.checkGmailParent(id);
      if (res.success) {
        setParentStatuses(prev => ({ ...prev, [id]: 'live' }));
      } else {
        setParentStatuses(prev => ({ ...prev, [id]: 'dead' }));
      }
    } catch {
      setParentStatuses(prev => ({ ...prev, [id]: 'dead' }));
    }
  }

  useEffect(() => {
    if (tab === 'dotmails' && dotmailParents.length > 0) {
      dotmailParents.forEach((parent: any) => {
        if (!parentStatuses[parent.id]) {
          triggerParentStatusCheck(parent.id);
        }
      });
    }
  }, [dotmailParents, tab]);

  async function handleAddGmailParent() {
    if (!newGmailAddress.trim() || !newGmailAppPassword.trim()) {
      toast('Vui lòng nhập địa chỉ Gmail và mật khẩu ứng dụng', 'error');
      return;
    }
    setLoading(true);
    try {
      await api.admin.addGmailParent({
        address: newGmailAddress.trim(),
        app_password: newGmailAppPassword.trim(),
      });
      setNewGmailAddress('');
      setNewGmailAppPassword('');
      toast('Đã thêm Gmail Parent thành công', 'success');
      loadDotmails();
    } catch (err: any) {
      toast(err.message || 'Thất bại khi thêm Gmail Parent', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteGmailParent(id: string, address: string) {
    if (!window.confirm(`Xóa ${address} và tất cả dotmail liên quan?`)) return;
    setLoading(true);
    try {
      await api.admin.deleteGmailParent(id);
      toast('Đã xóa Gmail Parent', 'success');
      loadDotmails();
    } catch (err: any) {
      toast(err.message || 'Thất bại khi xóa Gmail Parent', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateParent(id: string) {
    if (!editingAppPassword.trim()) {
      toast('Vui lòng nhập mật khẩu ứng dụng mới', 'error');
      return;
    }
    setLoading(true);
    try {
      await api.admin.updateGmailParent(id, editingAppPassword.trim());
      setEditingParentId(null);
      setEditingAppPassword('');
      toast('Cập nhật mật khẩu ứng dụng thành công', 'success');
      loadDotmails();
    } catch (err: any) {
      toast(err.message || 'Thất bại khi cập nhật mật khẩu ứng dụng', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckGmailParent(id: string) {
    setCheckingParentId(id);
    setParentStatuses(prev => ({ ...prev, [id]: 'checking' }));
    try {
      const res = await api.admin.checkGmailParent(id);
      if (res.success) {
        setParentStatuses(prev => ({ ...prev, [id]: 'live' }));
        toast(res.message || 'Kết nối thành công!', 'success');
      } else {
        setParentStatuses(prev => ({ ...prev, [id]: 'dead' }));
        toast(res.error || 'Lỗi kết nối IMAP', 'error');
      }
    } catch (err: any) {
      setParentStatuses(prev => ({ ...prev, [id]: 'dead' }));
      toast(err.message || 'Thất bại khi kết nối IMAP', 'error');
    } finally {
      setCheckingParentId(null);
    }
  }

  async function handleGenerateDotmails(parentId: string) {
    setDotmailGenerating(true);
    try {
      const data = await api.admin.generateDotmails(parentId);
      toast(`Đã tạo ${data.total} dotmail`, 'success');
      loadDotmails();
    } catch (err: any) {
      toast(err.message || 'Thất bại khi sinh dotmail', 'error');
    } finally {
      setDotmailGenerating(false);
    }
  }

  async function handleDeleteDotmail(id: string, address: string) {
    if (!window.confirm(`Xóa dotmail: ${address}?`)) return;
    try {
      await api.admin.deleteDotmail(id);
      toast('Đã xóa dotmail', 'success');
      loadDotmails();
    } catch (err: any) {
      toast(err.message || 'Thất bại khi xóa dotmail', 'error');
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

  function setPasswordField(key: string, value: string) {
    setPasswordForm(prev => ({ ...prev, [key]: value }));
    setPasswordError('');
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError(t('passwordMismatch'));
      return;
    }

    setPasswordLoading(true);
    try {
      await api.auth.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast(t('passwordChanged'), 'success');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  }

  const tabs: { id: Tab; label: string; icon: JSX.Element }[] = [
    {
      id: 'usage',
      label: 'Thống kê',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    },
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
      id: 'dotmails',
      label: 'Dotmail',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2"/><polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2"/></svg>,
    },
    {
      id: 'password',
      label: 'Đổi mật khẩu',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 1.5 1.5M15.5 7.5L14 6" /></svg>,
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
                    <div className="stat-value">{usage.accounts.total}</div>
                    <div className="stat-label">Hộp thư đang dùng</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{usage.emails.total}</div>
                    <div className="stat-label">Tổng thư đã nhận</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{usage.emails.today}</div>
                    <div className="stat-label">Thư nhận hôm nay</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{usage.apiKeys.active}</div>
                    <div className="stat-label">API Keys Hoạt động</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{usage.webhooks.active}</div>
                    <div className="stat-label">Webhooks Hoạt động</div>
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
                    <div className="stat-label">Webhooks Gửi hôm nay</div>
                  </div>
                </div>
              </div>
            ) : null
          )}

          {/* Dotmails Tab */}
          {tab === 'dotmails' && (
            loading ? (
              <StatsSkeleton />
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Gmail Parent & Dotmails</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      Thêm Gmail gốc và mật khẩu ứng dụng để tạo danh sách dotmail cá nhân.
                    </p>
                  </div>
                </div>

                <div className="add-domain-form" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <input
                    className="input"
                    style={{ flex: 1 }}
                    placeholder="Gmail gốc (vd: 00yt0001@gmail.com)"
                    value={newGmailAddress}
                    onChange={e => setNewGmailAddress(e.target.value)}
                  />
                  <input
                    className="input"
                    style={{ flex: 1 }}
                    type="password"
                    placeholder="App Password (16 ký tự)"
                    value={newGmailAppPassword}
                    onChange={e => setNewGmailAppPassword(e.target.value)}
                  />
                  <button className="btn btn-primary" onClick={handleAddGmailParent} disabled={loading || !newGmailAddress.trim() || !newGmailAppPassword.trim()}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginRight: 4 }}><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    Thêm Gmail
                  </button>
                  <button 
                    className="btn btn-ghost" 
                    style={{ padding: '0 8px', height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                    onClick={() => setShowGmailHelp(true)}
                    title="Hướng dẫn cấu hình Gmail"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
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
                        style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: 'var(--bg-secondary)' }}
                        onClick={() => setExpandedParent(isExpanded ? null : parent.id)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2"/><polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2"/></svg>
                          <span style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)' }}>{parent.address}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4 }}>
                            {dotmails.length} dotmails
                          </span>
                          {(() => {
                            const status = parentStatuses[parent.id] || 'unchecked';
                            if (status === 'checking') {
                              return (
                                <span style={{ fontSize: 11, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '2px 8px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeDasharray="32" /><path d="M12 2a10 10 0 0 1 10 10" /></svg>
                                  Đang check
                                </span>
                              );
                            }
                            if (status === 'live') {
                              return (
                                <span style={{ fontSize: 11, color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
                                  Live
                                </span>
                              );
                            }
                            if (status === 'dead') {
                              return (
                                <span style={{ fontSize: 11, color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
                                  Dead
                                </span>
                              );
                            }
                            return (
                              <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 12 }}>
                                Chưa check
                              </span>
                            );
                          })()}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button 
                            className="btn btn-ghost btn-sm" 
                            style={{ padding: 4 }}
                            onClick={(e) => { e.stopPropagation(); handleCheckGmailParent(parent.id); }} 
                            disabled={checkingParentId !== null} 
                            title="Kiểm tra kết nối"
                          >
                            {checkingParentId === parent.id ? (
                              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" /><path d="M12 2a10 10 0 0 1 10 10" /></svg>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                              </svg>
                            )}
                          </button>
                          <button 
                            className="btn btn-ghost btn-sm" 
                            style={{ padding: 4 }}
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setEditingParentId(editingParentId === parent.id ? null : parent.id);
                              setEditingAppPassword('');
                            }} 
                            title="Sửa mật khẩu ứng dụng"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button className="btn btn-ghost btn-sm" style={{ padding: 4 }} onClick={(e) => { e.stopPropagation(); handleGenerateDotmails(parent.id); }} disabled={dotmailGenerating} title="Sinh dotmail">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                          </button>
                          <button className="btn btn-ghost btn-sm" style={{ padding: 4 }} onClick={(e) => { e.stopPropagation(); handleDeleteGmailParent(parent.id, parent.address); }} title="Xóa">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                          </button>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s' }}><polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      </div>

                      {editingParentId === parent.id && (
                        <div 
                          style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border)' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            className="input"
                            style={{ flex: 1, fontSize: 12.5, height: 32, padding: '4px 10px' }}
                            placeholder="Nhập Mật khẩu ứng dụng mới (16 ký tự)"
                            type="password"
                            value={editingAppPassword}
                            onChange={e => setEditingAppPassword(e.target.value)}
                          />
                          <button 
                            className="btn btn-primary btn-sm" 
                            style={{ height: 32, padding: '0 12px', fontSize: 12 }}
                            onClick={() => handleUpdateParent(parent.id)}
                            disabled={loading || !editingAppPassword.trim()}
                          >
                            Lưu
                          </button>
                          <button 
                            className="btn btn-ghost btn-sm" 
                            style={{ height: 32, padding: '0 12px', fontSize: 12 }}
                            onClick={() => setEditingParentId(null)}
                          >
                            Hủy
                          </button>
                        </div>
                      )}

                      {isExpanded && dotmails.length > 0 && (
                        <div style={{ maxHeight: 300, overflowY: 'auto', padding: '8px 14px', background: 'var(--bg-tertiary)' }}>
                          {dotmails.map((d: any) => (
                            <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                              <span style={{ fontFamily: 'monospace', fontSize: 12.5, color: 'var(--text-primary)' }}>{d.address}</span>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button className="btn btn-ghost btn-sm" style={{ padding: '3px 6px' }} onClick={() => { navigator.clipboard.writeText(d.address); toast('Đã copy', 'success'); }} title="Copy">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2"/></svg>
                                </button>
                                <button className="btn btn-ghost btn-sm" style={{ padding: '3px 6px', color: 'var(--error)' }} onClick={() => handleDeleteDotmail(d.id, d.address)} title="Xóa">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {isExpanded && dotmails.length === 0 && (
                        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5, background: 'var(--bg-tertiary)' }}>
                          Chưa có dotmail. Nhấn nút sinh dotmail ở trên.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* Password Tab */}
          {tab === 'password' && (
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 0' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
                {t('changePassword')}
              </h3>
              <form onSubmit={handlePasswordSubmit}>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    {t('currentPassword')}
                  </label>
                  <input
                    className="input"
                    type="password"
                    placeholder="••••••••"
                    value={passwordForm.currentPassword}
                    onChange={e => setPasswordField('currentPassword', e.target.value)}
                    required
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    {t('newPassword')}
                  </label>
                  <input
                    className="input"
                    type="password"
                    placeholder={t('minChars')}
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordField('newPassword', e.target.value)}
                    required
                    minLength={8}
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    {t('confirmNewPassword')}
                  </label>
                  <input
                    className="input"
                    type="password"
                    placeholder={t('minChars')}
                    value={passwordForm.confirmPassword}
                    onChange={e => setPasswordField('confirmPassword', e.target.value)}
                    required
                    minLength={8}
                    style={{ width: '100%' }}
                  />
                </div>

                {passwordError && <div className="form-error" style={{ marginBottom: 16, color: 'var(--error)', fontSize: 12.5 }}>{passwordError}</div>}

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={passwordLoading}
                  style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}
                >
                  {passwordLoading ? <span className="loading-spinner" style={{ width: 16, height: 16, marginRight: 8 }} /> : null}
                  {passwordLoading ? t('changingPassword') : t('changePassword')}
                </button>
              </form>
            </div>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="form-label" style={{ margin: 0 }}>Scopes *</label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button 
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11.5, padding: '2px 8px', height: 'auto', minHeight: 'unset', color: 'var(--accent)', fontWeight: 500 }}
                      onClick={() => setNewKeyData(prev => ({ ...prev, scopes: [...API_KEY_SCOPES] }))}
                    >
                      Chọn tất cả
                    </button>
                    <button 
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11.5, padding: '2px 8px', height: 'auto', minHeight: 'unset', color: 'var(--text-muted)', fontWeight: 500 }}
                      onClick={() => setNewKeyData(prev => ({ ...prev, scopes: [] }))}
                    >
                      Bỏ chọn hết
                    </button>
                  </div>
                </div>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="form-label" style={{ margin: 0 }}>Events *</label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button 
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11.5, padding: '2px 8px', height: 'auto', minHeight: 'unset', color: 'var(--accent)', fontWeight: 500 }}
                      onClick={() => setNewWebhookData(prev => ({ ...prev, events: [...WEBHOOK_EVENTS] }))}
                    >
                      Chọn tất cả
                    </button>
                    <button 
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11.5, padding: '2px 8px', height: 'auto', minHeight: 'unset', color: 'var(--text-muted)', fontWeight: 500 }}
                      onClick={() => setNewWebhookData(prev => ({ ...prev, events: [] }))}
                    >
                      Bỏ chọn hết
                    </button>
                  </div>
                </div>
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

      {showGmailHelp && (
        <div 
          className="create-modal-overlay" 
          style={{ zIndex: 1010 }}
          onClick={() => setShowGmailHelp(false)}
        >
          <div 
            className="create-modal" 
            style={{ 
              width: '100%', 
              maxWidth: 450, 
              padding: 24, 
              background: 'var(--bg-primary)', 
              borderRadius: 12, 
              border: '1px solid var(--border)',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Hướng dẫn cấu hình Gmail</h3>
              <button 
                className="modal-close" 
                style={{ padding: 4 }} 
                onClick={() => setShowGmailHelp(false)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            
            <div style={{ fontSize: 13.5, lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 12, color: 'var(--text-primary)' }}>
              <p>Để hệ thống tmailCC có thể kết nối và tự động lấy mã OTP từ tài khoản Gmail gốc của bạn, vui lòng cấu hình theo các bước sau:</p>
              
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '50%', width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 'bold', flexShrink: 0 }}>1</span>
                <div>
                  <strong>Bật xác minh 2 lớp (2-Step Verification)</strong>
                  <br />
                  Truy cập vào trang cấu hình bảo mật tài khoản Google của bạn và kích hoạt xác minh 2 lớp:
                  <br />
                  👉 <a href="https://myaccount.google.com/signinoptions/two-step-verification" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>Kích hoạt xác minh 2 lớp</a>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '50%', width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 'bold', flexShrink: 0 }}>2</span>
                <div>
                  <strong>Tạo Mật khẩu ứng dụng (App Password)</strong>
                  <br />
                  Sau khi đã bật xác minh 2 lớp, truy cập liên kết dưới đây để tạo Mật khẩu ứng dụng mới cho Mail/IMAP:
                  <br />
                  👉 <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>Tạo Mật khẩu ứng dụng Google</a>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '50%', width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 'bold', flexShrink: 0 }}>3</span>
                <div>
                  <strong>Nhập thông tin và Thêm Gmail</strong>
                  <br />
                  Nhập địa chỉ Gmail gốc (ví dụ: <code>00yt0001@gmail.com</code>) và mật khẩu ứng dụng vừa tạo (16 ký tự viết liền, không dấu cách) vào ô nhập liệu bên ngoài rồi nhấn <strong>Thêm Gmail</strong>.
                </div>
              </div>
            </div>
            
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setShowGmailHelp(false)}>
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
