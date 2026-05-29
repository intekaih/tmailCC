'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { TableSkeleton } from '../SkeletonLoader';
import type { AdminTabProps } from './types';

export default function AdminBlocklistTab({
  loadingData, loading, setLoading, error, setError, toast, t,
}: Omit<AdminTabProps, 'setConfirmAction'>) {
  const [blocklist, setBlocklist] = useState<any[]>([]);
  const [blockIP, setBlockIP] = useState({ ip: '', reason: '', expiresInHours: '' });
  const [initialized, setInitialized] = useState(false);

  if (!initialized && !loadingData) {
    setInitialized(true);
    loadBlocklist();
  }

  async function loadBlocklist() {
    try {
      const data = await api.admin.blocklist();
      setBlocklist(data.entries);
    } catch (err: any) { setError(err.message); }
  }

  async function handleBlockIP() {
    if (!blockIP.ip) return;
    setLoading(true);
    try {
      await api.admin.blockIP({
        ip: blockIP.ip,
        reason: blockIP.reason,
        expiresInHours: blockIP.expiresInHours ? Number(blockIP.expiresInHours) : undefined,
      });
      setBlockIP({ ip: '', reason: '', expiresInHours: '' });
      loadBlocklist();
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  }

  async function handleUnblockIP(ip: string) {
    try {
      await api.admin.unblockIP(ip);
      loadBlocklist();
    } catch (err: any) { setError(err.message); }
  }

  if (loadingData) return <TableSkeleton />;

  return (
    <div>
      <div className="add-domain-form">
        <input className="input" placeholder={t('ipAddress')} value={blockIP.ip}
          onChange={e => setBlockIP(prev => ({ ...prev, ip: e.target.value }))} />
        <input className="input" placeholder={t('reasonOptional')} value={blockIP.reason}
          onChange={e => setBlockIP(prev => ({ ...prev, reason: e.target.value }))} />
        <button className="btn btn-danger btn-sm" onClick={handleBlockIP} disabled={loading}>{t('blockIP')}</button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('ipAddress')}</th>
              <th>{t('reason')}</th>
              <th>{t('blockedAt')}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {blocklist.map((entry, idx) => (
              <tr key={entry.ip || idx}>
                <td><code>{entry.ip}</code></td>
                <td>{entry.reason || '-'}</td>
                <td>{new Date(entry.blockedAt).toLocaleString()}</td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleUnblockIP(entry.ip)}>{t('unblock')}</button>
                </td>
              </tr>
            ))}
            {blocklist.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{t('noBlockedIPs')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
