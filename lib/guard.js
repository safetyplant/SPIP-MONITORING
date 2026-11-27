import { cookies } from 'next/headers';
import { EDIT_COOKIE, verifyToken } from './auth';

// Halaman Mapping dan perubahan data aset terkunci. Kunci dibuka dengan kata sandi yang sama dengan kata sandi login,
// berlaku 2 jam di browser yang sama, dan bisa dikunci kembali kapan saja.
export async function isUnlocked() {
  return verifyToken(cookies().get(EDIT_COOKIE)?.value, 'edit');
}

export async function isUnlockedReq(req) {
  return verifyToken(req.cookies.get(EDIT_COOKIE)?.value, 'edit');
}
