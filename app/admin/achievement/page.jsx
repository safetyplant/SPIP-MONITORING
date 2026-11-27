import PptExport from '@/components/PptExport';
import { qs } from '@/lib/qs';
import FilterForm from '@/components/FilterForm';
import KatBadge from '@/components/KatBadge';
import { parseFilters, statsBy, filterOptions, sumRows } from '@/lib/stats';
import { fmt, pct, achClass, fmtDate } from '@/lib/format';
import { KATEGORI, KATEGORI_ORDER } from '@/lib/spip';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
export const metadata = { title: 'Achievement' };

function Row({ label, s, level, kategori }) {
  return (
    <tr className={`lv${level}`}>
      <th scope="row" className="l" style={{ paddingLeft: 10 + level * 18 }}>
        {kategori ? <KatBadge kategori={kategori} /> : null} <span className="cellname">{label}</span>
      </th>
      <td>{fmt(s.plan)}</td>
      <td>{fmt(s.belum)}</td>
      <td>{fmt(s.tanpa)}</td>
      <td>{fmt(s.bfu)}</td>
      <td>{fmt(s.fu)}</td>
      <td className={`ach ${achClass(s.ach)}`}>{pct(s.ach)}</td>
    </tr>
  );
}

function group(rows, key) {
  const m = new Map();
  rows.forEach((r) => {
    const k = r[key] || '(kosong)';
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  });
  return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0], 'id'));
}

function Head({ first }) {
  return (
    <thead>
      <tr>
        <th className="l">{first}</th>
        <th>Jumlah plan</th>
        <th>Belum inspeksi</th>
        <th>Tidak ada temuan</th>
        <th>Temuan belum follow up</th>
        <th>Temuan sudah follow up</th>
        <th>ACH inspeksi</th>
      </tr>
    </thead>
  );
}

// Tabel satu kelompok: Distrik > Jenis > Detail jenis.
function KatTable({ rows, total }) {
  const out = [];
  group(rows, 'distrik').forEach(([dis, dl]) => {
    out.push(<Row key={`d-${dis}`} label={dis} s={sumRows(dl)} level={0} />);
    group(dl, 'jenis').forEach(([j, jl]) => {
      out.push(<Row key={`j-${dis}-${j}`} label={j} s={sumRows(jl)} level={1} />);
      jl.filter((r) => r.detail).forEach((r) => {
        out.push(<Row key={`e-${dis}-${j}-${r.detail}`} label={r.detail} s={r} level={2} />);
      });
    });
  });
  return (
    <div className="tscroll">
      <table>
        <Head first="Distrik / Jenis / Detail jenis" />
        <tbody>
          {out}
          <Row key="total" label="Total" s={total} level={3} />
        </tbody>
      </table>
    </div>
  );
}

function DeptTable({ rows }) {
  return (
    <div className="tscroll">
      <table>
        <Head first="Dept" />
        <tbody>
          {rows.map((r) => <Row key={r.dept} label={r.dept || '(kosong)'} s={r} level={0} />)}
        </tbody>
      </table>
    </div>
  );
}

export default async function Page({ searchParams }) {
  const f = parseFilters(searchParams);
  const [options, detail, perDept] = await Promise.all([
    filterOptions(),
    statsBy(f, ['kategori', 'distrik', 'jenis', 'detail']),
    statsBy(f, ['kategori', 'dept']),
  ]);
  // Satu baris per detail; jumlahkan ke jenis, distrik, dan kategori di sisi server.
  const grand = sumRows(detail);
  const byKat = (k, rows) => rows.filter((r) => r.kategori === k);
  const kats = KATEGORI_ORDER.map((k) => ({ k, rows: byKat(k, detail), dept: byKat(k, perDept) }));

  return (
    <>
      <div className="page-h">
        <h1>Achievement inspeksi</h1>
        <p className="muted">
          ACH inspeksi = sudah inspeksi dibagi jumlah plan pada periode yang dipilih ({fmtDate(f.start)} s/d {fmtDate(f.end)}).
          Tanpa filter tanggal, periode otomatis year to date (1 Januari sampai hari ini).
        </p>
      </div>
      <FilterForm f={f} options={options} action="/admin/achievement" />
      <div className="row noprint" style={{ margin: '8px 0' }}>
        <PptExport query={qs({ type: 'achievement', d: f.d, p: f.p, k: f.k, j: f.j, de: f.de, pr: f.pr, l: f.l, start: f.start, end: f.end })} label="Unduh achievement (PPT)" />
      </div>

      <section className="kpis" aria-label="Ringkasan ACH per kelompok">
        {kats.map(({ k, rows }) => {
          const s = sumRows(rows);
          return (
            <a key={k} href={`#kat-${KATEGORI[k].key}`} className={`tile tile-kat kat-${KATEGORI[k].key}`}>
              <div className="tile-l">{k}</div>
              <div className={`tile-v ach ${achClass(s.ach)}`}>{pct(s.ach)}</div>
              <div className="tile-s">{fmt(s.sudah)} dari {fmt(s.plan)} plan</div>
            </a>
          );
        })}
        <div className="tile tile-total">
          <div className="tile-l">Total</div>
          <div className={`tile-v ach ${achClass(grand.ach)}`}>{pct(grand.ach)}</div>
          <div className="tile-s">{fmt(grand.sudah)} dari {fmt(grand.plan)} plan</div>
        </div>
      </section>

      {kats.map(({ k, rows, dept }) => {
        const s = sumRows(rows);
        return (
          <section key={k} id={`kat-${KATEGORI[k].key}`} className={`card cat-card kat-${KATEGORI[k].key}`}>
            <div className="cat-head">
              <div>
                <h2><KatBadge kategori={k} /> <span>{KATEGORI[k].label}</span></h2>
                <p className="muted small">{KATEGORI[k].short}</p>
              </div>
              <div className="cat-ach">
                <b className={`ach ${achClass(s.ach)}`}>{pct(s.ach)}</b>
                <span className="muted small">{fmt(s.sudah)} dari {fmt(s.plan)} plan</span>
              </div>
            </div>
            {rows.length ? (
              <>
                <h3 className="mt">Per distrik, jenis, dan detail jenis</h3>
                <KatTable rows={rows} total={s} />
                <h3 className="mt">Per dept</h3>
                <DeptTable rows={dept} />
              </>
            ) : (
              <p className="muted">Tidak ada plan {k} pada filter ini.</p>
            )}
          </section>
        );
      })}
      <p className="muted small">Hijau 100% atau lebih, kuning 80% atau lebih, merah di bawah 80%.</p>
    </>
  );
}
