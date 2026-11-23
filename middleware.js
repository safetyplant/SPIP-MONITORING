import { NextResponse } from 'next/server';
import { COOKIE, verifyToken } from './lib/auth';

// Melindungi halaman admin dan API admin. Halaman checklist per aset (/i/...) tetap terbuka lewat link.
export async function middleware(req) {
  const ok = await verifyToken(req.cookies.get(COOKIE)?.value);
  if (ok) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Belum login' }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  url.searchParams.set('next', req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
