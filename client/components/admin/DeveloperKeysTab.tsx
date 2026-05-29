'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { API_KEY_SCOPES } from '@/lib/constants';
import { TableSkeleton } from '../SkeletonLoader';
import type { AdminTabProps } from './types';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  isActive: boolean;
  createdAt: string;
  key?: string | null;
}

export default function DeveloperKeysTab({
  loadingData, loading, setLoading, error, setError, toast, t, setConfirmAction,
}: AdminTabProps) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [fetching, setFetching] = useState(false);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyData, setNewKeyData] = useState({ name: '', scopes: [] as string[], expiresAt: '' });
  const [createdKey, setCreatedKey] = useState<{ name: string; key: string } | null>(null);

  useEffect(() => {
    loadKeys();
  }, []);

  const getScopeInfo = (scopeId: string) => {
    const labelKey = `scope_${scopeId}_label` as any;
    const descKey = `scope_${scopeId}_desc` as any;
    return {
      label: t(labelKey),
      description: t(descKey),
    };
  };

  async function loadKeys() {
    setFetching(true);
    setError('');
    try {
      const data = await api.developer.keys.list();
      setKeys(data.keys || []);
    } catch (err: any) {
      setError(err.message || t('errLoadKeys'));
    } finally {
      setFetching(false);
    }
  }

  async function handleCreateKey() {
    if (!newKeyData.name.trim()) {
      toast(t('errNameRequired'), 'error');
      return;
    }
    if (newKeyData.scopes.length === 0) {
      toast(t('errScopeRequired'), 'error');
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
      loadKeys();
      toast(t('keyCreatedSuccess'), 'success');
    } catch (err: any) {
      toast(err.message || t('keyCreateFailed'), 'error');
    } finally {
      setLoading(false);
    }
  }



  function handleRotateKey(id: string, name: string) {
    setConfirmAction({
      title: t('rotateKey'),
      message: t('rotateKeyConfirm'),
      onConfirm: async () => {
        setLoading(true);
        try {
          const result = await api.developer.keys.rotate(id);
          setCreatedKey({ name: result.name, key: result.key });
          loadKeys();
          toast(t('keyRotated'), 'success');
        } catch (err: any) {
          toast(err.message || 'Lỗi khi đổi key', 'error');
        } finally {
          setLoading(false);
        }
      },
    });
  }

  function handleDeleteKey(id: string, name: string) {
    setConfirmAction({
      title: t('deleteKeyTitle'),
      message: t('deleteKeyConfirm').replace('{name}', name),
      onConfirm: async () => {
        setLoading(true);
        try {
          await api.developer.keys.delete(id);
          loadKeys();
          toast(t('keyDeletedSuccess'), 'success');
        } catch (err: any) {
          toast(err.message || t('errDeleteKey'), 'error');
        } finally {
          setLoading(false);
        }
      },
    });
  }

  function toggleScope(scopeId: string) {
    setNewKeyData(prev => ({
      ...prev,
      scopes: prev.scopes.includes(scopeId)
        ? prev.scopes.filter(s => s !== scopeId)
        : [...prev.scopes, scopeId],
    }));
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast(t('copiedToClipboard'), 'success');
    } catch {
      toast(t('failedToCopy'), 'error');
    }
  }

  if (fetching) return <TableSkeleton />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{t('apiKeysTitle')}</h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            {t('apiKeysDesc')}
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreateKey(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          {t('createKey')}
        </button>
      </div>

      {keys.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
          {t('noApiKeys')}
        </div>
      ) : (
        <div className="key-list">
          {keys.map(key => (
            <div key={key.id} className="key-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0 }}>
                {/* Row 1: Name, Status, Date */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div className="key-name" style={{ fontSize: '15px', fontWeight: 600 }}>{key.name}</div>
                  <span className={`key-status ${key.isActive ? 'active' : 'revoked'}`} style={{ fontSize: '11.5px', padding: '2px 8px', lineHeight: '14px' }}>
                    {key.isActive ? 'Active' : 'Revoked'}
                  </span>
                  <span className="key-date" style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: 8 }}>
                    {t('keyCreated')} {new Date(key.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                  {key.expiresAt && (
                    <span className="key-date" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      • {t('keyExpires')} {new Date(key.expiresAt).toLocaleDateString('vi-VN')}
                    </span>
                  )}
                  {key.lastUsedAt && (
                    <span className="key-date" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      • {t('keyLastUsed')} {new Date(key.lastUsedAt).toLocaleDateString('vi-VN')}
                    </span>
                  )}
                </div>

                {/* Row 2: Prefix, Copy, Scopes */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <code className="key-prefix" style={{ fontSize: '13px', padding: '2px 6px' }}>{key.prefix}</code>
                    {key.key && (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '3px 6px', height: 'auto', minHeight: 'unset', display: 'inline-flex', alignItems: 'center', color: 'var(--accent)' }}
                        onClick={() => copyToClipboard(key.key!)}
                        title={t('copyKey')}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="key-scopes" style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {key.scopes.map(scopeId => {
                      const scope = getScopeInfo(scopeId);
                      return (
                        <span key={scopeId} className="scope-tag" title={scope.description} style={{ fontSize: '12px', padding: '2px 8px' }}>
                          {scope.label || scopeId}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 16 }}>
                {key.isActive && (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ border: '1px solid rgba(197, 160, 89, 0.3)', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 5, height: '32px', padding: '0 12px', fontSize: '12.5px' }}
                    onClick={() => handleRotateKey(key.id, key.name)}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {t('rotateKey')}
                  </button>
                )}
                <button
                  className="btn btn-danger btn-sm"
                  style={{ height: '32px', padding: '0 12px', fontSize: '12.5px', display: 'inline-flex', alignItems: 'center' }}
                  onClick={() => handleDeleteKey(key.id, key.name)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}>
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {t('deleteKey')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Key Modal */}
      {showCreateKey && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowCreateKey(false)}>
          <div className="create-modal" onClick={e => e.stopPropagation()}>
            <div className="create-modal-header">
              <h3>{t('newApiKeyTitle')}</h3>
              <button className="modal-close" onClick={() => setShowCreateKey(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="create-modal-body">
              <div className="form-group">
                <label className="form-label">{t('apiKeyNameLabel')}</label>
                <input
                  className="input"
                  placeholder="VD: My App Integration"
                  value={newKeyData.name}
                  onChange={e => setNewKeyData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('expirationDateLabel')}</label>
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
                      {t('selectAll')}
                    </button>
                    <button 
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11.5, padding: '2px 8px', height: 'auto', minHeight: 'unset', color: 'var(--text-muted)', fontWeight: 500 }}
                      onClick={() => setNewKeyData(prev => ({ ...prev, scopes: [] }))}
                    >
                      {t('deselectAll')}
                    </button>
                  </div>
                </div>
                <div className="scope-list">
                  {API_KEY_SCOPES.map(scopeId => {
                    const scope = getScopeInfo(scopeId);
                    return (
                      <label key={scopeId} className="scope-option">
                        <input
                          type="checkbox"
                          checked={newKeyData.scopes.includes(scopeId)}
                          onChange={() => toggleScope(scopeId)}
                        />
                        <div>
                          <span className="scope-label">{scope.label || scopeId}</span>
                          <span className="scope-desc">{scope.description || ''}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="create-modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowCreateKey(false)}>{t('cancel')}</button>
              <button className="btn btn-primary" onClick={handleCreateKey} disabled={loading}>
                {loading ? t('creating') : t('createKey')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Created Key Info Modal */}
      {createdKey && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="create-modal" onClick={e => e.stopPropagation()}>
            <div className="create-modal-header">
              <h3 style={{ color: 'var(--success)' }}>{t('apiKeyCreatedModalTitle')}</h3>
            </div>
            <div className="create-modal-body">
              <div style={{ padding: 16, background: 'var(--bg-tertiary)', borderRadius: 0, marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  {t('keyNameLabel')} {createdKey.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  API Key:
                </div>
                <code style={{ fontSize: 13, wordBreak: 'break-all', color: 'var(--accent)' }}>
                  {createdKey.key}
                </code>
              </div>
              <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 0, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {t('securityWarning')}
                </div>
              </div>
            </div>
            <div className="create-modal-footer">
              <button className="btn btn-primary" onClick={() => {
                copyToClipboard(createdKey.key);
                setCreatedKey(null);
              }}>
                {t('copyKey')}
              </button>
              <button className="btn btn-ghost" onClick={() => setCreatedKey(null)}>
                {t('keySavedCloseBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .key-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .key-item {
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          border-radius: 0px;
          padding: 16px;
          transition: all 0.2s ease;
        }
        .key-item:hover {
          border-color: var(--border);
          box-shadow: var(--shadow);
        }
        .key-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .key-name {
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
        .key-prefix {
          font-size: 12px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-light);
          padding: 2px 8px;
          border-radius: 0px;
          color: var(--accent);
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
        .create-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1100;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          padding: 16px;
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
