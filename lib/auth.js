// Sesi admin sederhana: cookie bertanda tangan HMAC. Aman dipakai di middleware (edge) maupun route (node).
export const COOKIE = 'spip_admin';

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

export async function createToken(hours = 12) {
  const exp = Date.now() + hours * 3600 * 1000;
  return `${exp}.${await hmac(String(exp))}`;
}

export async function verifyToken(token) {
  if (!token || !secret()) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, await hmac(exp));
}

export async function checkPassword(input) {
  const real = process.env.ADMIN_PASSWORD;
  if (!real) return false;
  const a = hex(await crypto.subtle.digest('SHA-256', enc.encode(String(input || ''))));
  const b = hex(await crypto.subtle.digest('SHA-256', enc.encode(real)));
  return safeEqual(a, b);
}
