import QRCode from 'qrcode';
import { db } from './db';
import { parseFilters, statsBy, sumRows } from './stats';
import { loadTemuan, temuanParams } from './temuan';
import { monthlyMap } from './history';
import { TEMPLATES, getTemplate } from './checklists';
import { KATEGORI_ORDER } from './spip';
import { baseUrl } from './url';
import { MONTHS, fmt, pct, fmtDate, jakartaToday } from './format';

// Setiap deck = { title, slides: [...] }. Jenis slide: cover, kpi, table, chart, bullets, qrs.
// Tabel panjang dipecah per ROWS baris supaya muat di satu slide.
const ROWS = 12;
const one = (v) => (Array.isArray(v) ? v[0] : v) || '';
const stamp = () => `Dicetak ${fmtDate(jakartaToday())}`;

function cover(title, sub) {
  return { t: 'cover', title, sub: sub || stamp() };
}

function tableSlides(title, cols, rows, opt = {}) {
  const per = opt.per || ROWS;
  if (!rows.length) return [{ t: 'bullets', title, bullets: ['Tidak ada data pada filter ini.'] }];
  const n = Math.ceil(rows.length / per);
  return Array.from({ length: n }, (_, i) => ({
    t: 'table',
    title: n > 1 ? `${title} (${i + 1}/${n})` : title,
    sub: opt.sub || '',
    cols,
    widths: opt.widths || null,
    rows: rows.slice(i * per, (i + 1) * per).map((r) => r.map((c) => (c === null || c === undefined ? '' : String(c)))),
  }));
}

const periodSub = (f) => `Periode ${fmtDate(f.start)} s/d ${fmtDate(f.end)}`;

async function dashboardDeck(sp) {
  const f = parseFilters(sp);
  const [tot, byKat, byJenis] = await Promise.all([statsBy(f, []), statsBy(f, ['kategori']), statsBy(f, ['kategori', 'jenis'])]);
  const t = tot[0] || sumRows([]);
  const slides = [cover('Dashboard Summary SPIP', periodSub(f))];
  slides.push({
    t: 'kpi',
    title: 'Ringkasan keseluruhan',
    sub: periodSub(f),
    kpis: [
      { l: 'Plan', v: fmt(t.plan) },
      { l: 'Sudah inspeksi', v: fmt(t.sudah) },
      { l: 'Belum inspeksi', v: fmt(t.belum) },
      { l: 'Temuan', v: fmt(t.tem) },
      { l: 'Temuan sudah follow up', v: fmt(t.fu) },
      { l: 'ACH inspeksi', v: pct(t.ach) },
    ],
  });
  const kats = KATEGORI_ORDER.map((k) => byKat.find((r) => r.kategori === k)).filter(Boolean);
  slides.push({
    t: 'chart',
    title: 'Implementasi per kelompok',
    sub: periodSub(f),
    labels: kats.map((r) => r.kategori),
    series: [
      { name: 'Plan', values: kats.map((r) => r.plan) },
      { name: 'Sudah', values: kats.map((r) => r.sudah) },
      { name: 'Temuan', values: kats.map((r) => r.tem) },
      { name: 'Follow up', values: kats.map((r) => r.fu) },
    ],
  });
  slides.push(...tableSlides('ACH per kelompok', ['Kelompok', 'Plan', 'Belum', 'Sudah', 'Temuan', 'Follow up', 'ACH'],
    kats.map((r) => [r.kategori, fmt(r.plan), fmt(r.belum), fmt(r.sudah), fmt(r.tem), fmt(r.fu), pct(r.ach)]), { sub: periodSub(f) }));
  KATEGORI_ORDER.forEach((k) => {
    const rows = byJenis.filter((r) => r.kategori === k).sort((a, b) => b.plan - a.plan);
    if (!rows.length) return;
    const top = rows.slice(0, 12);
    slides.push({
      t: 'chart',
      title: `${k}: implementasi per jenis`,
      sub: periodSub(f),
      labels: top.map((r) => r.jenis || '(tanpa jenis)'),
      series: [
        { name: 'Plan', values: top.map((r) => r.plan) },
        { name: 'Sudah', values: top.map((r) => r.sudah) },
        { name: 'Temuan', values: top.map((r) => r.tem) },
      ],
    });
    slides.push(...tableSlides(`${k}: rincian per jenis`, ['Jenis', 'Plan', 'Belum', 'Sudah', 'Temuan', 'Follow up', 'ACH'],
      rows.map((r) => [r.jenis, fmt(r.plan), fmt(r.belum), fmt(r.sudah), fmt(r.tem), fmt(r.fu), pct(r.ach)]), { sub: periodSub(f), widths: [3.4, 1, 1, 1, 1, 1, 1] }));
  });
  return { title: 'Dashboard Summary SPIP', slides };
}

