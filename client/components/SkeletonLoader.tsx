'use client';

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
}

export function Skeleton({ width = '100%', height = '16px', borderRadius = '6px', className = '' }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius }}
    />
  );
}

export function EmailListSkeleton() {
  return (
    <div className="skeleton-list">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="skeleton-email-item">
          <Skeleton width="36px" height="36px" borderRadius="10px" />
          <div className="skeleton-email-content">
            <Skeleton width="40%" height="13px" />
            <Skeleton width="70%" height="13px" />
            <Skeleton width="90%" height="12px" />
          </div>
        </div>
      ))}
      <style jsx>{`
        .skeleton-list { padding: 8px; }
        .skeleton-email-item {
          display: flex;
          gap: 10px;
          padding: 12px;
          margin-bottom: 2px;
        }
        .skeleton-email-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding-top: 4px;
        }
        :global(.skeleton) {
          background: linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-hover) 50%, var(--bg-tertiary) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

export function EmailViewSkeleton() {
  return (
    <div className="skeleton-view">
      <div className="skeleton-header">
        <Skeleton width="60%" height="24px" />
        <div className="skeleton-sender">
          <Skeleton width="44px" height="44px" borderRadius="12px" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton width="30%" height="14px" />
            <Skeleton width="50%" height="12px" />
          </div>
        </div>
      </div>
      <div className="skeleton-body">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} width={i === 4 ? '70%' : '100%'} height="14px" />
        ))}
      </div>
      <style jsx>{`
        .skeleton-view { flex: 1; display: flex; flex-direction: column; }
        .skeleton-header { padding: 20px 24px; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 16px; }
        .skeleton-sender { display: flex; gap: 12px; align-items: center; }
        .skeleton-body { padding: 24px; display: flex; flex-direction: column; gap: 10px; }
        :global(.skeleton) {
          background: linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-hover) 50%, var(--bg-tertiary) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="skeleton-stats-grid">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="skeleton-stat-card">
          <Skeleton width="50px" height="28px" borderRadius="8px" />
          <Skeleton width="90px" height="12px" borderRadius="4px" />
        </div>
      ))}
      <style jsx>{`
        .skeleton-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 16px;
        }
        .skeleton-stat-card {
          background: linear-gradient(135deg, rgba(18, 29, 45, 0.3) 0%, rgba(10, 18, 28, 0.3) 100%);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 24px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        :global(html[data-theme="light"]) .skeleton-stat-card {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.5) 0%, rgba(240, 244, 248, 0.5) 100%);
          border-color: rgba(28, 108, 161, 0.1);
        }
        :global(.skeleton) {
          background: linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-hover) 50%, var(--bg-tertiary) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="skeleton-table-wrapper">
      <div className="skeleton-form-mockup">
        <Skeleton width="180px" height="38px" borderRadius="8px" />
        <Skeleton width="180px" height="38px" borderRadius="8px" />
        <Skeleton width="110px" height="38px" borderRadius="8px" />
      </div>
      <div className="skeleton-table">
        <div className="skeleton-table-header">
          <Skeleton width="20%" height="13px" />
          <Skeleton width="30%" height="13px" />
          <Skeleton width="15%" height="13px" />
          <Skeleton width="15%" height="13px" />
          <Skeleton width="20%" height="13px" />
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton-table-row">
            <Skeleton width="20%" height="12px" />
            <Skeleton width="30%" height="12px" />
            <Skeleton width="15%" height="12px" />
            <Skeleton width="15%" height="12px" />
            <Skeleton width="20%" height="12px" />
          </div>
        ))}
      </div>
      <style jsx>{`
        .skeleton-table-wrapper {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .skeleton-form-mockup {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .skeleton-table {
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.1);
        }
        :global(html[data-theme="light"]) .skeleton-table {
          background: rgba(0, 0, 0, 0.02);
          border-color: rgba(28, 108, 161, 0.1);
        }
        .skeleton-table-header {
          display: flex;
          padding: 14px 16px;
          gap: 16px;
          border-bottom: 2px solid var(--border);
          background: rgba(0, 0, 0, 0.15);
        }
        :global(html[data-theme="light"]) .skeleton-table-header {
          background: rgba(28, 108, 161, 0.03);
          border-bottom-color: rgba(28, 108, 161, 0.12);
        }
        .skeleton-table-row {
          display: flex;
          padding: 14px 16px;
          gap: 16px;
          border-bottom: 1px solid var(--border);
        }
        :global(html[data-theme="light"]) .skeleton-table-row {
          border-bottom-color: rgba(28, 108, 161, 0.05);
        }
        .skeleton-table-row:last-child {
          border-bottom: none;
        }
        :global(.skeleton) {
          background: linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-hover) 50%, var(--bg-tertiary) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

export function ConfigSkeleton() {
  return (
    <div className="skeleton-config">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="skeleton-config-item">
          <Skeleton width="140px" height="13px" />
          <Skeleton width="100%" height="38px" borderRadius="8px" />
        </div>
      ))}
      <Skeleton width="150px" height="38px" borderRadius="8px" />
      <style jsx>{`
        .skeleton-config {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .skeleton-config-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        :global(.skeleton) {
          background: linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-hover) 50%, var(--bg-tertiary) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
