import Link from 'next/link';
import QRCode from 'qrcode';
import KatBadge from '@/components/KatBadge';
import PrintButton from '@/components/PrintButton';
import QrDownload from '@/components/QrDownload';
import PptExport from '@/components/PptExport';
import FilterForm from '@/components/FilterForm';
import { db } from '@/lib/db';
import { filterOptions } from '@/lib/stats';
import { baseUrl } from '@/lib/url';
import { qs } from '@/lib/qs';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
export const metadata = { title: 'QR aset' };

const PAGE = 24;
const one = (v) => (Array.isArray(v) ? v[0] : v) || '';

export default async function Page({ searchParams }) {
  const sp = searchParams || {};
  const f = { d: one(sp.d), p: one(sp.p), k: one(sp.k), j: one(sp.j) };
  const q = one(sp.q).trim();
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
    .forEach((t) => add("lower(a.jenis || ' ' || a.detail_jenis || ' ' || a.lokasi || ' ' || a.kode_aset) LIKE ?", `%${t}%`));
  const where = `WHERE ${conds.join(' AND ')}`;

  const sql = db();
  const [options, totalRows, rows] = await Promise.all([
    filterOptions(),
    sql.query(`SELECT COUNT(*)::int AS n FROM assets a ${where}`, params),
    sql.query(
      `SELECT a.slug, a.kategori, a.jenis, a.detail_jenis, a.lokasi, a.kode_aset, a.distrik
         FROM assets a ${where}
        ORDER BY a.kategori, a.jenis, a.detail_jenis, a.lokasi
        LIMIT ${PAGE} OFFSET ${(page - 1) * PAGE}`,
      params
    ),
  ]);
  const total = totalRows[0].n;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const base = baseUrl();
  const labels = await Promise.all(
    rows.map(async (r) => ({
      ...r,
      svg: await QRCode.toString(`${base}/i/${r.slug}`, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }),
    }))
  );
  const keep = { ...f, q };

  return (
    <>
      <div className="page-h noprint">
        <h1>QR aset</h1>
        <p className="muted">Cetak dan tempel di unit atau lokasi. Scan QR untuk membuka checklist aset tersebut.</p>
      </div>
      <div className="noprint">
        <FilterForm f={f} options={options} action="/admin/qr" period={false}>
          <label className="field">
            <span>Cari</span>
            <input type="search" name="q" defaultValue={q} placeholder="kode unit, jenis, detail, lokasi…" />
          </label>
        </FilterForm>
      </div>
      <div className="row spread noprint">
        <span className="muted small">{total.toLocaleString('id-ID')} aset aktif · halaman {page} dari {pages}</span>
        <div className="row">
          <PptExport type="qr" query={qs({ type: 'qr', ...keep })} label="Unduh semua (PPT)" />
          <PrintButton label="Cetak label" />
        </div>
      </div>

      <div className="qr-grid">
        {labels.map((r) => (
          <figure className="qr-card" key={r.slug}>
            <div className="qr-img" dangerouslySetInnerHTML={{ __html: r.svg }} />
            <figcaption>
              <KatBadge kategori={r.kategori} />
              {r.kode_aset ? <b className="qr-kode">{r.kode_aset}</b> : null}
              <strong>{r.detail_jenis || r.jenis}</strong>
              <span>{r.lokasi}</span>
              <small>{base.replace(/^https?:\/\//, '')}/i/{r.slug}</small>
              <QrDownload url={`${base}/i/${r.slug}`} slug={r.slug} kode={r.kode_aset || ''} title={r.detail_jenis || r.jenis || ''} lokasi={r.lokasi || ''} kategori={r.kategori || ''} />
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="pager noprint">
        {page > 1 ? <Link className="btn" href={`/admin/qr${qs({ ...keep, page: page - 1 })}`}>Sebelumnya</Link> : <span />}
        {page < pages ? <Link className="btn" href={`/admin/qr${qs({ ...keep, page: page + 1 })}`}>Berikutnya</Link> : <span />}
      </div>
    </>
  );
}
