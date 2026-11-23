import Link from 'next/link';
import { cookies } from 'next/headers';
import { EditBar, RowEdit } from '@/components/AssetEditor';
import { EDIT_COOKIE, verifyToken } from '@/lib/auth';
import FilterForm from '@/components/FilterForm';
import KatBadge from '@/components/KatBadge';
import CopyButton from '@/components/CopyButton';
import { db } from '@/lib/db';
import { filterOptions } from '@/lib/stats';
import { fmtDate } from '@/lib/format';
import { baseUrl } from '@/lib/url';
import { qs } from '@/lib/qs';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mapping' };

const PAGE = 50;
const one = (v) => (Array.isArray(v) ? v[0] : v) || '';

function Status({ r }) {
  if (!r.last_inspection) return <span className="pill bad">Belum</span>;
  if (r.has_finding && !r.followed_up) return <span className="pill warn">Temuan</span>;
  return <span className="pill ok">Sudah</span>;
}

export default async function Page({ searchParams }) {
  const sp = searchParams || {};
  const f = { d: one(sp.d), p: one(sp.p), k: one(sp.k), j: one(sp.j) };
  const q = one(sp.q).trim();
  const act = sp.act === undefined ? '1' : one(sp.act);
  const plan = sp.plan === undefined ? '1' : one(sp.plan);
  const insp = one(sp.insp);
  const page = Math.max(1, parseInt(one(sp.page), 10) || 1);

  const conds = [];
  const params = [];
  const add = (sql, v) => {
    params.push(v);
    conds.push(sql.replace('?', `$${params.length}`));
  };
  if (f.d) add('a.distrik = ?', f.d);
  if (f.p) add('a.dept = ?', f.p);
  if (f.k) add('a.kategori = ?', f.k);
  if (f.j) add('a.jenis = ?', f.j);
  if (act === '1') conds.push('a.is_active');
  if (act === '0') conds.push('NOT a.is_active');
  if (plan === '1') conds.push('a.is_plan');
  if (plan === '0') conds.push('NOT a.is_plan');
  if (insp === 'belum') conds.push('a.last_inspection IS NULL');
  if (insp === 'sudah') conds.push('a.last_inspection IS NOT NULL');
  if (insp === 'temuan') conds.push('(a.has_finding AND NOT a.followed_up)');
  q.toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .forEach((t) => add("lower(a.distrik || ' ' || a.dept || ' ' || a.kategori || ' ' || a.jenis || ' ' || a.detail_jenis || ' ' || a.lokasi) LIKE ?", `%${t}%`));
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

  const canEdit = await verifyToken(cookies().get(EDIT_COOKIE)?.value, 'edit');
  const sql = db();
  const [options, totalRows, rows] = await Promise.all([
    filterOptions(),
    sql.query(`SELECT COUNT(*)::int AS n FROM assets a ${where}`, params),
    sql.query(
      `SELECT a.slug, a.distrik, a.dept, a.kategori, a.jenis, a.detail_jenis, a.lokasi, a.periode,
              a.start_date::text AS start_date, a.end_date::text AS end_date, a.is_active, a.is_plan,
              a.last_inspection::text AS last_inspection, a.has_finding, a.followed_up
         FROM assets a ${where}
        ORDER BY a.kategori, a.jenis, a.detail_jenis, a.lokasi
        LIMIT ${PAGE} OFFSET ${(page - 1) * PAGE}`,
      params
    ),
  ]);
  const total = totalRows[0].n;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const base = baseUrl();
  const keep = { ...f, q, act, plan, insp };

  return (
    <>
      <div className="page-h">
        <h1>Mapping Detail Jenis &amp; Lokasi</h1>
        <p className="muted">{total.toLocaleString('id-ID')} aset. Setiap aset punya link checklist sendiri.</p>
      </div>

      <EditBar canEdit={canEdit} options={options} />

      <FilterForm f={f} options={options} action="/admin/mapping" period={false}>
        <label className="field">
          <span>Cari</span>
          <input type="search" name="q" defaultValue={q} placeholder="jenis, detail, lokasi…" />
        </label>
        <label className="field">
          <span>Aktif</span>
          <select name="act" defaultValue={act}>
            <option value="1">Aktif</option>
            <option value="0">Tidak aktif</option>
            <option value="">Semua</option>
          </select>
        </label>
        <label className="field">
          <span>Plan</span>
          <select name="plan" defaultValue={plan}>
            <option value="1">Plan</option>
            <option value="0">Bukan plan</option>
            <option value="">Semua</option>
          </select>
        </label>
        <label className="field">
          <span>Inspeksi</span>
          <select name="insp" defaultValue={insp}>
            <option value="">Semua</option>
            <option value="belum">Belum pernah</option>
            <option value="sudah">Sudah pernah</option>
            <option value="temuan">Temuan belum follow up</option>
          </select>
        </label>
      </FilterForm>

      <div className="tscroll">
        <table>
          <thead>
            <tr>
              <th className="l">Kategori</th>
              <th className="l">Distrik</th>
              <th className="l">Dept</th>
              <th className="l">Jenis</th>
              <th className="l">Detail jenis</th>
              <th className="l">Lokasi</th>
              <th className="l">Periode</th>
              <th>Inspeksi terakhir</th>
              <th>Status</th>
              <th>Link</th>
              {canEdit && <th>Edit</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slug} className={r.is_active ? '' : 'dim'}>
                <td className="l"><KatBadge kategori={r.kategori} /></td>
                <td className="l">{r.distrik}</td>
                <td className="l">{r.dept}</td>
                <td className="l">{r.jenis}</td>
                <td className="l">{r.detail_jenis}</td>
                <td className="l">{r.lokasi}</td>
                <td className="l">{r.periode}</td>
                <td>{fmtDate(r.last_inspection)}</td>
                <td><Status r={r} /></td>
                <td className="nowrap">
                  <Link className="btn sm primary" href={`/i/${r.slug}`} target="_blank">Buka</Link>{' '}
                  <CopyButton text={`${base}/i/${r.slug}`} label="Salin" />
                </td>
                {canEdit && (
                  <td className="nowrap">
                    <RowEdit asset={r} options={options} />
                  </td>
                )}
              </tr>
            ))}
            {!rows.length && (
              <tr><td className="l muted" colSpan={canEdit ? 11 : 10} style={{ padding: 18 }}>Tidak ada aset yang cocok dengan filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pager">
        {page > 1 ? <Link className="btn" href={`/admin/mapping${qs({ ...keep, page: page - 1 })}`}>Sebelumnya</Link> : <span />}
        <span className="muted small">Halaman {page} dari {pages}</span>
        {page < pages ? <Link className="btn" href={`/admin/mapping${qs({ ...keep, page: page + 1 })}`}>Berikutnya</Link> : <span />}
      </div>
    </>
  );
}
