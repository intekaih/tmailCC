'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/AppContext';
import AvatarUpload from '../AvatarUpload';
import type { AdminTabProps } from './types';

export default function ChangePasswordTab({
  loadingData, loading, setLoading, error, setError, toast, t,
}: Omit<AdminTabProps, 'setConfirmAction'>) {
  const { user, setUser } = useApp();

  const [displayName, setDisplayName] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');

  // Sync display name with user data once loaded
  useEffect(() => {
    if (user) {
      setDisplayName(user.preferences?.displayName || user.username);
    }
  }, [user]);

  function setPasswordField(key: string, value: string) {
    setPasswordForm(prev => ({ ...prev, [key]: value }));
    setPasswordError('');
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileError('');
    if (!displayName.trim()) {
      setProfileError('Tên hiển thị không được bỏ trống');
      return;
    }

    setUpdatingProfile(true);
    try {
      const res = await api.auth.updateProfile({ displayName: displayName.trim() });
      if (user) {
        setUser({
          ...user,
          preferences: {
            ...user.preferences,
            displayName: displayName.trim(),
          } as any
        });
      }
      toast('Cập nhật tên hiển thị thành công', 'success');
    } catch (err: any) {
      setProfileError(err.message || 'Không thể cập nhật tên hiển thị');
    } finally {
      setUpdatingProfile(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError(t('passwordMismatch') || 'Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    try {
      await api.auth.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast(t('passwordChanged') || 'Đổi mật khẩu thành công', 'success');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setPasswordError(err.message || 'Thất bại khi đổi mật khẩu');
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'var(--font-body), sans-serif' }}>
        Vui lòng đăng nhập để thay đổi thông tin cá nhân.
      </div>
    );
  }

  return (
    <div className="profile-tab-container">
      <div className="profile-two-columns">
        {/* Column 1: Personal Info */}
        <div className="profile-column">
          <div className="profile-section-card">
            <div className="section-header">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <h3 className="section-title">{t('changeInfo') || 'Thông tin cá nhân'}</h3>
            </div>
            
            <div className="avatar-upload-section">
              <div className="avatar-container">
                <AvatarUpload
                  avatarUrl={user.avatarUrl}
                  username={user.username}
                  size={72}
                  onAvatarChange={(newUrl) => {
                    setUser({ ...user, avatarUrl: newUrl });
                  }}
                />
              </div>
              <div className="avatar-info">
                <span className="username-label">@{user.username}</span>
                <span className="email-label">{user.email}</span>
                <span className="hint-label">Bấm vào ảnh đại diện để thay đổi</span>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} className="profile-form">
              <div className="form-group">
                <label className="form-label">Tên hiển thị</label>
                <input
                  className="input profile-input"
                  type="text"
                  placeholder="Nhập tên hiển thị"
                  value={displayName}
                  onChange={e => {
                    setDisplayName(e.target.value);
                    setProfileError('');
                  }}
                  required
                />
              </div>
              {profileError && <div className="form-error">{profileError}</div>}
              <button
                type="submit"
                className="btn btn-primary profile-submit-btn"
                disabled={updatingProfile || displayName.trim() === (user.preferences?.displayName || user.username)}
              >
                {updatingProfile ? (
                  <>
                    <svg className="spin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                      <polyline points="17 21 17 13 7 13 7 21"/>
                      <polyline points="7 3 7 8 15 8"/>
                    </svg>
                    Lưu thay đổi
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Column 2: Change Password */}
        <div className="profile-column">
          <div className="profile-section-card">
            <div className="section-header">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <h3 className="section-title">{t('changePassword') || 'Đổi mật khẩu'}</h3>
            </div>
            <form onSubmit={handlePasswordSubmit}>
              <div className="form-group">
                <label className="form-label">{t('currentPassword') || 'Mật khẩu hiện tại'}</label>
                <input
                  className="input profile-input"
                  type="password"
                  placeholder="••••••••"
                  value={passwordForm.currentPassword}
                  onChange={e => setPasswordField('currentPassword', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('newPassword') || 'Mật khẩu mới'}</label>
                <input
                  className="input profile-input"
                  type="password"
                  placeholder={t('minChars') || 'Tối thiểu 8 ký tự'}
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordField('newPassword', e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('confirmNewPassword') || 'Xác nhận mật khẩu mới'}</label>
                <input
                  className="input profile-input"
                  type="password"
                  placeholder={t('minChars') || 'Tối thiểu 8 ký tự'}
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordField('confirmPassword', e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              {passwordError && <div className="form-error">{passwordError}</div>}

              <button
                type="submit"
                className="btn btn-primary profile-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="spin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    {t('changingPassword') || 'Đang đổi...'}
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    {t('changePassword') || 'Đổi mật khẩu'}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      <style jsx>{`
        .profile-tab-container {
          width: 100%;
          padding: 8px 0;
          font-family: var(--font-body), sans-serif;
        }
        .profile-two-columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          align-items: start;
        }
        @media (max-width: 768px) {
          .profile-two-columns {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }
        .profile-column {
          min-width: 0;
        }
        .profile-section-card {
          display: flex;
          flex-direction: column;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 0;
          padding: 24px;
        }
        .section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          color: var(--accent);
        }
        .section-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          font-family: var(--font-display), sans-serif;
        }
        .avatar-upload-section {
          display: flex;
          align-items: center;
          gap: 16px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--border);
          margin-bottom: 20px;
        }
        .avatar-info {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }
        .username-label {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          font-family: var(--font-mono), monospace;
        }
        .email-label {
          font-size: 12px;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .hint-label {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .profile-form {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .form-group {
          margin-bottom: 16px;
        }
        .form-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .profile-input {
          width: 100%;
          border-radius: 0 !important;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .profile-input:focus {
          border-color: var(--accent) !important;
          box-shadow: 0 0 0 3px rgba(var(--accent-rgb, 99, 102, 241), 0.1);
        }
        .profile-submit-btn {
          width: 100%;
          margin-top: 4px;
          justify-content: center;
          border-radius: 0 !important;
          gap: 8px;
          font-weight: 600;
          padding: 10px 16px;
          transition: all 0.2s;
        }
        .profile-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(var(--accent-rgb, 99, 102, 241), 0.3);
        }
        .form-error {
          color: var(--error);
          font-size: 12px;
          margin-bottom: 12px;
          padding: 8px 12px;
          background: rgba(239, 68, 68, 0.08);
          border-radius: 0;
          border: 1px solid rgba(239, 68, 68, 0.15);
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-icon {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
