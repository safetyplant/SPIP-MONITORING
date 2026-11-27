import { NextResponse } from 'next/server';
import { EDIT_COOKIE, checkPassword, createToken } from '@/lib/auth';

export const runtime = 'nodejs';

const HOURS = 2;

// Buka kunci Mapping: kata sandi yang dipakai SAMA dengan kata sandi login.
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (body.lock) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set({ name: EDIT_COOKIE, value: '', path: '/', maxAge: 0 });
    return res;
  }
  if (!(await checkPassword(body.password))) {
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: 'Kata sandi salah.' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: EDIT_COOKIE,
    value: await createToken(HOURS, 'edit'),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: HOURS * 3600,
  });
  return res;
}
