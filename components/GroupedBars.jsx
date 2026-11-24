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

// Grafik batang 3D berkelompok, murni HTML dan CSS (tanpa library): batang tumbuh saat dimuat dan terangkat saat disorot.
export default function GroupedBars({ groups, height = 230 }) {
  const max = Math.max(1, ...groups.flatMap((g) => g.values));
  if (!groups.length) return <p className="empty">Tidak ada data pada filter ini.</p>;
  // Banyak kelompok: batang dirapatkan dan label diputar, supaya semuanya muat tanpa menggeser layar.
  const dense = groups.length > 7;
  const longest = Math.max(...groups.map((g) => String(g.label).length));
  const lh = Math.min(150, 16 + longest * 6.4);
  return (
    <div className="gb-scroll">
      <div className={`gb-row${dense ? ' dense' : ''}`} style={{ '--lh': `${lh}px` }}>
        {groups.map((g, gi) => (
          <div className="gb-group" key={g.key} title={g.label}>
            <div className="gb-plot" style={{ height }}>
              {g.values.map((v, i) => (
                <div className="gb-bar" key={i} title={`${SERIES[i][0]}: ${fmt(v)}`}>
                  <span className="gb-val">{fmt(v)}</span>
                  <i style={{ '--r': v / max, '--c': `var(${SERIES[i][1]})`, '--d': `${Math.min(gi, 12) * 70 + i * 90}ms` }} />
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
