'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { StatsSkeleton } from '../SkeletonLoader';
import type { AdminTabProps } from './types';

interface UsageStats {
  apiKeys: { total: number; active: number };
  webhooks: { total: number; active: number };
  apiCalls: { today: number; thisMonth: number };
  webhookDeliveries: { today: number; thisMonth: number };
  accounts: { total: number };
  emails: { total: number; today: number };
}

export default function DeveloperUsageTab({
  loadingData, loading, setLoading, error, setError, toast, t,
}: Omit<AdminTabProps, 'setConfirmAction'>) {
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    loadUsage();
  }, []);

  async function loadUsage() {
    setFetching(true);
    setError('');
    try {
      const data = await api.developer.usage();
      setUsage(data);
    } catch (err: any) {
      setError(err.message || t('failedToLoadStats') || 'Lỗi khi tải thông tin sử dụng API');
    } finally {
      setFetching(false);
    }
  }

  if (fetching) return <StatsSkeleton />;

  if (!usage) return null;

  return (
    <div>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
        {t('apiUsageStats') || 'Thống kê sử dụng API'}
      </h3>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{usage.accounts?.total ?? 0}</div>
          <div className="stat-label">{t('mailboxesInUse') || 'Hộp thư đang dùng'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{usage.emails?.total ?? 0}</div>
          <div className="stat-label">{t('totalEmailsReceived') || 'Tổng thư đã nhận'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{usage.emails?.today ?? 0}</div>
          <div className="stat-label">{t('emailsReceivedToday') || 'Thư nhận hôm nay'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{usage.apiKeys?.active ?? 0}</div>
          <div className="stat-label">{t('activeApiKeys') || 'API Keys Hoạt động'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{usage.webhooks?.active ?? 0}</div>
          <div className="stat-label">{t('activeWebhooks') || 'Webhooks Hoạt động'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{usage.apiCalls?.today ?? 0}</div>
          <div className="stat-label">{t('apiCallsToday') || 'API Calls Hôm nay'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{usage.apiCalls?.thisMonth ?? 0}</div>
          <div className="stat-label">{t('apiCallsThisMonth') || 'API Calls Tháng này'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{usage.webhookDeliveries?.today ?? 0}</div>
          <div className="stat-label">{t('webhooksSentToday') || 'Webhooks Gửi hôm nay'}</div>
        </div>
      </div>

      <style jsx>{`
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 16px;
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
