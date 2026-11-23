'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Gagal masuk.');
        setBusy(false);
        return;
      }
      const next = params.get('next');
      router.replace(next && next.startsWith('/admin') ? next : '/admin');
      router.refresh();
    } catch {
      setError('Tidak bisa terhubung ke server.');
      setBusy(false);
    }
  }

  return (
    <form className="login-card" onSubmit={submit}>
      <div className="brand-mark" aria-hidden="true">S</div>
      <h1>SPIP Monitor</h1>
      <p className="muted">Masuk untuk membuka dashboard, impor data, dan cetak QR.</p>
      <label className="field">
        <span>Kata sandi admin</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus
        />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="btn primary block" disabled={busy}>
        {busy ? 'Memeriksa…' : 'Masuk'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="login-wrap">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
