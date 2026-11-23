'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Logos from '@/components/Logos';

const ITEMS = [
  ['/admin', 'Dashboard Summary SPIP'],
  ['/admin/achievement', 'Achievement SPIP'],
  ['/admin/mapping', 'Mapping Detail Jenis & Lokasi'],
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
        <Logos size="xs" />
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
        <button type="button" className="btn sm logout" onClick={logout}>
          Keluar
        </button>
      </div>
    </header>
  );
}
