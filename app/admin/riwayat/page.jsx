import Link from 'next/link';
import FilterForm from '@/components/FilterForm';
import KatBadge from '@/components/KatBadge';
import { db } from '@/lib/db';
import { filterOptions } from '@/lib/stats';
import { monthlyMap } from '@/lib/history';
import { MONTHS, jakartaToday } from '@/lib/format';
import { qs } from '@/lib/qs';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
export const metadata = { title: 'Riwayat inspeksi' };

const PAGE = 50;
const one = (v) => (Array.isArray(v) ? v[0] : v) || '';

const SYM = { 0: ['–', 'no', 'Belum diinspeksi'], 1: ['✓', 'ok', 'Sudah diinspeksi'], 2: ['!', 'tem', 'Ada temuan'] };

export default async function Page({ searchParams }) {
  const sp = searchParams || {};
  const today = jakartaToday();
  const thisYear = Number(today.slice(0, 4));
  const f = { d: one(sp.d), p: one(sp.p), k: one(sp.k), j: one(sp.j) };
  const q = one(sp.q).trim();
  const yr = parseInt(one(sp.y), 10);
  const year = yr >= 2000 && yr <= thisYear + 1 ? yr : thisYear;
  const page = Math.max(1, parseInt(one(sp.page), 10) || 1);

  const conds = ['a.is_active'];
  const params = [];
  const add = (sql, v) => {
    params.push(v);
    conds.push(sql.replace('?', `$${params.length}`));
  };
  if (f.d) add('a.distrik = ?', f.d);
  if (f.p) add('a.dept = ?', f.p);
  if (f.k) add('a.kategori = ?', f.k);
  if (f.j) add('a.jenis = ?', f.j);
  q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6)
    .forEach((t) => add("lower(a.kode_aset || ' ' || a.jenis || ' ' || a.detail_jenis || ' ' || a.lokasi) LIKE ?", `%${t}%`));
  const where = `WHERE ${conds.join(' AND ')}`;

  const sql = db();
  const [options, totalRows, rows] = await Promise.all([
    filterOptions(),
    sql.query(`SELECT COUNT(*)::int AS n FROM assets a ${where}`, params),
    sql.query(
      `SELECT a.id, a.slug, a.kode_aset, a.kategori, a.jenis, a.detail_jenis, a.lokasi,
              a.last_inspection::text AS last_inspection, a.has_finding
         FROM assets a ${where}
        ORDER BY a.kategori, a.jenis, a.detail_jenis, a.kode_aset, a.lokasi
        LIMIT ${PAGE} OFFSET ${(page - 1) * PAGE}`,
      params
    ),
  ]);
  const total = totalRows[0].n;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const months = await monthlyMap(rows, year);
  const keep = { ...f, q, y: year };
  const curIdx = year === thisYear ? Number(today.slice(5, 7)) - 1 : 11;

  return (
    <>
      <div className="page-h">
        <div className="row spread">
          <div>
            <h1>Riwayat inspeksi per unit</h1>
            <p className="muted">Status inspeksi tiap kode unit / item per bulan. Klik Detail untuk melihat semua inspeksi, pemeriksa, dan hasil per poin.</p>
          </div>
          <a className="btn noprint" href="/api/admin/export?type=inspections">Unduh riwayat (Excel)</a>
        </div>
      </div>

      <FilterForm f={f} options={options} action="/admin/riwayat" period={false}>
        <label className="field">
          <span>Cari</span>
          <input type="search" name="q" defaultValue={q} placeholder="kode unit, jenis, detail, lokasi…" />
        </label>
        <label className="field">
          <span>Tahun</span>
          <select name="y" defaultValue={String(year)}>
            {[thisYear, thisYear - 1, thisYear - 2].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
      </FilterForm>

      <p className="muted small rw-legend">
        <span className="rw-cell ok">✓</span> sudah diinspeksi <span className="rw-cell tem">!</span> ada temuan <span className="rw-cell no">–</span> belum diinspeksi <span className="rw-cell fut">·</span> belum waktunya · {total.toLocaleString('id-ID')} unit
      </p>

      <div className="tscroll">
        <table className="rw-table">
          <thead>
            <tr>
              <th className="l">Kode unit</th>
              <th className="l">Item</th>
              <th className="l">Lokasi</th>
              {MONTHS.map((m) => <th key={m} className="c">{m}</th>)}
              <th>Bulan</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const m = months[r.id];
              const n = m.filter(Boolean).length;
              return (
                <tr key={r.slug}>
                  <td className="l nowrap"><strong>{r.kode_aset || <span className="muted">–</span>}</strong></td>
                  <td className="l"><KatBadge kategori={r.kategori} /> <span className="cellname">{r.detail_jenis || r.jenis}</span></td>
                  <td className="l">{r.lokasi}</td>
                  {m.map((v, i) => {
                    const future = year === thisYear && i > curIdx;
                    const [sym, cls, title] = future && !v ? ['·', 'fut', 'Belum waktunya'] : SYM[v];
                    return <td key={i} className="c"><span className={`rw-cell ${cls}`} title={`${MONTHS[i]} ${year}: ${title}`}>{sym}</span></td>;
                  })}
                  <td>{n}/{year === thisYear ? curIdx + 1 : 12}</td>
                  <td><Link className="btn sm" href={`/admin/riwayat/${r.slug}`}>Detail</Link></td>
                </tr>
              );
            })}
            {!rows.length && <tr><td className="l muted" colSpan={17} style={{ padding: 18 }}>Tidak ada unit yang cocok dengan filter.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="pager">
        {page > 1 ? <Link className="btn" href={`/admin/riwayat${qs({ ...keep, page: page - 1 })}`}>Sebelumnya</Link> : <span />}
        <span className="muted small">Halaman {page} dari {pages}</span>
        {page < pages ? <Link className="btn" href={`/admin/riwayat${qs({ ...keep, page: page + 1 })}`}>Berikutnya</Link> : <span />}
      </div>
    </>
  );
}
