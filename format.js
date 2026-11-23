export const fmt = (n) => Number(n || 0).toLocaleString('id-ID');
export const pct = (x) => `${((x || 0) * 100).toFixed(1).replace('.', ',')}%`;
export const achClass = (p) => (p >= 1 ? 'ok' : p >= 0.8 ? 'warn' : 'bad');
export const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

export function fmtDate(s) {
  if (!s) return '–';
  const [y, m, d] = String(s).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

// Tanggal hari ini menurut WIB (UTC+7), format YYYY-MM-DD
export function jakartaToday() {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

export function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
