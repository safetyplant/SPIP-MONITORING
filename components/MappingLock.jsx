'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Layar kunci Mapping. Kata sandi = kata sandi login aplikasi.
export function LockScreen() {
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function open(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/admin/unlock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setErr(data.error || 'Gagal membuka kunci.');
      else router.refresh();
    } catch {
      setErr('Tidak bisa terhubung. Coba lagi.');
    }
    setBusy(false);
  }

  return (
    <div className="lock-screen">
      <form className="card lock-card" onSubmit={open}>
        <div className="lock-ic" aria-hidden="true">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
        </div>
        <h1>Mapping Detail Jenis &amp; Lokasi terkunci</h1>
        <p className="muted">Masukkan kata sandi yang sama dengan kata sandi login untuk membuka data aset.</p>
        <label className="field">
          <span>Kata sandi</span>
          <input type="password" autoFocus autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        </label>
        {err && <p className="ck-err" role="alert">{err}</p>}
        <button className="btn primary" disabled={busy || !pw}>{busy ? 'Memeriksa…' : 'Buka kunci'}</button>
      </form>
    </div>
  );
}

export function RelockButton() {
  const router = useRouter();
  async function lock() {
    await fetch('/api/admin/unlock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lock: true }) });
    router.refresh();
  }
  return <button type="button" className="btn sm" onClick={lock}>🔒 Kunci kembali</button>;
}
