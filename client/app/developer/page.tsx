'use client';

import { useState } from 'react';
import DeveloperSettings from '@/components/DeveloperSettings';

export default function DeveloperPage() {
  const [showSettings, setShowSettings] = useState(true);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
            Developer API
          </h1>
          <p className="text-[var(--text-secondary)]">
            Tích hợp tmailCC vào ứng dụng của bạn với Developer API
          </p>
        </div>

        {showSettings && <DeveloperSettings onClose={() => setShowSettings(false)} />}
      </div>
    </div>
  );
}
