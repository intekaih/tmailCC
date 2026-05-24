'use client';

/**
 * AvatarUpload - User avatar display and upload component
 * Uses Supabase Storage bucket 'avatars'
 */
import { useState, useRef } from 'react';
import { useApp } from '@/lib/AppContext';
import { getToken } from '@/lib/api';

interface AvatarUploadProps {
  avatarUrl?: string | null;
  username: string;
  size?: number;
  onAvatarChange?: (newUrl: string | null) => void;
}

export default function AvatarUpload({
  avatarUrl,
  username,
  size = 36,
  onAvatarChange,
}: AvatarUploadProps) {
  const { t, toast } = useApp();
  const [uploading, setUploading] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(avatarUrl || null);
  const [showMenu, setShowMenu] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  const handleOverlayClick = () => setShowMenu(false);

  const initials = username
    .split(/[._-]/)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 2);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      toast('Chỉ chấp nhận ảnh JPG, PNG, WebP, GIF', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast('Ảnh phải nhỏ hơn 2MB', 'error');
      return;
    }

    setUploading(true);
    setShowMenu(false);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const token = getToken();
      const res = await fetch('/api/auth/avatar', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setCurrentUrl(data.avatarUrl);
      onAvatarChange?.(data.avatarUrl);
      toast('Cập nhật ảnh đại diện thành công', 'success');
    } catch (err: any) {
      toast(err.message || 'Không thể tải ảnh lên', 'error');
    } finally {
      setUploading(false);
      // Reset input
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleRemoveAvatar() {
    setUploading(true);
    setShowMenu(false);

    try {
      const token = getToken();
      const res = await fetch('/api/auth/avatar', {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Remove failed');
      }

      setCurrentUrl(null);
      onAvatarChange?.(null);
      toast('Đã xóa ảnh đại diện', 'success');
    } catch (err: any) {
      toast(err.message || 'Không thể xóa ảnh', 'error');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="avatar-upload-wrapper" style={{ position: 'relative' }}>
      <button
        className="avatar-circle"
        onClick={() => setShowMenu(!showMenu)}
        title="Thay đổi ảnh đại diện"
        aria-label="Thay đổi ảnh đại diện"
        disabled={uploading}
        style={{ width: size, height: size }}
      >
        {uploading ? (
          <span className="loading-spinner" style={{ width: size * 0.5, height: size * 0.5 }} />
        ) : currentUrl ? (
          <img
            src={currentUrl}
            alt={username}
            style={{
              width: size,
              height: size,
              borderRadius: '50%',
              objectFit: 'cover',
            }}
            onError={() => setCurrentUrl(null)}
          />
        ) : (
          <span className="avatar-initials">{initials}</span>
        )}

        {/* Camera overlay on hover */}
        <span className="avatar-overlay">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </span>
      </button>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        aria-hidden="true"
      />

      {/* Context menu */}
      {showMenu && (
        <>
          <div className="avatar-menu-overlay" onClick={handleOverlayClick} />
          <div className="avatar-menu" ref={menuRef}>
            <button
              className="avatar-menu-item"
              onClick={() => fileRef.current?.click()}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Tải ảnh lên
            </button>
            {currentUrl && (
              <button
                className="avatar-menu-item avatar-menu-danger"
                onClick={handleRemoveAvatar}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Xóa ảnh
              </button>
            )}
          </div>
        </>
      )}

      <style jsx>{`
        .avatar-circle {
          position: relative;
          border-radius: 50%;
          border: 2px solid var(--border-light);
          background: linear-gradient(135deg, var(--bg-tertiary), var(--bg-hover));
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          transition: all 0.2s ease;
          padding: 0;
          flex-shrink: 0;
        }
        .avatar-circle:hover {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px var(--accent-subtle);
        }
        .avatar-circle:disabled {
          opacity: 0.7;
          cursor: wait;
        }
        .avatar-initials {
          font-size: ${Math.max(size * 0.35, 10)}px;
          font-weight: 700;
          color: var(--accent);
          letter-spacing: 0.5px;
          font-family: var(--font-body), sans-serif;
          line-height: 1;
          user-select: none;
        }
        .avatar-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.5);
          opacity: 0;
          transition: opacity 0.2s ease;
          color: white;
          border-radius: 50%;
        }
        .avatar-circle:hover .avatar-overlay {
          opacity: 1;
        }
        .avatar-menu-overlay {
          position: fixed;
          inset: 0;
          z-index: 999;
        }
        .avatar-menu {
          position: absolute;
          top: calc(100% + 6px);
          left: 50%;
          transform: translateX(-50%);
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          border-radius: 10px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
          min-width: 160px;
          z-index: 1000;
          overflow: hidden;
          animation: fadeIn 0.15s ease-out;
        }
        .avatar-menu-item {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 10px 14px;
          font-size: 13px;
          font-family: var(--font-body), sans-serif;
          color: var(--text-secondary);
          background: none;
          border: none;
          cursor: pointer;
          transition: all 0.15s;
          text-align: left;
        }
        .avatar-menu-item:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .avatar-menu-danger {
          color: var(--error);
        }
        .avatar-menu-danger:hover {
          background: rgba(239, 68, 68, 0.1);
          color: var(--error);
        }
      `}</style>
    </div>
  );
}
