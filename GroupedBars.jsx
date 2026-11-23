import { fmt } from '@/lib/format';

// Seri batang mengikuti dashboard Tableau: biru, merah, oranye, kuning, hijau.
export const SERIES = [
  ['Jumlah plan', '--s0'],
  ['Belum inspeksi', '--s1'],
  ['Sudah inspeksi', '--s2'],
  ['Actual dengan temuan', '--s3'],
  ['Temuan sudah follow up', '--s4'],
];

export const valuesOf = (s) => [s.plan, s.belum, s.sudah, s.tem, s.fu];

export function Legend() {
  return (
    <ul className="gb-legend">
      {SERIES.map(([label, c]) => (
        <li key={c}>
          <i style={{ background: `var(${c})` }} />
          {label}
        </li>
      ))}
    </ul>
  );
}

// Grafik batang berkelompok murni HTML dan CSS (tanpa library). Tiap kelompok berisi lima batang.
export default function GroupedBars({ groups, height = 230 }) {
  const max = Math.max(1, ...groups.flatMap((g) => g.values));
  if (!groups.length) return <p className="empty">Tidak ada data pada filter ini.</p>;
  return (
    <div className="gb-scroll">
      <div className="gb-row">
        {groups.map((g) => (
          <div className="gb-group" key={g.key} title={g.label}>
            <div className="gb-plot" style={{ height }}>
              {g.values.map((v, i) => (
                <div className="gb-bar" key={i} title={`${SERIES[i][0]}: ${fmt(v)}`}>
                  <span className="gb-val">{fmt(v)}</span>
                  <i style={{ '--r': v / max, background: `var(${SERIES[i][1]})` }} />
                </div>
              ))}
            </div>
            <div className="gb-label">{g.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
