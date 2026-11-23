import { katMeta } from '@/lib/spip';

// Badge kategori SPIP (Sarana, Prasarana, Instalasi, Peralatan). Dengan `full`, keterangan kategori ikut ditampilkan.
export default function KatBadge({ kategori, full = false }) {
  const m = katMeta(kategori);
  if (!m) return <span className="kat kat-none">{kategori || 'Tanpa kategori'}</span>;
  return (
    <span className={`kat kat-${m.key}`} title={m.desc}>
      <i aria-hidden="true" />
      <b>{m.label}</b>
      {full && <em>{m.short}</em>}
    </span>
  );
}
