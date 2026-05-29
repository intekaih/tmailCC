'use client';

import { useState } from 'react';
import Turnstile from '@/components/Turnstile';

interface CreateAccountFormProps {
  availableDomains: string[];
  selectedDomain: string;
  customLocal: string;
  captchaToken: string;
  captchaConfig: { enabled: boolean; siteKey: string } | null;
  captchaVersion: number;
  darkMode: boolean;
  onDomainChange: (domain: string) => void;
  onLocalChange: (local: string) => void;
  onCaptchaToken: (token: string) => void;
  onCaptchaExpire: () => void;
  onCaptchaError: () => void;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  isGuest: boolean;
  labels: {
    randomAddress: string;
    create: string;
    cancel: string;
    loading: string;
  };
}

export default function CreateAccountForm({
  availableDomains,
  selectedDomain,
  customLocal,
  captchaToken,
  captchaConfig,
  captchaVersion,
  darkMode,
  onDomainChange,
  onLocalChange,
  onCaptchaToken,
  onCaptchaExpire,
  onCaptchaError,
  onSubmit,
  onCancel,
  isLoading,
  isGuest,
  labels,
}: CreateAccountFormProps) {
  const isCaptchaRequired = !!(isGuest && captchaConfig?.enabled && captchaConfig?.siteKey);
  const canSubmit = !!(isLoading || !selectedDomain || (isCaptchaRequired && !captchaToken));

  return (
    <div className="fade-in px-3 pb-3 border-b border-[var(--border)]">
      <div className="mb-2">
        <input
          type="text"
          className="input"
          placeholder={labels.randomAddress}
          value={customLocal}
          onChange={e => onLocalChange(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
          onKeyDown={e => { if (e.key === 'Enter' && !canSubmit) onSubmit(); }}
          autoFocus
        />
      </div>
      <div className="mb-2">
        <select
          className="select w-full"
          value={selectedDomain}
          onChange={e => onDomainChange(e.target.value)}
        >
          {availableDomains.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>
      {customLocal && (
        <div className="text-xs text-[var(--text-muted)] text-center mb-2">
          @{selectedDomain}
        </div>
      )}

      {isCaptchaRequired && (
        <div className="mb-2">
          <Turnstile
            key={captchaVersion}
            siteKey={captchaConfig!.siteKey}
            onVerify={onCaptchaToken}
            onExpire={onCaptchaExpire}
            onError={onCaptchaError}
            theme={darkMode ? 'dark' : 'light'}
          />
        </div>
      )}

      <div className="flex gap-2">
        <button
          className="btn btn-primary flex-1 justify-center"
          onClick={onSubmit}
          disabled={canSubmit}
        >
          {isLoading ? labels.loading : labels.create}
        </button>
        <button
          className="btn btn-ghost flex-1 justify-center"
          onClick={onCancel}
        >
          {labels.cancel}
        </button>
      </div>
    </div>
  );
}
