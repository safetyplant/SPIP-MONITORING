import FilterForm from '@/components/FilterForm';
import KatBadge from '@/components/KatBadge';
import { parseFilters, statsBy, filterOptions, sumRows, byKategoriOrder } from '@/lib/stats';
import { fmt, pct, achClass } from '@/lib/format';

export const dynamic = 'force-dynamic';
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

function Table({ rows, topKey, withJenis, grand }) {
  const out = [];
  group(rows, topKey).forEach(([top, list]) => {
    out.push(<Row key={`t-${top}`} label={top} s={sumRows(list)} level={0} />);
    const kats = group(list, 'kategori').sort((a, b) => byKategoriOrder(a[0], b[0]));
    kats.forEach(([kat, kl]) => {
      out.push(<Row key={`k-${top}-${kat}`} label="" kategori={kat} s={sumRows(kl)} level={1} />);
      if (withJenis) {
        group(kl, 'jenis').forEach(([j, jl]) => {
          out.push(<Row key={`j-${top}-${kat}-${j}`} label={j} s={sumRows(jl)} level={2} />);
        });
      }
    });
  });
  return (
    <div className="tscroll">
      <table>
        <thead>
          <tr>
            <th className="l">Item</th>
            <th>Jumlah plan</th>
            <th>Belum inspeksi</th>
            <th>Tidak ada temuan</th>
            <th>Temuan belum follow up</th>
            <th>Temuan sudah follow up</th>
            <th>ACH inspeksi</th>
          </tr>
        </thead>
        <tbody>
          {out}
          <Row key="grand" label="Total" s={grand} level={3} />
        </tbody>
      </table>
    </div>
  );
}

export default async function Page({ searchParams }) {
  const f = parseFilters(searchParams);
  const [options, perDistrik, perDept] = await Promise.all([
    filterOptions(),
    statsBy(f, ['distrik', 'kategori', 'jenis']),
    statsBy(f, ['dept', 'kategori']),
  ]);
  const grand = sumRows(perDistrik);

  return (
    <>
      <div className="page-h">
        <h1>Achievement inspeksi</h1>
        <p className="muted">ACH inspeksi = sudah inspeksi dibagi jumlah plan pada periode yang dipilih.</p>
      </div>
      <FilterForm f={f} options={options} action="/admin/achievement" />
      <section className="card">
        <h2>Per distrik, kategori, dan jenis</h2>
        <Table rows={perDistrik} topKey="distrik" withJenis grand={grand} />
      </section>
      <section className="card">
        <h2>Per dept dan kategori</h2>
        <Table rows={perDept} topKey="dept" grand={sumRows(perDept)} />
      </section>
      <p className="muted small">Hijau 100% atau lebih, kuning 80% atau lebih, merah di bawah 80%.</p>
    </>
  );
}
