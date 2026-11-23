import { createHash } from 'node:crypto';

// Kunci unik aset: gabungan Distrik, Kategori, Jenis, Detail Jenis, dan Lokasi. Dipakai impor Excel dan edit manual.
export function keyOf(r, seq = 1) {
  const base = [r.distrik, r.kategori, r.jenis, r.detail_jenis, r.lokasi].join('|').toLowerCase();
  const h = createHash('sha1').update(base).digest('hex');
  return seq > 1 ? `${h}#${seq}` : h;
}
