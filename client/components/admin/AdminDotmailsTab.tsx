'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { TableSkeleton } from '../SkeletonLoader';
import type { AdminTabProps } from './types';

export default function AdminDotmailsTab({
  loadingData, loading, setLoading, error, setError, toast, t, setConfirmAction,
}: AdminTabProps) {
  const [dotmailParents, setDotmailParents] = useState<any[]>([]);
  const [newGmailAddress, setNewGmailAddress] = useState('');
  const [newGmailAppPassword, setNewGmailAppPassword] = useState('');
  const [expandedParent, setExpandedParent] = useState<string | null>(null);
  const [dotmailGenerating, setDotmailGenerating] = useState(false);
  const [checkingParentId, setCheckingParentId] = useState<string | null>(null);
  const [editingParentId, setEditingParentId] = useState<string | null>(null);
  const [editingAppPassword, setEditingAppPassword] = useState('');
  const [showGmailHelp, setShowGmailHelp] = useState(false);
  const [initialized, setInitialized] = useState(false);

  if (!initialized && !loadingData) {
    setInitialized(true);
    loadDotmails();
  }

  async function loadDotmails() {
    try {
      const data = await api.admin.dotmails();
      setDotmailParents(data.parents || []);
    } catch (err: any) { setError(err.message); }
  }

  async function handleAddGmailParent() {
    if (!newGmailAddress.trim() || !newGmailAppPassword.trim()) return;
    setLoading(true);
    try {
      await api.admin.addGmailParent({ address: newGmailAddress.trim(), app_password: newGmailAppPassword.trim() });
      setNewGmailAddress(''); setNewGmailAppPassword('');
      toast('Đã thêm Gmail', 'success');
      await loadDotmails();
    } catch (err: any) { toast(err.message, 'error'); }
    setLoading(false);
  }

  function handleDeleteGmailParent(id: string, address: string) {
    setConfirmAction({
      title: 'Xóa Gmail',
      message: `Xóa ${address} và tất cả dotmail liên quan?`,
      onConfirm: async () => {
        await api.admin.deleteGmailParent(id);
        toast('Đã xóa', 'success');
        await loadDotmails();
      },
    });
  }

  async function handleGenerateDotmails(parentId: string) {
    setDotmailGenerating(true);
    try {
      const data = await api.admin.generateDotmails(parentId);
      toast(`Đã tạo ${data.total} dotmail`, 'success');
      await loadDotmails();
    } catch (err: any) { toast(err.message, 'error'); }
    setDotmailGenerating(false);
  }

  function handleDeleteDotmail(id: string, address: string) {
    setConfirmAction({
      title: 'Xóa Dotmail',
      message: `Xóa ${address}?`,
      onConfirm: async () => {
        await api.admin.deleteDotmail(id);
        toast('Đã xóa', 'success');
        await loadDotmails();
      },
    });
  }

  async function handleCheckGmailParent(id: string) {
    setCheckingParentId(id);
    try {
      const res = await api.admin.checkGmailParent(id);
      if (res.success) { toast('Tài khoản hoạt động tốt! Kết nối IMAP thành công.', 'success'); }
      else { toast(`Lỗi kết nối: ${res.error}`, 'error'); }
    } catch (err: any) { toast(`Lỗi kiểm tra: ${err.message}`, 'error'); }
    finally { setCheckingParentId(null); }
  }

  async function handleUpdateParent(id: string) {
    if (!editingAppPassword.trim()) return;
    setLoading(true);
    try {
      await api.admin.updateGmailParent(id, editingAppPassword.trim());
      toast('Đã cập nhật mật khẩu ứng dụng thành công', 'success');
      setEditingParentId(null); setEditingAppPassword('');
      await loadDotmails();
    } catch (err: any) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  }

  if (loadingData) return <TableSkeleton />;

  return (
    <div>
      <div className="add-domain-form">
        <input className="input" placeholder="Gmail gốc (vd: 00yt0001@gmail.com)" value={newGmailAddress} onChange={e => setNewGmailAddress(e.target.value)} />
        <input className="input" type="password" placeholder="App Password (16 ký tự)" value={newGmailAppPassword} onChange={e => setNewGmailAppPassword(e.target.value)} />
        <button className="btn btn-primary btn-sm" onClick={handleAddGmailParent} disabled={loading || !newGmailAddress.trim() || !newGmailAppPassword.trim()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          Thêm Gmail
        </button>
        <button className="btn btn-ghost btn-sm" style={{ padding: '0 8px', height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowGmailHelp(true)} title="Hướng dẫn cấu hình Gmail">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
        </button>
      </div>

      {dotmailParents.length === 0 && (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 13 }}>Chưa có Gmail nào. Thêm Gmail gốc và App Password để bắt đầu.</div>
      )}

      {dotmailParents.map((parent: any) => {
        const isExpanded = expandedParent === parent.id;
        const dotmails = parent.dotmails || [];
        return (
          <div key={parent.id} style={{ marginBottom: 12, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: 'var(--bg-tertiary)' }} onClick={() => setExpandedParent(isExpanded ? null : parent.id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2"/><polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2"/></svg>
                <span style={{ fontWeight: 600, fontSize: 13.5 }}>{parent.address}</span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{dotmails.length} dotmail</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* Check button */}
                <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); handleCheckGmailParent(parent.id); }} disabled={checkingParentId !== null} title="Kiểm tra kết nối">
                  {checkingParentId === parent.id ? (
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" strokeDasharray="32" /><path d="M12 2a10 10 0 0 1 10 10" /></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  )}
                </button>
                {/* Edit button */}
                <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setEditingParentId(editingParentId === parent.id ? null : parent.id); setEditingAppPassword(''); }} title="Sửa mật khẩu ứng dụng">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                </button>
                {/* Generate button */}
                <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); handleGenerateDotmails(parent.id); }} disabled={dotmailGenerating} title="Sinh dotmail">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </button>
                {/* Delete button */}
                <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); handleDeleteGmailParent(parent.id, parent.address); }} title="Xóa">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </button>
                {/* Chevron */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s' }}><polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </div>

            {/* Edit password inline */}
            {editingParentId === parent.id && (
              <div style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
                <input className="input" style={{ flex: 1, fontSize: 12.5, height: 32, padding: '4px 10px' }} placeholder="Nhập Mật khẩu ứng dụng mới (16 ký tự)" type="password" value={editingAppPassword} onChange={e => setEditingAppPassword(e.target.value)} />
                <button className="btn btn-primary btn-sm" style={{ height: 32, padding: '0 12px', fontSize: 12 }} onClick={() => handleUpdateParent(parent.id)} disabled={loading || !editingAppPassword.trim()}>Lưu</button>
                <button className="btn btn-ghost btn-sm" style={{ height: 32, padding: '0 12px', fontSize: 12 }} onClick={() => setEditingParentId(null)}>Hủy</button>
              </div>
            )}

            {/* Dotmail list */}
            {isExpanded && dotmails.length > 0 && (
              <div style={{ maxHeight: 300, overflowY: 'auto', padding: '8px 14px' }}>
                {dotmails.map((d: any) => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12.5, color: 'var(--text-primary)' }}>{d.address}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" style={{ padding: '3px 6px' }} onClick={() => { navigator.clipboard.writeText(d.address); toast('Đã copy', 'success'); }} title="Copy">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2"/></svg>
                      </button>
                      <button className="btn btn-danger btn-sm" style={{ padding: '3px 6px' }} onClick={() => handleDeleteDotmail(d.id, d.address)} title="Xóa">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isExpanded && dotmails.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>Chưa có dotmail. Nhấn nút sinh dotmail ở trên.</div>
            )}
          </div>
        );
      })}

      {/* Gmail Help Modal */}
      {showGmailHelp && (
        <div className="modal-overlay" style={{ zIndex: 1010 }} onClick={() => setShowGmailHelp(false)}>
          <div className="card" style={{ width: '100%', maxWidth: 450, padding: 24, background: 'var(--bg-primary)', borderRadius: 12, border: '1px solid var(--border)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Hướng dẫn cấu hình Gmail</h3>
              <button className="btn btn-ghost btn-sm" style={{ padding: 4 }} onClick={() => setShowGmailHelp(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p>Để hệ thống tmailCC có thể kết nối và tự động lấy mã OTP từ tài khoản Gmail gốc của bạn, vui lòng cấu hình theo các bước sau:</p>
              <GmailHelpStep num="1" title="Bật xác minh 2 lớp (2-Step Verification)" desc="Truy cập vào trang cấu hình bảo mật tài khoản Google của bạn và kích hoạt xác minh 2 lớp:" link="https://myaccount.google.com/signinoptions/two-step-verification" linkText="Kích hoạt xác minh 2 lớp" />
              <GmailHelpStep num="2" title="Tạo Mật khẩu ứng dụng (App Password)" desc="Sau khi đã bật xác minh 2 lớp, truy cập liên kết dưới đây để tạo Mật khẩu ứng dụng mới cho Mail/IMAP:" link="https://myaccount.google.com/apppasswords" linkText="Tạo Mật khẩu ứng dụng Google" />
              <GmailHelpStep num="3" title="Nhập thông tin và Thêm Gmail" desc={<>Nhập địa chỉ Gmail gốc (ví dụ: <code>00yt0001@gmail.com</code>) và mật khẩu ứng dụng vừa tạo (16 ký tự viết liền, không dấu cách) vào ô nhập liệu bên ngoài rồi nhấn <strong>Thêm Gmail</strong>.</>} />
            </div>
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary btn-sm" onClick={() => setShowGmailHelp(false)}>Đã hiểu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GmailHelpStep({ num, title, desc, link, linkText }: { num: string; title: string; desc: React.ReactNode; link?: string; linkText?: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '50%', width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 'bold', flexShrink: 0 }}>{num}</span>
      <div>
        <strong>{title}</strong><br />
        {desc}
        {link && <><br />👉 <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>{linkText}</a></>}
      </div>
    </div>
  );
}