async function achievementDeck(sp) {
  const f = parseFilters(sp);
  const [detail, perDept] = await Promise.all([statsBy(f, ['kategori', 'distrik', 'jenis', 'detail']), statsBy(f, ['kategori', 'dept'])]);
  const grand = sumRows(detail);
  const slides = [cover('Achievement Inspeksi SPIP', periodSub(f))];
  slides.push({
    t: 'kpi',
    title: 'Achievement per kelompok',
    sub: periodSub(f),
    kpis: [
      ...KATEGORI_ORDER.map((k) => {
        const s = sumRows(detail.filter((r) => r.kategori === k));
        return { l: k, v: pct(s.ach), s: `${fmt(s.sudah)} dari ${fmt(s.plan)}` };
      }),
      { l: 'Total', v: pct(grand.ach), s: `${fmt(grand.sudah)} dari ${fmt(grand.plan)}` },
    ],
  });
  const cols = ['Distrik', 'Jenis', 'Detail jenis', 'Plan', 'Belum', 'Tanpa temuan', 'Temuan belum FU', 'Temuan sudah FU', 'ACH'];
  KATEGORI_ORDER.forEach((k) => {
    const rows = detail.filter((r) => r.kategori === k);
    if (!rows.length) return;
    const s = sumRows(rows);
    const body = rows.map((r) => [r.distrik, r.jenis, r.detail, fmt(r.plan), fmt(r.belum), fmt(r.tanpa), fmt(r.bfu), fmt(r.fu), pct(r.ach)]);
    body.push(['TOTAL', '', '', fmt(s.plan), fmt(s.belum), fmt(s.tanpa), fmt(s.bfu), fmt(s.fu), pct(s.ach)]);
    slides.push(...tableSlides(`${k}: ${pct(s.ach)}`, cols, body, { sub: periodSub(f), widths: [1.6, 2, 3, 0.8, 0.8, 1, 1.1, 1.1, 0.9] }));
    const dep = perDept.filter((r) => r.kategori === k);
    if (dep.length) {
      slides.push(...tableSlides(`${k}: per dept`, ['Dept', 'Plan', 'Belum', 'Tanpa temuan', 'Temuan belum FU', 'Temuan sudah FU', 'ACH'],
        dep.map((r) => [r.dept || '(kosong)', fmt(r.plan), fmt(r.belum), fmt(r.tanpa), fmt(r.bfu), fmt(r.fu), pct(r.ach)]), { sub: periodSub(f) }));
    }
  });
  return { title: 'Achievement Inspeksi SPIP', slides };
}

function assetFilter(sp, extra = '') {
  const conds = ['a.is_active'];
  const params = [];
  const add = (s, v) => {
    params.push(v);
    conds.push(s.replace('?', `$${params.length}`));
  };
  if (one(sp.d)) add('a.distrik = ?', one(sp.d));
  if (one(sp.p)) add('a.dept = ?', one(sp.p));
  if (one(sp.k)) add('a.kategori = ?', one(sp.k));
  if (one(sp.j)) add('a.jenis = ?', one(sp.j));
  one(sp.q).toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6)
    .forEach((t) => add(`lower(a.kode_aset || ' ' || a.jenis || ' ' || a.detail_jenis || ' ' || a.lokasi${extra}) LIKE ?`, `%${t}%`));
  return { where: `WHERE ${conds.join(' AND ')}`, params };
}

async function mappingDeck(sp) {
  const { where, params } = assetFilter(sp);
  const rows = await db().query(
    `SELECT a.kode_aset, a.kategori, a.jenis, a.detail_jenis, a.lokasi, a.distrik, a.dept, a.periode, a.last_inspection::text AS last
       FROM assets a ${where} ORDER BY a.kategori, a.jenis, a.detail_jenis, a.kode_aset LIMIT 1000`, params);
  const slides = [cover('Mapping Aset SPIP', `${fmt(rows.length)} aset aktif · ${stamp()}`)];
  slides.push(...tableSlides('Mapping detail jenis dan lokasi', ['Kode unit', 'Kelompok', 'Jenis', 'Detail jenis', 'Lokasi', 'Distrik', 'Dept', 'Periode', 'Inspeksi terakhir'],
    rows.map((r) => [r.kode_aset, r.kategori, r.jenis, r.detail_jenis, r.lokasi, r.distrik, r.dept, r.periode, r.last ? fmtDate(r.last) : '–']),
    { widths: [1.3, 1.1, 1.6, 2.3, 2.3, 1.1, 0.9, 0.9, 1.1] }));
  return { title: 'Mapping Aset SPIP', slides };
}

