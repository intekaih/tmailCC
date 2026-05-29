'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { ConfigSkeleton } from '../SkeletonLoader';
import type { AdminTabProps } from './types';

export default function AdminConfigTab({
  loadingData, loading, setLoading, error, setError, toast, t,
}: Omit<AdminTabProps, 'setConfirmAction'>) {
  const [configForm, setConfigForm] = useState<any>({});
  const [initialized, setInitialized] = useState(false);

  if (!initialized && !loadingData) {
    setInitialized(true);
    loadConfig();
  }

  async function loadConfig() {
    try {
      const data = await api.admin.config();
      setConfigForm(data);
    } catch (err: any) { setError(err.message); }
  }

  async function handleSaveConfig() {
    setLoading(true);
    try {
      await api.admin.updateConfig(configForm);
      toast(t('configSaved'), 'success');
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  }

  if (loadingData) return <ConfigSkeleton />;

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      <div className="config-form flex-1 w-full max-w-[400px]">
        <div className="form-group">
          <label className="form-label">{t('emailsPerMinute')}</label>
          <input className="input" type="number" value={configForm.rateLimit?.emailsPerMinute ?? 5}
            onChange={e => setConfigForm((prev: any) => ({ ...prev, rateLimit: { ...(prev.rateLimit || {}), emailsPerMinute: Number(e.target.value) } }))} />
        </div>
        <div className="form-group">
          <label className="form-label">{t('emailsPerDay')}</label>
          <input className="input" type="number" value={configForm.rateLimit?.emailsPerDay ?? 50}
            onChange={e => setConfigForm((prev: any) => ({ ...prev, rateLimit: { ...(prev.rateLimit || {}), emailsPerDay: Number(e.target.value) } }))} />
        </div>
        <div className="form-group">
          <label className="form-label">{t('maxMailboxStorage')}</label>
          <input className="input" type="number" value={configForm.maxMailboxStorageMB ?? 50}
            onChange={e => setConfigForm((prev: any) => ({ ...prev, maxMailboxStorageMB: Number(e.target.value) }))} />
        </div>
        <div className="form-group">
          <label className="form-label">{t('maxEmailSize')}</label>
          <input className="input" type="number" value={configForm.maxEmailSizeMB ?? 25}
            onChange={e => setConfigForm((prev: any) => ({ ...prev, maxEmailSizeMB: Number(e.target.value) }))} />
        </div>
        <div className="form-group">
          <label className="checkbox-label">
            <input type="checkbox" checked={configForm.captchaEnabled ?? false}
              onChange={e => setConfigForm((prev: any) => ({ ...prev, captchaEnabled: e.target.checked }))} />
            {t('enableCaptcha')}
          </label>
        </div>
        <div className="form-group">
          <label className="checkbox-label">
            <input type="checkbox" checked={configForm.allowUserOtpKey ?? false}
              onChange={e => setConfigForm((prev: any) => ({ ...prev, allowUserOtpKey: e.target.checked }))} />
            Cho phép User tự tạo OTP Key
          </label>
        </div>
        <button className="btn btn-primary w-full justify-center" onClick={handleSaveConfig} disabled={loading}>{t('saveConfig')}</button>
      </div>

      {/* Config Documentation */}
      <div className="flex-1 w-full bg-[var(--bg-tertiary)] p-5 rounded-2xl border border-[var(--border)] flex flex-col gap-4 text-xs">
        <div className="text-sm font-semibold text-[var(--accent)] flex items-center gap-2 border-b border-[var(--border)] pb-2.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="8" x2="12.01" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          Tài liệu Cấu hình Hệ thống
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <div className="font-bold text-[var(--text-primary)] mb-1">1. Thư mỗi phút &amp; Thư mỗi ngày</div>
            <div className="text-[var(--text-secondary)] leading-relaxed pl-3.5">
              Thiết lập giới hạn số lượng email tối đa một tài khoản được phép nhận trong 1 phút hoặc 24 giờ.
              <div className="text-[var(--text-muted)] mt-0.5">• Mục đích: Ngăn chặn các cuộc tấn công spam làm tràn bộ nhớ máy chủ (DOS/Flood).</div>
            </div>
          </div>
          <div>
            <div className="font-bold text-[var(--text-primary)] mb-1">2. Dung lượng lưu trữ tối đa (MB)</div>
            <div className="text-[var(--text-secondary)] leading-relaxed pl-3.5">
              Tổng dung lượng đĩa tối đa cho phép của mỗi hòm thư tạm thời.
              <div className="text-[var(--text-muted)] mt-0.5">• Mục đích: Giới hạn dung lượng lưu trữ trên VPS đối với mỗi người dùng.</div>
            </div>
          </div>
          <div>
            <div className="font-bold text-[var(--text-primary)] mb-1">3. Kích thước thư tối đa (MB)</div>
            <div className="text-[var(--text-secondary)] leading-relaxed pl-3.5">
              Kích thước tệp tin lớn nhất cho mỗi email đơn lẻ gửi đến (bao gồm cả tệp đính kèm).
              <div className="text-[var(--text-muted)] mt-0.5">• Mục đích: Từ chối các tệp tin cực lớn để bảo vệ băng thông và tài nguyên hệ thống.</div>
            </div>
          </div>
          <div>
            <div className="font-bold text-[var(--text-primary)] mb-1">4. Bảo vệ CAPTCHA</div>
            <div className="text-[var(--text-secondary)] leading-relaxed pl-3.5">
              Yêu cầu người dùng giải mã CAPTCHA trước khi tạo các tài khoản khách (Guest Accounts) mới.
              <div className="text-[var(--text-muted)] mt-0.5">• Mục đích: Ngăn chặn robot, script tự động tạo hàng loạt hòm thư tạm thời để spam.</div>
            </div>
          </div>
          <div>
            <div className="font-bold text-[var(--text-primary)] mb-1">5. OTP Key dành cho User</div>
            <div className="text-[var(--text-secondary)] leading-relaxed pl-3.5">
              Cho phép tài khoản người dùng bình thường tự tạo API Key để tự động hóa việc lấy mã OTP từ các hòm thư bằng code/tool.
              <div className="text-[var(--text-muted)] mt-0.5">• Mục đích: Phục vụ mục đích lập trình, tự động lấy OTP qua API mà không cần dùng giao diện web.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
