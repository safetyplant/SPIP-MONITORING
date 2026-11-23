// Sesi sederhana: cookie bertanda tangan HMAC. Aman dipakai di middleware (edge) maupun route (node).
// Ada dua cakupan token yang tidak bisa saling menggantikan: 'admin' (masuk aplikasi) dan 'edit' (membuka kunci edit data).
export const COOKIE = 'spip_admin';
export const EDIT_COOKIE = 'spip_edit';

const enc = new TextEncoder();
const secret = () => process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || '';

const hex = (buf) =>
  Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

async function hmac(text) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(text)));
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function createToken(hours = 12, scope = 'admin') {
  const exp = Date.now() + hours * 3600 * 1000;
  return `${exp}.${await hmac(`${scope}.${exp}`)}`;
}

export async function verifyToken(token, scope = 'admin') {
  if (!token || !secret()) return false;
  const [exp, sig] = String(token).split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, await hmac(`${scope}.${exp}`));
}

async function samePassword(input, real) {
  if (!real) return false;
  const a = hex(await crypto.subtle.digest('SHA-256', enc.encode(String(input || ''))));
  const b = hex(await crypto.subtle.digest('SHA-256', enc.encode(real)));
  return safeEqual(a, b);
}

export const checkPassword = (input) => samePassword(input, process.env.ADMIN_PASSWORD);
export const checkEditPassword = (input) => samePassword(input, process.env.EDIT_PASSWORD);
