import { db } from './db';
import { isDate, jakartaToday } from './format';
import { KATEGORI_ORDER } from './spip';

const one = (v) => (Array.isArray(v) ? v[0] : v) || '';

// Filter dashboard dari query string. Bila tidak ada filter tanggal, periode otomatis year to date: 1 Januari tahun ini sampai hari ini (WIB).
export function parseFilters(sp = {}) {
  const today = jakartaToday();
  const start = one(sp.start);
  const end = one(sp.end);
  return {
    d: one(sp.d),
    p: one(sp.p),
    k: one(sp.k),
    j: one(sp.j),
    de: one(sp.de),
    pr: one(sp.pr),
    l: one(sp.l).trim().slice(0, 80),
    start: isDate(start) ? start : `${today.slice(0, 4)}-01-01`,
    end: isDate(end) ? end : today,
  };
}

const COL = {
  distrik: 'a.distrik',
  dept: 'a.dept',
  kategori: 'a.kategori',
  jenis: 'a.jenis',
  detail: 'a.detail_jenis',
};

function whereOf(f) {
  const params = [f.start, f.end];
  const c = [
    'a.is_active',
    'a.is_plan',
    '(a.start_date IS NULL OR a.start_date <= $2::date)',
    '(a.end_date IS NULL OR a.end_date >= $1::date)',
  ];
  const add = (col, v) => {
    if (v) {
      params.push(v);
      c.push(`${col} = $${params.length}`);
    }
  };
  add('a.distrik', f.d);
  add('a.dept', f.p);
  add('a.kategori', f.k);
  add('a.jenis', f.j);
  add('a.detail_jenis', f.de);
  add('a.periode', f.pr);
  if (f.l) {
    params.push(`%${f.l.toLowerCase().replace(/[\\%_]/g, '')}%`);
    c.push(`lower(a.lokasi) LIKE $${params.length}`);
  }
  return { sql: c.join(' AND '), params };
}

export function finish(o) {
  o.belum = o.plan - o.sudah;
  o.tanpa = o.sudah - o.tem;
  o.bfu = o.tem - o.fu;
  o.ach = o.plan ? o.sudah / o.plan : 0;
  return o;
}

export function sumRows(rows) {
  const t = { plan: 0, sudah: 0, tem: 0, fu: 0 };
  rows.forEach((r) => {
    t.plan += r.plan;
    t.sudah += r.sudah;
    t.tem += r.tem;
    t.fu += r.fu;
  });
  return finish(t);
}

// Statistik plan vs inspeksi, dikelompokkan menurut kolom (kategori, jenis, distrik, dept, detail).
// Hasil: array objek { <kolom>..., plan, sudah, tem, fu, belum, tanpa, bfu, ach }.
export async function statsBy(f, cols) {
  const sel = cols.map((c) => COL[c]);
  if (sel.some((x) => !x)) throw new Error('Kolom statistik tidak valid');
  const { sql, params } = whereOf(f);
  // Aset dihitung "sudah inspeksi" bila ada inspeksi pada periode, baik dari kolom last_inspection (hasil impor / edit manual)
  // maupun dari riwayat di tabel inspections. Dengan begitu bulan-bulan lama tetap benar walau aset sudah diinspeksi lagi bulan berikutnya.
  const lastIn = 'a.last_inspection BETWEEN $1::date AND $2::date';
  const q = `WITH base AS (
      SELECT ${sel.map((s, i) => `${s} AS c${i}`).concat('').join(', ')}
             (${lastIn} OR li.d IS NOT NULL) AS done,
             CASE WHEN ${lastIn} THEN a.has_finding ELSE COALESCE(li.result = 'temuan', false) END AS finding,
             CASE WHEN ${lastIn} THEN a.followed_up
                  ELSE COALESCE(li.result = 'temuan', false) AND EXISTS (
                         SELECT 1 FROM inspections fu
                          WHERE fu.asset_id = a.id AND fu.kind = 'followup' AND fu.inspected_on >= li.d) END AS fupd
        FROM assets a
        LEFT JOIN LATERAL (
          SELECT i.inspected_on AS d, i.result
            FROM inspections i
           WHERE i.asset_id = a.id AND i.kind = 'inspeksi' AND i.inspected_on BETWEEN $1::date AND $2::date
           ORDER BY i.inspected_on DESC, i.id DESC LIMIT 1
        ) li ON true
       WHERE ${sql})
    SELECT ${sel.map((_, i) => `c${i}`).concat('').join(', ')}
      COUNT(*)::int AS plan,
      COUNT(*) FILTER (WHERE done)::int AS sudah,
      COUNT(*) FILTER (WHERE done AND finding)::int AS tem,
      COUNT(*) FILTER (WHERE done AND finding AND fupd)::int AS fu
      FROM base
      ${sel.length ? `GROUP BY ${sel.map((_, i) => `c${i}`).join(', ')} ORDER BY ${sel.map((_, i) => `c${i}`).join(', ')}` : ''}`;
  const rows = await db().query(q, params);
  return rows.map((r) => {
    const o = { plan: r.plan, sudah: r.sudah, tem: r.tem, fu: r.fu };
    cols.forEach((c, i) => {
      o[c] = r[`c${i}`];
    });
    return finish(o);
  });
}

export function byKategoriOrder(a, b) {
  const ia = KATEGORI_ORDER.indexOf(a);
  const ib = KATEGORI_ORDER.indexOf(b);
  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
}

export async function filterOptions() {
  const sql = db();
  const [d, p, k, j, de, pr] = await Promise.all([
    sql`SELECT DISTINCT distrik AS v FROM assets WHERE distrik <> '' ORDER BY 1`,
    sql`SELECT DISTINCT dept AS v FROM assets WHERE dept <> '' ORDER BY 1`,
    sql`SELECT DISTINCT kategori AS v FROM assets WHERE kategori <> '' ORDER BY 1`,
    sql`SELECT DISTINCT jenis AS v FROM assets WHERE jenis <> '' ORDER BY 1`,
    sql`SELECT DISTINCT detail_jenis AS v FROM assets WHERE detail_jenis <> '' ORDER BY 1`,
    sql`SELECT DISTINCT periode AS v FROM assets WHERE periode <> '' ORDER BY 1`,
  ]);
  const vals = (rows) => rows.map((r) => r.v);
  return { d: vals(d), p: vals(p), k: vals(k).sort(byKategoriOrder), j: vals(j), de: vals(de), pr: vals(pr) };
}
