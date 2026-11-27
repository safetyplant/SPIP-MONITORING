import PptExport from '@/components/PptExport';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import KatBadge from '@/components/KatBadge';
import { db } from '@/lib/db';
import { getTemplate } from '@/lib/checklists';
import { monthlyMap } from '@/lib/history';
import { MONTHS, fmtDate, jakartaToday } from '@/lib/format';
import { SLUG_RE } from '@/lib/validate';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
export const metadata = { title: 'Riwayat unit' };

const R = { ok: ['Sesuai', 'ok'], tem: ['Temuan', 'warn'], na: ['N/A', ''] };

export default async function Page({ params }) {
  if (!SLUG_RE.test(params.slug)) notFound();
  const sql = db();
  const found = await sql`
    SELECT id, slug, kode_aset, distrik, dept, kategori, jenis, detail_jenis, lokasi, periode,
           last_inspection::text AS last_inspection, has_finding, followed_up, is_active
      FROM assets WHERE slug = ${params.slug}`;
  const a = found[0];
  if (!a) notFound();

  const year = Number(jakartaToday().slice(0, 4));
  const [rows, mm] = await Promise.all([
    sql`SELECT id, kind, inspected_on::text AS d, nrp, inspector_name, template_key, result, items, notes
          FROM inspections WHERE asset_id = ${a.id}
         ORDER BY inspected_on DESC, id DESC LIMIT 300`,
    monthlyMap([a], year),
  ]);
  const m = mm[a.id];
  const jml = rows.filter((r) => r.kind === 'inspeksi').length;
  const temuan = rows.filter((r) => r.kind === 'inspeksi' && r.result === 'temuan').length;

  return (
    <>
      <div className="page-h">
        <p className="small"><Link href="/admin/riwayat">← Semua riwayat</Link></p>
        <div className="row spread">
          <div>
            <KatBadge kategori={a.kategori} />
            <h1 className="mt">{a.kode_aset ? `${a.kode_aset} · ` : ''}{a.detail_jenis || a.jenis}</h1>
            <p className="muted">{[a.lokasi, a.distrik, a.dept, a.periode].filter(Boolean).join(' · ')}</p>
          </div>
          <div className="row noprint">
            <PptExport query={`?type=unit&slug=${a.slug}`} label="Unduh PPT" />
            <Link className="btn primary" href={`/i/${a.slug}`} target="_blank">Isi checklist</Link>
            <Link className="btn" href="/admin/mapping">Mapping</Link>
          </div>
        </div>
      </div>

      <section className="card">
        <h2>Status per bulan {year}</h2>
        <ol className="ck-months">
          {MONTHS.map((mn, i) => {
            const v = m[i];
            const future = i > Number(jakartaToday().slice(5, 7)) - 1;
            const cls = v === 2 ? 'tem' : v === 1 ? 'ok' : future ? 'fut' : 'no';
            return <li key={mn} className={`m-${cls}`}><span>{mn}</span><b>{v === 2 ? '!' : v === 1 ? '✓' : future ? '·' : '–'}</b></li>;
          })}
        </ol>
        <p className="muted small">
          {jml} inspeksi tersimpan, {temuan} dengan temuan. Inspeksi terakhir: {fmtDate(a.last_inspection)}
          {a.has_finding && !a.followed_up ? ' · ada temuan belum follow up' : ''}.
        </p>
      </section>

      <section className="stack">
        <h2>Semua inspeksi dan tindak lanjut</h2>
        {!rows.length && (
          <div className="card empty">
            <p className="muted">Belum ada inspeksi yang tersimpan lewat checklist.{a.last_inspection ? ` Tanggal inspeksi terakhir (${fmtDate(a.last_inspection)}) berasal dari impor Excel atau edit manual.` : ''}</p>
          </div>
        )}
        {rows.map((r) => {
          const items = Array.isArray(r.items) ? r.items : [];
          const tpl = getTemplate(r.template_key);
          const tem = items.filter((x) => x.r === 'tem').length;
          return (
            <details className="card rw-item" key={r.id}>
              <summary>
                <b>{fmtDate(r.d)}</b>
                {r.kind === 'followup'
                  ? <span className="pill">Tindak lanjut</span>
                  : <span className={`pill ${r.result === 'temuan' ? 'warn' : 'ok'}`}>{r.result === 'temuan' ? (tem ? `${tem} temuan` : 'Ada temuan') : 'Sesuai'}</span>}
                <span>{r.inspector_name} <span className="muted">· NRP {r.nrp}</span></span>
                {tpl ? <span className="muted small">{tpl.n}</span> : null}
              </summary>
              {r.kind === 'followup' ? (
                <p>{r.notes}</p>
              ) : (
                <>
                  <ol className="rw-items">
                    {items.map((x, i) => (
                      <li key={i} className={`r-${x.r}`}>
                        <span className={`pill ${(R[x.r] || [])[1] || ''}`}>{(R[x.r] || [x.r])[0]}</span>
                        <span>{x.q}{x.n ? <em>{x.n}</em> : null}</span>
                      </li>
                    ))}
                  </ol>
                  {r.notes ? <p className="muted small"><b>Catatan:</b> {r.notes}</p> : null}
                </>
              )}
            </details>
          );
        })}
      </section>
    </>
  );
}
