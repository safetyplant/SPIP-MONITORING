import { db } from './db';

// Status inspeksi per bulan untuk sejumlah aset pada satu tahun.
// Hasil: { [asset.id]: [12 angka] } dengan 0 = belum, 1 = sudah inspeksi, 2 = ada temuan.
// Sumber: tabel inspections (checklist lewat link/QR) dan kolom last_inspection (hasil impor atau edit manual).
// `assets` berisi { id, last_inspection ('YYYY-MM-DD' atau null), has_finding }.
export async function monthlyMap(assets, year) {
  const out = {};
  assets.forEach((a) => {
    out[a.id] = Array(12).fill(0);
  });
  if (!assets.length) return out;

  const ids = assets.map((a) => String(a.id));
  const rows = await db().query(
    `SELECT asset_id::text AS id, EXTRACT(MONTH FROM inspected_on)::int AS m, bool_or(result = 'temuan') AS tem
       FROM inspections
      WHERE asset_id = ANY($1::bigint[]) AND kind = 'inspeksi'
        AND inspected_on BETWEEN make_date($2::int, 1, 1) AND make_date($2::int, 12, 31)
      GROUP BY 1, 2`,
    [ids, year]
  );
  rows.forEach((r) => {
    if (out[r.id]) out[r.id][r.m - 1] = r.tem ? 2 : 1;
  });
  // last_inspection dari impor / edit manual: dianggap inspeksi di bulan itu bila belum ada catatan dari checklist.
  assets.forEach((a) => {
    const d = a.last_inspection ? String(a.last_inspection).slice(0, 10) : '';
    if (d && Number(d.slice(0, 4)) === year) {
      const i = Number(d.slice(5, 7)) - 1;
      if (!out[a.id][i]) out[a.id][i] = a.has_finding ? 2 : 1;
    }
  });
  return out;
}
