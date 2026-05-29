'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DocHeaderProps {
  safeFilename: string;
}

export default function DocHeader({ safeFilename }: DocHeaderProps) {
  const [locale, setLocale] = useState<'vi' | 'en'>('vi');

  useEffect(() => {
    const stored = localStorage.getItem('tmail_locale');
    if (stored === 'en' || stored === 'vi') {
      setLocale(stored as 'vi' | 'en');
    }
  }, []);

  const backText = locale === 'vi' ? '← Quay Lại Trang Chủ' : '← Back to Homepage';
  const labelText = locale === 'vi' ? 'Tài Liệu Hệ Thống' : 'System Documentation';

  return (
    <div className="mb-8 border-b-4 border-black pb-4 flex items-center justify-between">
      <Link href="/" className="jp-btn hover:underline text-xs flex items-center gap-2" style={{ textDecoration: 'none', color: 'black', fontWeight: 'bold' }}>
        {backText}
      </Link>
      <span className="font-mono text-xs uppercase text-neutral-500 tracking-wider">
        {labelText}: {safeFilename}
      </span>
    </div>
  );
}
