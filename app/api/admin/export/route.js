import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { db } from '@/lib/db';
import { TEMPLATES } from '@/lib/checklists';
import { fmtDate } from '@/lib/format';
import { baseUrl } from '@/lib/url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const HEAD = ['No.', 'Distrik', 'Dept', 'Kategori SPIP', 'Jenis', 'Detail Jenis', 'Lokasi', 'Kode Aset', 'Periode', 'Start Date', 'End Date', 'Is Active', 'Is Plan', 'First Inspection', 'Last Inspection', 'Ada Temuan', 'Sudah Follow Up', 'Link Checklist'];

function sheet(aoa, widths) {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  if (widths) ws['!cols'] = widths.map((w) => ({ wch: w }));
  return ws;
}

function file(wb, name) {
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store',
    },
  });
}

export async function GET(req) {
  const type = new URL(req.url).searchParams.get('type');
  const sql = db();
  const wb = XLSX.utils.book_new();
  const stamp = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

  if (type === 'template') {
    const ex = [
      [1, 'DISTRIK-A', 'SPLA', 'Peralatan', 'Alat Berat', 'Dump Truck', 'Area Tambang DT0001', 'DT0001', 'Every 6 Months', '01/01/2026', '31/12/2026', 'ACTIVE', 'PLAN', '', '', '', '', ''],
      [2, 'DISTRIK-A', 'SHCG', 'Instalasi', 'Instalasi Listrik', 'Panel Listrik', 'Panel Listrik Workshop 01', 'PNL-WS-01', 'Every 3 Months', '01/01/2026', '31/12/2026', 'ACTIVE', 'PLAN', '10/11/2026', '10/11/2026', 'Tidak', '', ''],
      [3, 'DISTRIK-A', 'SPRO', 'Prasarana', 'Fasilitas pengangkutan, dan sejenisnya', 'Jalan kelas 1', 'Jalan Hauling KM 3', 'JLN-HL-03', 'Weekly', '01/01/2026', '31/12/2026', 'ACTIVE', 'PLAN', '12/11/2026', '12/11/2026', 'Ya', 'Tidak', ''],
      [4, 'DISTRIK-A', 'SHCG', 'Sarana', 'Bangunan/ Konstruksi', 'Workshop', 'Workshop Utama', 'WS-01', 'Every 6 Months', '01/01/2026', '31/12/2026', 'ACTIVE', 'PLAN', '', '', '', '', ''],
    ];
    XLSX.utils.book_append_sheet(wb, sheet([HEAD, ...ex], [5, 12, 8, 13, 28, 22, 28, 16, 16, 12, 12, 12, 10, 16, 16, 12, 16, 40]), 'Data SPIP');
    const guide = [
      ['Kolom', 'Isi', 'Wajib'],
      ['Distrik', 'Kode distrik atau site', 'Disarankan'],
      ['Dept', 'Kode departemen pemilik aset', 'Disarankan'],
      ['Kategori SPIP', 'Sarana, Prasarana, Instalasi, atau Peralatan. Bila kosong, kategori ditebak dari Jenis dan Detail Jenis', 'Disarankan'],
      ['Jenis', 'Jenis SPIP (mis. Alat Berat, Instalasi Listrik)', 'Ya'],
      ['Detail Jenis', 'Item spesifik (mis. Dump Truck, Panel Listrik, Shackle)', 'Ya'],
      ['Lokasi', 'Lokasi aset', 'Ya'],
      ['Kode Aset', 'Kode aset / kode unit / kode alat (mis. DT0001, PNL-WS-01). Dipakai juga sebagai pembeda bila ada beberapa aset sejenis di lokasi yang sama', 'Disarankan'],
      ['Periode', 'Weekly, Monthly, Every 3 Months, Every 6 Months, Yearly', 'Disarankan'],
      ['Start Date / End Date', 'Masa berlaku plan, format dd/mm/yyyy', 'Disarankan'],
      ['Is Active', 'ACTIVE atau NOT ACTIVE', 'Opsional (bawaan aktif)'],
      ['Is Plan', 'PLAN atau NOT PLAN', 'Opsional (bawaan plan)'],
      ['First / Last Inspection', 'Tanggal inspeksi pertama dan terakhir, dd/mm/yyyy', 'Opsional'],
      ['Ada Temuan', 'Ya atau Tidak, untuk inspeksi terakhir', 'Opsional'],
      ['Sudah Follow Up', 'Ya atau Tidak, bila ada temuan', 'Opsional'],
      ['Link Checklist', 'Diisi otomatis pada ekspor data. Diabaikan saat impor', ''],
      ['Catatan', 'Baris contoh pada sheet Data SPIP boleh dihapus. Jangan ubah nama header kolom.', ''],
    ];
    XLSX.utils.book_append_sheet(wb, sheet(guide, [24, 90, 26]), 'Petunjuk');
    return file(wb, 'template-impor-spip.xlsx');
  }

  if (type === 'checklists') {
    const rows = [['Item SPIP', 'Dasar regulasi / acuan', 'No.', 'Poin pemeriksaan', 'Sesuai', 'Temuan', 'N/A', 'Keterangan']];
    TEMPLATES.forEach((t) => t.q.forEach((q, i) => rows.push([i === 0 ? t.n : '', i === 0 ? t.ref || '' : '', i + 1, q, '', '', '', ''])));
    XLSX.utils.book_append_sheet(wb, sheet(rows, [38, 60, 5, 90, 8, 8, 8, 30]), 'Checklist SPIP');
    return file(wb, 'checklist-spip.xlsx');
  }

  if (type === 'assets') {
    const base = baseUrl();
    const rows = await sql`
      SELECT slug, distrik, dept, kategori, jenis, detail_jenis, lokasi, kode_aset, periode,
             start_date::text AS s, end_date::text AS e, is_active, is_plan,
             first_inspection::text AS fi, last_inspection::text AS li, has_finding, followed_up
        FROM assets ORDER BY kategori, jenis, detail_jenis, lokasi`;
    const aoa = rows.map((r, i) => [
      i + 1, r.distrik, r.dept, r.kategori, r.jenis, r.detail_jenis, r.lokasi, r.kode_aset, r.periode,
      r.s ? fmtDate(r.s) : '', r.e ? fmtDate(r.e) : '',
      r.is_active ? 'ACTIVE' : 'NOT ACTIVE', r.is_plan ? 'PLAN' : 'NOT PLAN',
      r.fi ? fmtDate(r.fi) : '', r.li ? fmtDate(r.li) : '',
      r.li ? (r.has_finding ? 'Ya' : 'Tidak') : '', r.has_finding ? (r.followed_up ? 'Ya' : 'Tidak') : '',
      `${base}/i/${r.slug}`,
    ]);
    XLSX.utils.book_append_sheet(wb, sheet([HEAD, ...aoa], [5, 12, 8, 13, 28, 22, 28, 16, 16, 12, 12, 12, 10, 16, 16, 12, 16, 44]), 'Data SPIP');
    return file(wb, `data-spip-${stamp}.xlsx`);
  }

  if (type === 'inspections') {
    const rows = await sql`
      SELECT i.inspected_on::text AS d, i.nrp, i.inspector_name, i.kind, i.result, i.items, i.notes,
             a.distrik, a.dept, a.kategori, a.jenis, a.detail_jenis, a.lokasi, a.kode_aset
        FROM inspections i JOIN assets a ON a.id = i.asset_id
       ORDER BY i.inspected_on, i.id LIMIT 30000`;
    const lab = { ok: 'Sesuai', tem: 'Temuan', na: 'N/A' };
    const aoa = [['Tanggal', 'NRP', 'Pemeriksa', 'Distrik', 'Dept', 'Kategori', 'Jenis', 'Detail Jenis', 'Lokasi', 'Kode Aset', 'Aksi', 'Hasil', 'Poin pemeriksaan', 'Jawaban', 'Catatan']];
    rows.forEach((r) => {
      const common = [fmtDate(r.d), r.nrp, r.inspector_name, r.distrik, r.dept, r.kategori, r.jenis, r.detail_jenis, r.lokasi, r.kode_aset];
      if (r.kind === 'followup') {
        aoa.push([...common, 'Follow up', 'Follow up', '', '', r.notes]);
        return;
      }
      const hasil = r.result === 'temuan' ? 'Ada temuan' : 'Sesuai';
      const items = Array.isArray(r.items) ? r.items : [];
      items.forEach((it, i) => aoa.push([...common, 'Inspeksi', hasil, it.q, lab[it.r] || it.r, it.n || (i === 0 ? r.notes : '')]));
    });
    XLSX.utils.book_append_sheet(wb, sheet(aoa, [12, 12, 20, 12, 8, 12, 22, 22, 26, 14, 10, 12, 70, 10, 40]), 'Riwayat inspeksi');
    return file(wb, `riwayat-inspeksi-${stamp}.xlsx`);
  }

  return NextResponse.json({ error: 'Tipe ekspor tidak dikenal.' }, { status: 400 });
}
