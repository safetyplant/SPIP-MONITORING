import PrintButton from '@/components/PrintButton';
import { TEMPLATES } from '@/lib/checklists';

export const metadata = { title: 'Daftar checklist' };

export default function Page() {
  return (
    <>
      <div className="page-h">
        <div className="row spread">
          <div>
            <h1>Daftar checklist per item</h1>
            <p className="muted">{TEMPLATES.length} checklist. Dipilih otomatis sesuai jenis aset, dan bisa diganti saat inspeksi.</p>
          </div>
          <div className="row noprint">
            <a className="btn" href="/api/admin/export?type=checklists">Unduh Excel</a>
            <PrintButton label="Cetak" />
          </div>
        </div>
      </div>
      <div className="stack">
        {TEMPLATES.map((t) => (
          <details className="card tpl" key={t.k}>
            <summary>
              <span>{t.n}</span>
              <span className="muted small">{t.q.length} poin</span>
            </summary>
            <ol>
              {t.q.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ol>
          </details>
        ))}
      </div>
      <p className="muted small">Poin pemeriksaan ini draf awal. Cocokkan dengan SOP, standar pabrikan, dan ketentuan perusahaan sebelum dijadikan acuan resmi. Untuk mengubahnya, edit lib/checklists.js.</p>
    </>
  );
}
