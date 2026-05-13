'use client';

import { useState, useRef } from 'react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/AppContext';
import { useFocusTrap } from './useFocusTrap';

interface ChangePasswordModalProps {
  onClose: () => void;
}

export default function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
  const { t, toast } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, true);
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  function setField(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (form.newPassword !== form.confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      await api.auth.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast(t('passwordChanged'), 'success');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-label={t('changePassword')}>
      <div className="modal fade-in" ref={modalRef}>
        <div className="modal-header">
          <h2 className="modal-title">{t('changePassword')}</h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('currentPassword')}</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={form.currentPassword}
              onChange={e => setField('currentPassword', e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('newPassword')}</label>
            <input
              className="input"
              type="password"
              placeholder={t('minChars')}
              value={form.newPassword}
              onChange={e => setField('newPassword', e.target.value)}
              required
              minLength={8}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('confirmNewPassword')}</label>
            <input
              className="input"
              type="password"
              placeholder={t('minChars')}
              value={form.confirmPassword}
              onChange={e => setField('confirmPassword', e.target.value)}
              required
              minLength={8}
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}
          >
            {loading ? <span className="loading-spinner" style={{ width: 16, height: 16 }} /> : null}
            {loading ? t('changingPassword') : t('changePassword')}
          </button>
        </form>
      </div>
    </div>
  );
}
