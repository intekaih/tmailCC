'use client';

import { useState, useRef } from 'react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/AppContext';
import { useFocusTrap } from './useFocusTrap';

interface AuthModalProps {
  onLogin: (user: any) => void;
  onClose: () => void;
}

export default function AuthModal({ onLogin, onClose }: AuthModalProps) {
  const { t } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, true);

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  function setField(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'login') {
        const res = await api.auth.login({ username: form.username, password: form.password });
        onLogin(res.user);
      } else {
        // Register mode
        if (form.password !== form.confirmPassword) {
          setError(t('passwordMismatch') || 'Passwords do not match');
          setLoading(false);
          return;
        }
        if (form.password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }

        // Call register API
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: form.username,
            email: form.email,
            password: form.password,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Registration failed');
        }

        // Auto-login after successful registration
        const loginRes = await api.auth.login({ username: form.username, password: form.password });
        onLogin(loginRes.user);
        setMode('login');
      }
    } catch (err: any) {
      setError(err.message || t('authenticationFailed'));
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setMode(prev => prev === 'login' ? 'register' : 'login');
    setError('');
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-label={mode === 'login' ? t('signIn') : t('signUp')}>
      <div className="modal fade-in" ref={modalRef}>
        <div className="modal-header">
          <h2 className="modal-title">{mode === 'login' ? t('signIn') : t('signUp')}</h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('username')}</label>
            <input
              className="input"
              type="text"
              placeholder="yourname"
              value={form.username}
              onChange={e => setField('username', e.target.value)}
              required
              minLength={3}
              autoComplete="username"
              autoFocus
            />
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">{t('email') || 'Email'}</label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setField('email', e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">{t('password')}</label>
            <input
              className="input"
              type="password"
              placeholder={t('password')}
              value={form.password}
              onChange={e => setField('password', e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">{t('confirmPassword') || 'Confirm Password'}</label>
              <input
                className="input"
                type="password"
                placeholder={t('confirmPassword') || 'Confirm Password'}
                value={form.confirmPassword}
                onChange={e => setField('confirmPassword', e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
          )}

          {error && <div className="form-error">{error}</div>}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}
          >
            {loading ? <span className="loading-spinner" style={{ width: 16, height: 16 }} /> : null}
            {mode === 'login' ? t('signIn') : t('signUp')}
          </button>

          <div className="auth-footer">
            <button type="button" className="auth-switch-btn" onClick={switchMode}>
              {mode === 'login'
                ? (t('noAccount') || "Don't have an account? Sign up")
                : (t('haveAccount') || 'Already have an account? Sign in')}
            </button>
          </div>
        </form>

        <style jsx>{`
          .auth-footer {
            margin-top: 16px;
            text-align: center;
            font-size: 13px;
            color: var(--text-muted);
          }
          .auth-switch-btn {
            background: none;
            border: none;
            color: var(--accent);
            cursor: pointer;
            font-size: 13px;
            padding: 0;
            text-decoration: underline;
          }
          .auth-switch-btn:hover {
            color: var(--text-primary);
          }
        `}</style>
      </div>
    </div>
  );
}
