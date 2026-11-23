import { NextResponse } from 'next/server';
import { COOKIE, checkPassword, createToken } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req) {
  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'ADMIN_PASSWORD belum diatur di environment variable.' }, { status: 500 });
  }
  const body = await req.json().catch(() => ({}));
  if (!(await checkPassword(body.password))) {
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: 'Kata sandi salah.' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: COOKIE,
    value: await createToken(12),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 12 * 3600,
  });
  return res;
}
