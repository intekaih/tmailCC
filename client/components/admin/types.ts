'use client';

// ============================================
// Admin Panel Shared Types
// ============================================

export type Tab = 'stats' | 'users' | 'domains' | 'config' | 'blocklist' | 'otpkeys' | 'dotmails';

export type ConfirmAction = {
  title: string;
  message: string;
  onConfirm: () => Promise<void> | void;
};

export interface AdminTabProps {
  loadingData: boolean;
  loading: boolean;
  setLoading: (v: boolean) => void;
  error: string;
  setError: (v: string) => void;
  toast: (message: string, type?: 'success' | 'error' | 'info') => void;
  t: (key: string) => string;
  setConfirmAction: (action: ConfirmAction | null) => void;
}

export function formatUptime(seconds: number): string {
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
