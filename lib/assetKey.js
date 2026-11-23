import { createHash } from 'node:crypto';

// Kunci unik aset: gabungan Distrik, Kategori, Jenis, Detail Jenis, Lokasi, dan Kode aset (bila diisi).
// Bila kode kosong, kunci sama persis dengan versi lama, sehingga aset lama tidak terduplikasi saat impor ulang.
export function keyOf(r, seq = 1) {
  const parts = [r.distrik, r.kategori, r.jenis, r.detail_jenis, r.lokasi];
  if (r.kode_aset) parts.push(r.kode_aset);
  const base = parts.join('|').toLowerCase();
  const h = createHash('sha1').update(base).digest('hex');
  return seq > 1 ? `${h}#${seq}` : h;
}
