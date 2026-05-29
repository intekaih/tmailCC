'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { StatsSkeleton } from '../SkeletonLoader';
import { formatUptime } from './types';

interface AdminStatsTabProps {
  loadingData: boolean;
  t: (key: string) => string;
}

export default function AdminStatsTab({ loadingData, t }: AdminStatsTabProps) {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const data = await api.admin.stats();
      setStats(data);
    } catch (err: any) {
      console.error('Failed to load stats:', err);
    }
  }

  if (loadingData && !stats) return <StatsSkeleton />;

  if (!stats) return null;

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-value">{stats.totalUsers}</div>
        <div className="stat-label">{t('totalUsers')}</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{stats.totalAccounts}</div>
        <div className="stat-label">{t('emailAddresses')}</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{stats.totalEmails}</div>
        <div className="stat-label">{t('totalEmails')}</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{stats.totalDomains}</div>
        <div className="stat-label">{t('activeDomains')}</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{stats.recentEmails}</div>
        <div className="stat-label">{t('emails24h')}</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{formatUptime(stats.uptime)}</div>
        <div className="stat-label">{t('uptime')}</div>
      </div>

      <style jsx>{`
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 16px;
          padding: 4px;
        }
        .stat-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          border-radius: 0px;
          padding: 24px 16px;
          text-align: center;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
          box-shadow: var(--shadow);
        }
        .stat-card:hover {
          border-color: var(--border);
          box-shadow: var(--shadow-lg);
        }
        .stat-value {
          font-size: 32px;
          font-weight: 700;
          color: var(--accent);
          font-family: var(--font-display), Georgia, serif;
        }
        .stat-label {
          font-size: 12.5px;
          color: var(--text-secondary);
          margin-top: 6px;
          font-weight: 500;
          letter-spacing: 0.02em;
        }
      `}</style>
    </div>
  );
}
