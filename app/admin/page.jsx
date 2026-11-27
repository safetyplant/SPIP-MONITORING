import Link from 'next/link';
import PptExport from '@/components/PptExport';
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
export const fetchCache = 'force-no-store';
export const revalidate = 0;
export const metadata = { title: 'Dashboard Summary SPIP' };

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
      <>
      <header className="tb-banner">
        <Logos />
        <h1>Dashboard Summary SPIP</h1>
      </header>
      <div className="card empty">
        <h1>Belum ada data aset</h1>
        <p className="muted">Tambahkan aset langsung di aplikasi lewat menu Mapping (kunci dibuka dengan kata sandi login). Setiap aset otomatis mendapat link dan QR sendiri.</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <Link className="btn primary" href="/admin/mapping">Tambah aset langsung</Link>
          <Link className="btn ghost" href="/admin/import">Atau impor dari Excel</Link>
        </div>
      </div>
      </>
    );
  }

  const base = { d: f.d, p: f.p, k: f.k, de: f.de, pr: f.pr, l: f.l, start: f.start, end: f.end };

  const katGroups = [...byKat]
    .sort((x, y) => KATEGORI_ORDER.indexOf(x.kategori) - KATEGORI_ORDER.indexOf(y.kategori))
    .map((r) => ({ key: r.kategori, label: r.kategori || '(tanpa kategori)', values: valuesOf(r) }));
  katGroups.push({ key: '__total', label: 'Grand Total', values: valuesOf(total) });

  const jenisRows = [...byJenis].sort((x, y) => y.plan - x.plan);
  const detailAll = [...byDetail].filter((r) => !f.j || r.jenis === f.j).sort((x, y) => y.plan - x.plan);

  // Jenis dan detail jenis dipisah per kategori, supaya tiap grafik cukup lebar dan seluruh batang terlihat.
  const perKat = KATEGORI_ORDER.map((k) => {
    const jr = jenisRows.filter((r) => r.kategori === k);
    const dr = detailAll.filter((r) => r.kategori === k);
    return {
      k,
      sum: byKat.find((r) => r.kategori === k),
      jenis: jr.map((r) => ({ key: `${r.kategori}|${r.jenis}`, label: r.jenis || '(tanpa jenis)', values: valuesOf(r) })),
      detail: dr.map((r) => ({ key: `${r.kategori}|${r.jenis}|${r.detail}`, label: r.detail || r.jenis || '(tanpa detail)', values: valuesOf(r) })),
    };
  }).filter((x) => x.jenis.length || x.detail.length);

  return (
    <>
      <header className="tb-banner">
        <Logos />
        <h1>Dashboard Summary SPIP</h1>
      </header>

      <FilterForm f={f} options={options} action="/admin" full lastRefresh={meta[0].refreshed} />
      <div className="row noprint" style={{ margin: '8px 0' }}>
        <PptExport query={qs({ type: 'dashboard', d: f.d, p: f.p, k: f.k, j: f.j, de: f.de, pr: f.pr, l: f.l, start: f.start, end: f.end })} label="Unduh dashboard (PPT)" />
      </div>

      <Panel title="Implementasi Kategori SPIP">
        <GroupedBars groups={katGroups} />
      </Panel>
      <Legend />

      {perKat.map(({ k, sum, jenis, detail }) => (
        <section key={k} className={`cat-block kat-${KATEGORI[k].key}`}>
          <header className="cat-head">
            <h2><KatBadge kategori={k} /> <span>{KATEGORI[k].label}</span> <small className="muted">{KATEGORI[k].short}</small></h2>
            {sum ? (
              <div className="cat-ach">
                <b className={`ach ${achClass(sum.ach)}`}>{pct(sum.ach)}</b>
                <span className="muted small">{fmt(sum.sudah)} dari {fmt(sum.plan)} plan</span>
              </div>
            ) : null}
          </header>
          <div className={`cat-grid${detail.length > 9 ? ' wide' : ''}`}>
            <Panel title={`Implementasi Jenis SPIP · ${k}`}>
              <GroupedBars groups={jenis} />
            </Panel>
            <Panel title={`Implementasi Detail Jenis SPIP · ${k}`}>
              <GroupedBars groups={detail} />
            </Panel>
          </div>
        </section>
      ))}

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
