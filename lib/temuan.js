import { db } from './db';
import { saranFor } from './saran';

const one = (v) => (Array.isArray(v) ? v[0] : v) || '';

// Memuat temuan (poin berstatus Temuan) pada rentang tanggal, lalu menghitung peringkat berdasarkan jumlah dan keseringan.
// Sumber: tabel inspections (per poin) dan, untuk aset hasil impor Excel tanpa riwayat checklist, kolom has_finding.
export async function loadTemuan({ start, end, k = '', j = '', d = '', st = '', q = '' }) {
  const params = [start, end];
  const cond = [];
  const add = (sql, v) => {
    params.push(v);
    cond.push(sql.replace('?', `$${params.length}`));
  };
  if (k) add('a.kategori = ?', k);
  if (j) add('a.jenis = ?', j);
  if (d) add('a.distrik = ?', d);
  const filt = cond.length ? ` AND ${cond.join(' AND ')}` : '';

  const rows = await db().query(
    `SELECT * FROM (
       SELECT i.inspected_on::text AS tgl, i.inspector_name AS pemeriksa, i.nrp,
              a.slug, a.kode_aset, a.kategori, a.jenis, a.detail_jenis, a.lokasi, a.distrik,
              e->>'q' AS poin, COALESCE(e->>'n', '') AS ket,
              EXISTS (SELECT 1 FROM inspections fu WHERE fu.asset_id = a.id AND fu.kind = 'followup' AND fu.inspected_on >= i.inspected_on) AS selesai
         FROM inspections i
         JOIN assets a ON a.id = i.asset_id
        CROSS JOIN LATERAL jsonb_array_elements(i.items) e
        WHERE i.kind = 'inspeksi' AND e->>'r' = 'tem' AND a.is_active
          AND i.inspected_on BETWEEN $1::date AND $2::date${filt}
       UNION ALL
       SELECT a.last_inspection::text, '–', '–',
              a.slug, a.kode_aset, a.kategori, a.jenis, a.detail_jenis, a.lokasi, a.distrik,
              'Temuan tercatat dari impor / edit manual (rincian poin tidak tersedia)', '',
              NOT (a.has_finding AND NOT a.followed_up)
         FROM assets a
        WHERE a.is_active AND a.has_finding AND a.last_inspection BETWEEN $1::date AND $2::date
          AND NOT EXISTS (SELECT 1 FROM inspections x WHERE x.asset_id = a.id AND x.kind = 'inspeksi' AND x.result = 'temuan'
                             AND x.inspected_on BETWEEN $1::date AND $2::date)${filt}
     ) t
     ORDER BY tgl DESC
     LIMIT 5000`,
    params
  );

  let list = rows.map((r) => ({ ...r, selesai: !!r.selesai }));
  if (st === 'menunggu') list = list.filter((r) => !r.selesai);
  if (st === 'selesai') list = list.filter((r) => r.selesai);
  const needle = String(q || '').trim().toLowerCase();
  if (needle) {
    list = list.filter((r) => `${r.pemeriksa} ${r.nrp} ${r.kode_aset} ${r.jenis} ${r.detail_jenis} ${r.lokasi} ${r.poin} ${r.ket}`.toLowerCase().includes(needle));
  }

  const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const tally = (keyFn, labelFn) => {
    const m = new Map();
    list.forEach((r) => {
      const key = keyFn(r);
      if (!m.has(key)) m.set(key, { key, label: labelFn(r), jumlah: 0, unit: new Set(), terakhir: '', menunggu: 0, sample: r });
      const g = m.get(key);
      g.jumlah += 1;
      g.unit.add(r.slug);
      if (r.tgl > g.terakhir) g.terakhir = r.tgl;
      if (!r.selesai) g.menunggu += 1;
    });
    return Array.from(m.values())
      .map((g) => ({ ...g, unit: g.unit.size }))
      .sort((a, b) => b.jumlah - a.jumlah || b.unit - a.unit || (a.terakhir < b.terakhir ? 1 : -1) || a.label.localeCompare(b.label, 'id'));
  };

  const poinRank = tally((r) => norm(r.poin), (r) => r.poin).map((g, i) => ({
    ...g,
    rank: i + 1,
    saran: saranFor(g.label, '', `${g.sample.jenis} ${g.sample.detail_jenis}`),
  }));
  const rankOf = new Map(poinRank.map((g) => [g.key, g]));
  const jenisRank = tally((r) => `${r.kategori}|${r.jenis}|${r.detail_jenis}`, (r) => `${r.detail_jenis || r.jenis} (${r.kategori})`).map((g, i) => ({ ...g, rank: i + 1 }));
  const unitRank = tally((r) => r.slug, (r) => `${r.kode_aset ? `${r.kode_aset} · ` : ''}${r.detail_jenis || r.jenis}`).slice(0, 15).map((g, i) => ({ ...g, rank: i + 1 }));

  // Daftar rinci: urut dari poin yang paling sering muncul, lalu tanggal terbaru.
  const detail = list
    .map((r) => {
      const g = rankOf.get(norm(r.poin));
      const s = saranFor(r.poin, r.ket, `${r.jenis} ${r.detail_jenis}`);
      return { ...r, rank: g.rank, frek: g.jumlah, saran: s };
    })
    .sort((a, b) => a.rank - b.rank || (a.tgl < b.tgl ? 1 : -1));

  return {
    detail,
    poinRank,
    jenisRank,
    unitRank,
    total: list.length,
    unitCount: new Set(list.map((r) => r.slug)).size,
    menunggu: list.filter((r) => !r.selesai).length,
  };
}

export const temuanParams = (sp = {}) => ({
  k: one(sp.k),
  j: one(sp.j),
  d: one(sp.d),
  st: one(sp.st),
  q: one(sp.q).trim().slice(0, 80),
});
