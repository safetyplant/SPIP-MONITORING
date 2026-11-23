import Link from 'next/link';
import FilterForm from '@/components/FilterForm';
import KatBadge from '@/components/KatBadge';
import Logos from '@/components/Logos';
import GroupedBars, { Legend, valuesOf } from '@/components/GroupedBars';
import { db } from '@/lib/db';
import { parseFilters, statsBy, filterOptions } from '@/lib/stats';
import { fmt, pct, achClass } from '@/lib/format';
import { KATEGORI, KATEGORI_ORDER } from '@/lib/spip';
import { qs } from '@/lib/qs';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dashboard Summary SPIP' };

const MAX_DETAIL = 40;

function StatRow({ s, children, href }) {
  return (
    <tr>
      <th scope="row" className="l">{href ? <Link href={href}>{children}</Link> : children}</th>
      <td>{fmt(s.plan)}</td>
      <td>{fmt(s.belum)}</td>
      <td>{fmt(s.sudah)}</td>
      <td>{fmt(s.tem)}</td>
      <td>{fmt(s.fu)}</td>
      <td className={`ach ${achClass(s.ach)}`}>
        {pct(s.ach)}
        <span className="meter"><i style={{ width: `${Math.min(100, s.ach * 100).toFixed(0)}%` }} /></span>
      </td>
    </tr>
  );
}

const Head = ({ first }) => (
  <thead>
    <tr>
      <th className="l">{first}</th>
      <th>Plan</th>
      <th>Belum</th>
      <th>Sudah</th>
      <th>Temuan</th>
      <th>Follow up</th>
      <th>ACH</th>
    </tr>
  </thead>
);

function Panel({ title, children }) {
  return (
    <section className="tb-panel">
      <h2 className="tb-panel-h">{title}</h2>
      <div className="tb-panel-b">{children}</div>
    </section>
  );
}

export default async function Page({ searchParams }) {
  const f = parseFilters(searchParams);
  const [options, totalRows, byKat, byJenis, byDetail, meta] = await Promise.all([
    filterOptions(),
    statsBy(f, []),
    statsBy(f, ['kategori']),
    statsBy(f, ['kategori', 'jenis']),
    statsBy(f, ['kategori', 'jenis', 'detail']),
    db()`SELECT COUNT(*)::int AS n,
                to_char(MAX(updated_at) AT TIME ZONE 'Asia/Jakarta', 'DD/MM/YYYY HH24:MI:SS') AS refreshed
           FROM assets`,
  ]);
  const total = totalRows[0];

  if (!meta[0].n) {
    return (
      <div className="card empty">
        <h1>Belum ada data aset</h1>
        <p className="muted">Impor daftar aset dari Excel. Setiap aset otomatis mendapat link dan QR sendiri.</p>
        <Link className="btn primary" href="/admin/import">Buka Data &amp; Excel</Link>
      </div>
    );
  }

  const base = { d: f.d, p: f.p, k: f.k, de: f.de, pr: f.pr, l: f.l, start: f.start, end: f.end };

  const katGroups = [...byKat]
    .sort((a, b) => b.plan - a.plan)
    .map((r) => ({ key: r.kategori, label: r.kategori || '(tanpa kategori)', values: valuesOf(r) }));
  katGroups.push({ key: '__total', label: 'Grand Total', values: valuesOf(total) });

  const jenisRows = [...byJenis].sort((a, b) => b.plan - a.plan);
  const jenisGroups = jenisRows.map((r) => ({ key: `${r.kategori}|${r.jenis}`, label: r.jenis || '(tanpa jenis)', values: valuesOf(r) }));

  const detailAll = [...byDetail].filter((r) => !f.j || r.jenis === f.j).sort((a, b) => b.plan - a.plan);
  const detailGroups = detailAll.slice(0, MAX_DETAIL).map((r) => ({ key: `${r.kategori}|${r.jenis}|${r.detail}`, label: r.detail || '(tanpa detail)', values: valuesOf(r) }));

  return (
    <>
      <header className="tb-banner">
        <Logos />
        <h1>Dashboard Summary SPIP</h1>
      </header>

      <FilterForm f={f} options={options} action="/admin" full lastRefresh={meta[0].refreshed} />

      <div className="tb-top">
        <Panel title="Implementasi Kategori SPIP">
          <GroupedBars groups={katGroups} />
        </Panel>
        <Panel title="Implementasi Jenis SPIP">
          <GroupedBars groups={jenisGroups} />
        </Panel>
      </div>

      <Panel title="Implementasi Detail Jenis SPIP">
        <GroupedBars groups={detailGroups} />
        {detailAll.length > MAX_DETAIL && (
          <p className="muted small tb-note">Menampilkan {MAX_DETAIL} detail jenis dengan plan terbanyak dari {detailAll.length}. Persempit dengan filter Jenis atau Detail Jenis.</p>
        )}
      </Panel>
      <Legend />

      <section className="kat-defs" aria-label="Keterangan kategori SPIP">
        {KATEGORI_ORDER.map((k) => (
          <div key={k} className={`kat-def kat-${KATEGORI[k].key}`}>
            <b>{KATEGORI[k].label}</b>
            <p>{KATEGORI[k].desc}</p>
          </div>
        ))}
      </section>

      <details className="card tb-detail">
        <summary>Rincian tabel (angka lengkap dan ACH)</summary>
        <h2 className="mt">Jenis SPIP</h2>
        <p className="muted small">Klik nama jenis untuk menyaring grafik detail jenis.</p>
        <div className="tscroll">
          <table>
            <Head first="Jenis" />
            <tbody>
              <StatRow s={total}><strong>Grand total</strong></StatRow>
              {jenisRows.map((r) => (
                <StatRow key={`${r.kategori}|${r.jenis}`} s={r} href={`/admin${qs({ ...base, j: f.j === r.jenis ? '' : r.jenis })}`}>
                  <KatBadge kategori={r.kategori} /> <span className="cellname">{r.jenis || '(tanpa jenis)'}</span>
                </StatRow>
              ))}
            </tbody>
          </table>
        </div>
        <h2 className="mt">Detail jenis SPIP{f.j ? ` · ${f.j}` : ''}</h2>
        <div className="tscroll">
          <table>
            <Head first="Detail jenis" />
            <tbody>
              {detailAll.map((r) => (
                <StatRow key={`${r.kategori}|${r.jenis}|${r.detail}`} s={r}>
                  <KatBadge kategori={r.kategori} /> <span className="cellname">{r.detail || '(tanpa detail)'}</span>
                </StatRow>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