async function riwayatDeck(sp) {
  const today = jakartaToday();
  const thisYear = Number(today.slice(0, 4));
  const yr = parseInt(one(sp.y), 10);
  const year = yr >= 2000 && yr <= thisYear + 1 ? yr : thisYear;
  const { where, params } = assetFilter(sp);
  const rows = await db().query(
    `SELECT a.id, a.kode_aset, a.kategori, a.jenis, a.detail_jenis, a.lokasi, a.last_inspection::text AS last_inspection, a.has_finding
       FROM assets a ${where} ORDER BY a.kategori, a.jenis, a.detail_jenis, a.kode_aset LIMIT 1000`, params);
  const mm = await monthlyMap(rows, year);
  const idx = year === thisYear ? Number(today.slice(5, 7)) - 1 : 11;
  const sym = (v, i) => (v === 2 ? '!' : v === 1 ? '✓' : year === thisYear && i > idx ? '·' : '–');
  const body = rows.map((r) => [r.kode_aset || '–', r.detail_jenis || r.jenis, r.lokasi, ...mm[r.id].map(sym)]);
  const slides = [cover(`Riwayat Inspeksi ${year}`, `${fmt(rows.length)} unit · ✓ sudah, ! temuan, – belum · ${stamp()}`)];
  slides.push(...tableSlides(`Status inspeksi per bulan ${year}`, ['Kode unit', 'Item', 'Lokasi', ...MONTHS], body, { widths: [1.3, 2.6, 2.4, ...Array(12).fill(0.5)] }));
  return { title: `Riwayat Inspeksi ${year}`, slides };
}

async function unitDeck(sp) {
  const slug = one(sp.slug);
  const sql = db();
  const found = await sql`SELECT id, kode_aset, kategori, jenis, detail_jenis, lokasi, distrik, dept, periode, last_inspection::text AS last_inspection, has_finding FROM assets WHERE slug = ${slug}`;
  const a = found[0];
  if (!a) throw new Error('Unit tidak ditemukan');
  const year = Number(jakartaToday().slice(0, 4));
  const [rows, mm] = await Promise.all([
    sql`SELECT kind, inspected_on::text AS d, nrp, inspector_name, template_key, result, items, notes FROM inspections WHERE asset_id = ${a.id} ORDER BY inspected_on DESC, id DESC LIMIT 100`,
    monthlyMap([a], year),
  ]);
  const name = `${a.kode_aset ? `${a.kode_aset} · ` : ''}${a.detail_jenis || a.jenis}`;
  const slides = [cover(`Riwayat Unit: ${name}`, [a.lokasi, a.distrik, a.dept].filter(Boolean).join(' · '))];
  const m = mm[a.id];
  slides.push(...tableSlides(`Status per bulan ${year}`, MONTHS, [m.map((v) => (v === 2 ? '!' : v === 1 ? '✓' : '–'))]));
  slides.push(...tableSlides('Daftar inspeksi dan tindak lanjut', ['Tanggal', 'Jenis', 'Hasil', 'Pemeriksa', 'NRP', 'Checklist'],
    rows.map((r) => [fmtDate(r.d), r.kind === 'followup' ? 'Tindak lanjut' : 'Inspeksi', r.kind === 'followup' ? '–' : r.result === 'temuan' ? 'Temuan' : 'Sesuai', r.inspector_name, r.nrp, (getTemplate(r.template_key) || {}).n || '–']),
    { widths: [1.3, 1.4, 1.1, 3, 1.5, 4] }));
  const tem = [];
  rows.filter((r) => r.kind === 'inspeksi').forEach((r) => (Array.isArray(r.items) ? r.items : []).filter((x) => x.r === 'tem').forEach((x) => tem.push([fmtDate(r.d), x.q, x.n || '', r.inspector_name])));
  if (tem.length) slides.push(...tableSlides('Poin temuan', ['Tanggal', 'Poin', 'Keterangan', 'Pemeriksa'], tem, { widths: [1.2, 5, 4, 2.2], per: 8 }));
  return { title: `Riwayat ${name}`, slides };
}

