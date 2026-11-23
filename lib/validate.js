// Validasi input dari halaman checklist (dipakai API di server).
export const NRP_RE = /^[A-Z0-9]{4,15}$/;

export function cleanNrp(v) {
  return String(v || '').trim().toUpperCase();
}

export function cleanText(v, max) {
  return String(v || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export const SLUG_RE = /^[a-z0-9]{6,24}$/;
