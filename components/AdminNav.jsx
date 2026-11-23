'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const ITEMS = [
  ['/admin', 'Ringkasan'],
  ['/admin/achievement', 'Achievement'],
  ['/admin/mapping', 'Mapping'],
  ['/admin/temuan', 'Temuan'],
  ['/admin/qr', 'QR'],
  ['/admin/checklist', 'Checklist'],
  ['/admin/import', 'Data & Excel'],
];

export default function AdminNav() {
  const path = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <header className="topbar">
      <div className="wrap topbar-in">
        <Link href="/admin" className="brand">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span>SPIP Monitor</span>
        </Link>
        <nav className="nav" aria-label="Menu admin">
          {ITEMS.map(([href, label]) => {
            const on = href === '/admin' ? path === href : path.startsWith(href);
            return (
              <Link key={href} href={href} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined}>
                {label}
              </Link>
            );
          })}
        </nav>
        <button type="button" className="btn sm ghost" onClick={logout}>
          Keluar
        </button>
      </div>
    </header>
  );
}
