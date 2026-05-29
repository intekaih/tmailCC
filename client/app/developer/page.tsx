'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, User } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import SettingsPanel from '@/components/SettingsPanel';
import AnimatedBackground from '@/components/AnimatedBackground';
import { AppContext, Toast, AppContextType } from '@/lib/AppContext';
import { Locale, t as translate } from '@/lib/i18n';

export default function DeveloperPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [locale, setLocale] = useState<Locale>('vi');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  const t = useCallback((key: Parameters<typeof translate>[0]) => translate(key, locale), [locale]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(toast => toast.id !== id)), 3000);
  }, []);

  // Sync Preferences on mount
  useEffect(() => {
    setMounted(true);

    const storedDark = localStorage.getItem('tmail_darkMode');
    let isDark = true;
    if (storedDark !== null) {
      isDark = storedDark === 'true';
    } else {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    setDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    const storedLocale = localStorage.getItem('tmail_locale') as Locale | null;
    if (storedLocale === 'en' || storedLocale === 'vi') {
      setLocale(storedLocale);
    }

    const storedSound = localStorage.getItem('tmail_soundEnabled');
    if (storedSound !== null) setSoundEnabled(storedSound === 'true');

    const token = localStorage.getItem('tmail_token');
    if (token) {
      api.auth.me().then(async res => {
        if (res.supabase_access_token) {
          try {
            const supabase = createClient();
            await supabase.auth.setSession({
              access_token: res.supabase_access_token,
              refresh_token: '',
            });
          } catch (err) {
            console.error('[DeveloperPage] Failed to set supabase session:', err);
          }
        }
        setUser(res.user);
      }).catch(() => {
        localStorage.removeItem('tmail_token');
        setUser(null);
      }).finally(() => setLoading(false));
    } else {
      setUser(null);
      setLoading(false);
    }
  }, []);

  const handleToggleLocale = () => {
    const nextLocale = locale === 'vi' ? 'en' : 'vi';
    setLocale(nextLocale);
    localStorage.setItem('tmail_locale', nextLocale);
  };

  const handleToggleDarkMode = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    localStorage.setItem('tmail_darkMode', String(nextDark));
    document.documentElement.setAttribute('data-theme', nextDark ? 'dark' : 'light');
  };

  const ctxValue: AppContextType = {
    user,
    setUser,
    toast: showToast,
    darkMode,
    setDarkMode: (val) => {
      setDarkMode(val);
      localStorage.setItem('tmail_darkMode', String(val));
      document.documentElement.setAttribute('data-theme', val ? 'dark' : 'light');
    },
    soundEnabled,
    setSoundEnabled: (val) => {
      setSoundEnabled(val);
      localStorage.setItem('tmail_soundEnabled', String(val));
    },
    notificationsEnabled,
    setNotificationsEnabled: (val) => {
      setNotificationsEnabled(val);
      localStorage.setItem('tmail_notifEnabled', String(val));
    },
    locale,
    setLocale: (loc) => {
      setLocale(loc);
      localStorage.setItem('tmail_locale', loc);
    },
    t,
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-[var(--text-muted)]">Loading...</div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={ctxValue}>
      <div className="min-h-screen bg-[var(--bg-primary)] p-4 md:p-8 relative">
        <AnimatedBackground variant="gradient" intensity="low" />
        
        {/* Header Bar with Control Buttons */}
        <div className="max-w-6xl mx-auto flex justify-between items-center mb-8 border-b border-[var(--border)] pb-4 z-10 relative">
          <Link href="/" className="flex items-center gap-2 text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors font-bold text-lg decoration-none" style={{ textDecoration: 'none' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span>tmailCC</span>
          </Link>

          <div className="flex items-center gap-3">
            {/* Locale Toggle */}
            <button 
              className="icon-btn lang-btn" 
              onClick={handleToggleLocale} 
              style={{ fontSize: 12, fontWeight: 600, fontFamily: 'inherit', minWidth: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              {locale === 'vi' ? 'EN' : 'VI'}
            </button>

            {/* Dark Mode Toggle */}
            <button 
              className="icon-btn" 
              onClick={handleToggleDarkMode} 
              title={darkMode ? t('lightMode') : t('darkMode')} 
              aria-label={darkMode ? t('lightMode') : t('darkMode')}
              style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              {darkMode ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
                  <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto z-10 relative">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
              Developer API
            </h1>
            <p className="text-[var(--text-secondary)]">
              {locale === 'vi' 
                ? 'Tích hợp tmailCC vào ứng dụng của bạn với Developer API' 
                : 'Integrate tmailCC into your applications using the Developer API'}
            </p>
          </div>

          <div className="developer-panel-wrap bg-[var(--bg-secondary)] border border-[var(--border)]" style={{ borderRadius: '0px' }}>
            <SettingsPanel onClose={() => router.push('/')} defaultTab="stats" />
          </div>
        </div>

        {/* Inline Toast Notifications */}
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type} fade-in`} role="status" aria-live="polite">
            {toast.type === 'success' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            {toast.type === 'error' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>}
            {toast.message}
          </div>
        ))}
      </div>

      <style jsx global>{`
        .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 0px; border: 2px solid var(--border); background: var(--bg-primary); color: var(--text-primary); font-size: 13px; z-index: 9999; box-shadow: var(--shadow); white-space: nowrap; text-align: center; justify-content: center; width: max-content; max-w: 90vw; }
        .toast-success { background: var(--bg-primary); border: 2px solid var(--border); color: var(--text-primary); }
        .toast-error { background: var(--bg-primary); border: 2px solid var(--border); color: var(--text-primary); }
        .toast-info { background: var(--bg-primary); border: 2px solid var(--border); color: var(--text-primary); }
        .lang-btn:hover { color: var(--accent) !important; border-color: var(--accent) !important; }
      `}</style>
    </AppContext.Provider>
  );
}
