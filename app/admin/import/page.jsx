import { db } from '@/lib/db';
import ImportClient from './ImportClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Data & Excel' };

export default async function Page() {
  const [c] = await db()`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE is_active)::int AS aktif,
           (SELECT COUNT(*)::int FROM inspections WHERE kind = 'inspeksi') AS inspeksi
      FROM assets`;

  return (
    <>
      <div className="page-h">
        <h1>Data &amp; Excel</h1>
        <p className="muted">
          {c.aktif.toLocaleString('id-ID')} aset aktif dari {c.total.toLocaleString('id-ID')} aset · {c.inspeksi.toLocaleString('id-ID')} inspeksi tersimpan.
        </p>
      </div>

      <section className="card">
        <h2>Impor dari Excel</h2>
        <p className="muted">
          Pakai ekspor dari dashboard Tableau (tab Mapping Detail Jenis &amp; Lokasi) atau template di bawah. Header dikenali otomatis. Setiap aset baru otomatis mendapat link dan QR sendiri.
        </p>
        <ImportClient />
      </section>

      <section className="card">
        <h2>Unduh Excel</h2>
        <div className="row">
          <a className="btn" href="/api/admin/export?type=template">Template impor</a>
          <a className="btn" href="/api/admin/export?type=assets">Data aset + link checklist</a>
          <a className="btn" href="/api/admin/export?type=inspections">Riwayat inspeksi (dengan NRP)</a>
          <a className="btn" href="/api/admin/export?type=checklists">Daftar checklist</a>
        </div>
      </section>
    </>
  );
}
