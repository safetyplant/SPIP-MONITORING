import Link from 'next/link';
import FilterForm from '@/components/FilterForm';
import KatBadge from '@/components/KatBadge';
import { db } from '@/lib/db';
import { parseFilters, statsBy, filterOptions, byKategoriOrder } from '@/lib/stats';
import { fmt, pct, achClass } from '@/lib/format';
import { KATEGORI } from '@/lib/spip';
import { qs } from '@/lib/qs';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ringkasan' };

function Tile({ label, value, sub, color }) {
  return (
    <div className="tile" style={{ '--tc': `var(${color})` }}>
      <div className="tile-l">{label}</div>
      <div className="tile-v">{fmt(value)}</div>
      {sub ? <div className="tile-s">{sub}</div> : null}
    </div>
  );
}

const BARS = [
  ['Jumlah plan', 'plan', '--c-plan'],
  ['Belum inspeksi', 'belum', '--c-belum'],
  ['Sudah inspeksi', 'sudah', '--c-sudah'],
  ['Actual dengan temuan', 'tem', '--c-tem'],
  ['Temuan sudah follow up', 'fu', '--c-fu'],
];

function BarBlock({ title, kategori, s }) {
  return (
    <div className="barblock">
      <div className="barblock-h">
        {kategori ? <KatBadge kategori={kategori} /> : <strong>{title}</strong>}
        <span className="muted small">{pct(s.ach)}</span>
      </div>
      {kategori ? <p className="muted small barblock-d">{KATEGORI[kategori]?.short}</p> : null}
      {BARS.map(([label, key, color]) => {
        const w = s.plan ? Math.max(s[key] ? 1.5 : 0, (s[key] / s.plan) * 100) : 0;
        return (
          <div className="barrow" key={key}>
            <span className="barrow-l">{label}</span>
            <span className="bar-track">
              <i style={{ width: `${w.toFixed(1)}%`, background: `var(${color})` }} />
            </span>
            <b>{fmt(s[key])}</b>
          </div>
        );
      })}
    </div>
  );
}

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

export default async function Page({ searchParams }) {
  const f = parseFilters(searchParams);
  const showAll = searchParams?.all === '1';
  const [options, totalRows, byKat, byJenis, byDetail, count] = await Promise.all([
    filterOptions(),
    statsBy(f, []),
    statsBy(f, ['kategori']),
    statsBy(f, ['kategori', 'jenis']),
    statsBy(f, ['kategori', 'jenis', 'detail']),
    db()`SELECT COUNT(*)::int AS n FROM assets`,
  ]);
  const total = totalRows[0];

  if (!count[0].n) {
    return (
      <div className="card empty">
        <h1>Belum ada data aset</h1>
        <p className="muted">Impor daftar aset dari Excel. Setiap aset otomatis mendapat link dan QR sendiri.</p>
        <Link className="btn primary" href="/admin/import">Buka Data &amp; Excel</Link>
      </div>
    );
  }

  const base = { d: f.d, p: f.p, k: f.k, start: f.start, end: f.end };
  const katRows = [...byKat].sort((a, b) => byKategoriOrder(a.kategori, b.kategori));
  const jenisRows = [...byJenis].sort((a, b) => b.plan - a.plan);
  const detailAll = [...byDetail].filter((r) => !f.j || r.jenis === f.j).sort((a, b) => b.plan - a.plan);
  const detailRows = showAll ? detailAll : detailAll.slice(0, 12);

  return (
    <>
      <div className="page-h">
        <h1>Ringkasan SPIP</h1>
        <p className="muted">Sarana, Prasarana, Instalasi, dan Peralatan pada periode terpilih.</p>
      </div>

      <FilterForm f={f} options={options} action="/admin" />

      <section className="kpis">
        <Tile label="Jumlah plan" value={total.plan} color="--c-plan" />
        <Tile label="Sudah inspeksi" value={total.sudah} sub={`${pct(total.ach)} dari plan`} color="--c-sudah" />
        <Tile label="Belum inspeksi" value={total.belum} color="--c-belum" />
        <Tile label="Ada temuan" value={total.tem} color="--c-tem" />
        <Tile label="Sudah follow up" value={total.fu} sub={total.tem ? `${pct(total.fu / total.tem)} dari temuan` : ''} color="--c-fu" />
      </section>

      <section className="card">
        <h2>Implementasi kategori SPIP</h2>
        <div className="bgrid">
          {katRows.map((r) => (
            <BarBlock key={r.kategori} kategori={r.kategori} title={r.kategori} s={r} />
          ))}
          <BarBlock title="Grand total" s={total} />
        </div>
        <p className="muted small">Panjang bar dibandingkan dengan jumlah plan pada kelompok yang sama.</p>
      </section>

      <section className="card">
        <h2>Implementasi jenis SPIP</h2>
        <p className="muted small">Klik nama jenis untuk menyaring tabel detail di bawah.</p>
        <div className="tscroll">
          <table>
            <Head first="Jenis" />
            <tbody>
              {jenisRows.map((r) => (
                <StatRow key={`${r.kategori}|${r.jenis}`} s={r} href={`/admin${qs({ ...base, j: f.j === r.jenis ? '' : r.jenis })}`}>
                  <KatBadge kategori={r.kategori} /> <span className="cellname">{r.jenis || '(tanpa jenis)'}</span>
                </StatRow>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Implementasi detail jenis SPIP{f.j ? ` · ${f.j}` : ''}</h2>
        <div className="tscroll">
          <table>
            <Head first="Detail jenis" />
            <tbody>
              {detailRows.map((r) => (
                <StatRow key={`${r.kategori}|${r.jenis}|${r.detail}`} s={r}>
                  <KatBadge kategori={r.kategori} /> <span className="cellname">{r.detail || '(tanpa detail)'}</span>
                </StatRow>
              ))}
            </tbody>
          </table>
        </div>
        {detailAll.length > 12 && (
          <p>
            <Link className="btn sm" href={`/admin${qs({ ...base, j: f.j, all: showAll ? '' : '1' })}`}>
              {showAll ? 'Tampilkan lebih sedikit' : `Tampilkan semua (${detailAll.length})`}
            </Link>
          </p>
        )}
      </section>
    </>
  );
}
