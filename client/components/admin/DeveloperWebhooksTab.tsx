'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { WEBHOOK_EVENTS } from '@/lib/constants';
import { TableSkeleton } from '../SkeletonLoader';
import type { AdminTabProps } from './types';

const WEBHOOK_EVENT_LABELS: Record<string, { label: string; description: string }> = {
  'email.received': { label: 'Email nhận được', description: 'Khi có email mới gửi đến' },
  'otp.detected': { label: 'OTP được phát hiện', description: 'Khi mã OTP/code được tìm thấy trong email' },
};

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

export default function DeveloperWebhooksTab({
  loadingData, loading, setLoading, error, setError, toast, t, setConfirmAction,
}: AdminTabProps) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [fetching, setFetching] = useState(false);
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [newWebhookData, setNewWebhookData] = useState({ url: '', name: '', events: [] as string[] });
  const [createdWebhook, setCreatedWebhook] = useState<{ name: string; secret: string } | null>(null);

  useEffect(() => {
    loadWebhooks();
  }, []);

  async function loadWebhooks() {
    setFetching(true);
    setError('');
    try {
      const data = await api.developer.webhooks.list();
      setWebhooks(data.webhooks || []);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải danh sách Webhooks');
    } finally {
      setFetching(false);
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
      loadWebhooks();
      toast('Webhook đã được tạo. Hãy lưu secret!', 'success');
    } catch (err: any) {
      toast(err.message || 'Thất bại khi tạo Webhook', 'error');
    } finally {
      setLoading(false);
    }
  }

  function handleDeleteWebhook(id: string, name: string) {
    setConfirmAction({
      title: 'Xóa Webhook',
      message: `Bạn có chắc chắn muốn xóa webhook "${name || 'Webhook'}" này? Webhook sẽ không còn nhận được thông báo.`,
      onConfirm: async () => {
        setLoading(true);
        try {
          await api.developer.webhooks.delete(id);
          loadWebhooks();
          toast('Webhook đã bị xóa', 'success');
        } catch (err: any) {
          toast(err.message || 'Lỗi khi xóa Webhook', 'error');
        } finally {
          setLoading(false);
        }
      },
    });
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

  if (fetching) return <TableSkeleton />;

  return (
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

      {webhooks.length === 0 ? (
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
                {webhook.lastTriggeredAt && (
                  <span className="key-date">
                    Kích hoạt cuối: {new Date(webhook.lastTriggeredAt).toLocaleString('vi-VN')}
                  </span>
                )}
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
              <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                <code style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--bg-primary)', padding: '4px 8px', borderRadius: 4 }}>
                  Secret: {webhook.secretHint}
                </code>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDeleteWebhook(webhook.id, webhook.name)}
                >
                  Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Webhook Modal */}
      {showCreateWebhook && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowCreateWebhook(false)}>
          <div className="create-modal" onClick={e => e.stopPropagation()}>
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
                          <span className="scope-label">{event?.label || eventId}</span>
                          <span className="scope-desc">{event?.description || ''}</span>
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

      {/* Created Webhook Info Modal */}
      {createdWebhook && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="create-modal" onClick={e => e.stopPropagation()}>
            <div className="create-modal-header">
              <h3 style={{ color: 'var(--success)' }}>Webhook đã được tạo!</h3>
            </div>
            <div className="create-modal-body">
              <div style={{ padding: 16, background: 'var(--bg-tertiary)', borderRadius: 0, marginBottom: 16 }}>
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
              <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 0, border: '1px solid var(--border)' }}>
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

      <style jsx>{`
        .webhook-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .webhook-item {
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          border-radius: 0px;
          padding: 16px;
          transition: all 0.2s ease;
        }
        .webhook-item:hover {
          border-color: var(--border);
          box-shadow: var(--shadow);
        }
        .webhook-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .webhook-name {
          font-weight: 600;
          font-size: 14.5px;
          color: var(--text-primary);
        }
        .key-status {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 0px;
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
        .key-url {
          font-size: 12px;
          color: var(--text-secondary);
          max-width: 100%;
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
          background: var(--bg-tertiary);
          border: 1px solid var(--border-light);
          border-radius: 0px;
          color: var(--text-secondary);
        }
        .create-modal {
          background: var(--bg-primary);
          border: 2px solid var(--border);
          border-radius: 0px;
          width: min(480px, 100%);
          max-height: min(650px, 90vh);
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow);
          position: relative;
          overflow: hidden;
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
          border-radius: 0px;
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
      `}</style>
    </div>
  );
}