async function temuanDeck(sp) {
  const f = parseFilters(sp);
  const tp = temuanParams(sp);
  const d = await loadTemuan({ start: f.start, end: f.end, ...tp });
  const sub = periodSub(f);
  const slides = [cover('Laporan Temuan Inspeksi SPIP', sub)];
  slides.push({
    t: 'kpi', title: 'Ringkasan temuan', sub,
    kpis: [
      { l: 'Total temuan', v: fmt(d.total) },
      { l: 'Unit terdampak', v: fmt(d.unitCount) },
      { l: 'Menunggu tindak lanjut', v: fmt(d.menunggu) },
      { l: 'Jenis temuan', v: fmt(d.poinRank.length) },
    ],
  });
  const top = d.poinRank.slice(0, 10);
  if (top.length) {
    slides.push({ t: 'chart', title: '10 temuan terbanyak', sub, labels: top.map((g) => (g.label.length > 38 ? `${g.label.slice(0, 36)}…` : g.label)), series: [{ name: 'Jumlah', values: top.map((g) => g.jumlah) }] });
  }
  slides.push(...tableSlides('Peringkat temuan (jumlah dan keseringan)', ['#', 'Temuan', 'Jumlah', 'Unit', 'Terakhir', 'Menunggu'],
    d.poinRank.map((g) => [g.rank, g.label, g.jumlah, g.unit, fmtDate(g.terakhir), g.menunggu]), { sub, widths: [0.5, 6.5, 1, 1, 1.4, 1.2], per: 10 }));
  slides.push(...tableSlides('Saran pencegahan kecelakaan', ['#', 'Temuan', 'Tindakan segera', 'Pencegahan', 'Dasar regulasi'],
    d.poinRank.slice(0, 20).map((g) => [g.rank, g.label, g.saran.segera, g.saran.cegah, g.saran.dasar]), { sub, widths: [0.4, 2.6, 3.2, 3.4, 2.6], per: 4 }));
  slides.push(...tableSlides('Peringkat jenis aset', ['#', 'Jenis aset', 'Temuan', 'Unit', 'Terakhir'], d.jenisRank.map((g) => [g.rank, g.label, g.jumlah, g.unit, fmtDate(g.terakhir)]), { sub, per: 10 }));
  slides.push(...tableSlides('Peringkat unit', ['#', 'Unit', 'Temuan', 'Terakhir'], d.unitRank.map((g) => [g.rank, g.label, g.jumlah, fmtDate(g.terakhir)]), { sub }));
  slides.push(...tableSlides('Rincian temuan dan pemeriksa', ['Tanggal', 'Kode unit', 'Item', 'Lokasi', 'Temuan', 'Pemeriksa', 'Status'],
    d.detail.slice(0, 300).map((r) => [fmtDate(r.tgl), r.kode_aset || '–', r.detail_jenis || r.jenis, r.lokasi, r.ket ? `${r.poin} (${r.ket})` : r.poin, r.pemeriksa === '–' ? '–' : `${r.pemeriksa} (${r.nrp})`, r.selesai ? 'Sudah FU' : 'Menunggu']),
    { sub, widths: [1.1, 1.2, 1.8, 1.8, 3.6, 2.1, 0.9], per: 8 }));
  return { title: 'Laporan Temuan Inspeksi SPIP', slides };
}

async function qrDeck(sp) {
  const { where, params } = assetFilter(sp);
  const rows = await db().query(
    `SELECT a.slug, a.kategori, a.jenis, a.detail_jenis, a.lokasi, a.kode_aset FROM assets a ${where}
      ORDER BY a.kategori, a.jenis, a.detail_jenis, a.lokasi LIMIT 240`, params);
  const base = baseUrl();
  const items = await Promise.all(rows.map(async (r) => ({
    img: await QRCode.toDataURL(`${base}/i/${r.slug}`, { margin: 1, width: 360, errorCorrectionLevel: 'M' }),
    kode: r.kode_aset || '', name: r.detail_jenis || r.jenis || '', lokasi: r.lokasi || '',
  })));
  const slides = [cover('QR Aset SPIP', `${fmt(items.length)} QR · ${stamp()}`)];
  for (let i = 0; i < items.length; i += 6) slides.push({ t: 'qrs', title: `QR aset (${Math.floor(i / 6) + 1}/${Math.ceil(items.length / 6)})`, items: items.slice(i, i + 6) });
  if (!items.length) slides.push({ t: 'bullets', title: 'QR aset', bullets: ['Tidak ada aset pada filter ini.'] });
  return { title: 'QR Aset SPIP', slides };
}

async function checklistDeck(sp) {
  const key = one(sp.tpl);
  const list = key ? TEMPLATES.filter((t) => t.k === key) : TEMPLATES;
  const slides = [cover('Daftar Checklist Inspeksi SPIP', `${list.length} checklist · ${stamp()}`)];
  list.forEach((t) => {
    const rows = t.q.map((q, i) => [i + 1, q]);
    const ts = tableSlides(t.n, ['No', 'Poin pemeriksaan'], rows, { sub: t.ref ? `Dasar: ${t.ref}` : '', widths: [0.6, 11.4], per: 9 });
    slides.push(...ts);
  });
  return { title: 'Daftar Checklist Inspeksi SPIP', slides };
}

export const DECKS = { dashboard: dashboardDeck, achievement: achievementDeck, mapping: mappingDeck, riwayat: riwayatDeck, unit: unitDeck, temuan: temuanDeck, qr: qrDeck, checklist: checklistDeck };
