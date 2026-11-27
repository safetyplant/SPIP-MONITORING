// Menyusun file .pptx di browser dari data slide (setelah diedit di pratinjau). Memakai pptxgenjs dari /vendor (UMD).
const C = { teal: '0B7F77', deep: '073B37', lime: 'B7FF1A', grid: '9BBDB6', zebra: 'EEF7F5', text: '1F2937', muted: '64748B' };
const W = 13.33;

function loadLib() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Hanya di browser'));
  if (window.PptxGenJS) return Promise.resolve(window.PptxGenJS);
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = '/vendor/pptxgen.bundle.js';
    s.onload = () => (window.PptxGenJS ? res(window.PptxGenJS) : rej(new Error('Pustaka PPT tidak termuat')));
    s.onerror = () => rej(new Error('Gagal memuat pustaka PPT'));
    document.head.appendChild(s);
  });
}

function frame(pptx, slide, title, sub, n, total) {
  slide.background = { color: 'FFFFFF' };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.95, fill: { color: C.teal }, line: { color: C.teal } });
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0.95, w: W, h: 0.07, fill: { color: C.lime }, line: { color: C.lime } });
  slide.addText(title || '', { x: 0.45, y: 0.1, w: W - 0.9, h: 0.75, fontFace: 'Calibri', fontSize: 24, bold: true, color: 'FFFFFF', valign: 'middle', fit: 'shrink' });
  if (sub) slide.addText(sub, { x: 0.45, y: 1.1, w: W - 0.9, h: 0.35, fontFace: 'Calibri', fontSize: 11, color: C.muted, fit: 'shrink' });
  slide.addText('SPIP Monitor', { x: 0.45, y: 7.1, w: 4, h: 0.3, fontSize: 9, color: C.muted, fontFace: 'Calibri' });
  slide.addText(`${n} / ${total}`, { x: W - 1.95, y: 7.1, w: 1.5, h: 0.3, fontSize: 9, color: C.muted, align: 'right', fontFace: 'Calibri' });
}

function colWidths(cols, rows, widths, total) {
  let w = widths && widths.length === cols.length ? widths.slice() : cols.map((c, i) => {
    const longest = Math.max(String(c).length * 0.8, ...rows.map((r) => Math.min(String(r[i] ?? '').length, 60)));
    return Math.max(longest, 3);
  });
  const sum = w.reduce((a, b) => a + b, 0) || 1;
  w = w.map((x) => (x / sum) * total);
  return w;
}

export async function buildPptx(deck) {
  const Lib = await loadLib();
  const pptx = new Lib();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = deck.title || 'Laporan SPIP';
  pptx.author = 'SPIP Monitor';
  const total = deck.slides.length;

  deck.slides.forEach((sd, idx) => {
    const slide = pptx.addSlide();
    const n = idx + 1;
    if (sd.t === 'cover') {
      slide.background = { color: C.deep };
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.35, h: 7.5, fill: { color: C.lime }, line: { color: C.lime } });
      slide.addShape(pptx.ShapeType.rect, { x: 0.9, y: 4.0, w: 3.2, h: 0.08, fill: { color: C.lime }, line: { color: C.lime } });
      slide.addText('SPIP MONITOR', { x: 0.9, y: 1.2, w: 11, h: 0.5, fontSize: 16, bold: true, color: C.lime, charSpacing: 6, fontFace: 'Calibri' });
      slide.addText(sd.title || '', { x: 0.9, y: 1.9, w: 11.5, h: 2, fontSize: 42, bold: true, color: 'FFFFFF', fontFace: 'Calibri', valign: 'top', fit: 'shrink' });
      slide.addText(sd.sub || '', { x: 0.9, y: 4.25, w: 11.5, h: 0.9, fontSize: 18, color: 'CFE9E5', fontFace: 'Calibri', valign: 'top', fit: 'shrink' });
      return;
    }
    frame(pptx, slide, sd.title, sd.sub, n, total);

    if (sd.t === 'kpi') {
      const k = sd.kpis || [];
      const perRow = k.length <= 4 ? k.length || 1 : 3;
      const cw = (W - 0.9 - (perRow - 1) * 0.3) / perRow;
      k.forEach((x, i) => {
        const col = i % perRow;
        const row = Math.floor(i / perRow);
        const px = 0.45 + col * (cw + 0.3);
        const py = 1.8 + row * 2.45;
        slide.addShape(pptx.ShapeType.rect, { x: px, y: py, w: cw, h: 2.2, fill: { color: C.zebra }, line: { color: C.grid, width: 1 } });
        slide.addShape(pptx.ShapeType.rect, { x: px, y: py, w: 0.12, h: 2.2, fill: { color: C.teal }, line: { color: C.teal } });
        slide.addText(String(x.l || ''), { x: px + 0.3, y: py + 0.15, w: cw - 0.4, h: 0.5, fontSize: 14, color: C.muted, fontFace: 'Calibri', fit: 'shrink' });
        slide.addText(String(x.v ?? ''), { x: px + 0.3, y: py + 0.7, w: cw - 0.4, h: 0.9, fontSize: 36, bold: true, color: C.deep, fontFace: 'Calibri', fit: 'shrink' });
        if (x.s) slide.addText(String(x.s), { x: px + 0.3, y: py + 1.62, w: cw - 0.4, h: 0.4, fontSize: 12, color: C.muted, fontFace: 'Calibri', fit: 'shrink' });
      });
    } else if (sd.t === 'table') {
      const cols = sd.cols || [];
      const rows = sd.rows || [];
      const fs = cols.length > 10 ? 10 : cols.length > 6 ? 11 : 13;
      const border = { type: 'solid', pt: 0.75, color: C.grid };
      const head = cols.map((c) => ({ text: String(c), options: { bold: true, color: 'FFFFFF', fill: { color: C.teal }, align: 'center', valign: 'middle', border, fontSize: fs } }));
      const short = cols.map((_, i) => rows.every((r) => String(r[i] ?? '').length <= 4));
      const body = rows.map((r, ri) => r.map((c, ci) => ({ text: String(c ?? ''), options: { align: short[ci] ? 'center' : 'left', color: C.text, fill: { color: ri % 2 ? C.zebra : 'FFFFFF' }, valign: 'middle', border, fontSize: fs } })));
      const w = colWidths(cols, rows, sd.widths, W - 0.9);
      slide.addTable([head, ...body], { x: 0.45, y: sd.sub ? 1.55 : 1.3, w: W - 0.9, colW: w, rowH: Math.max(0.32, Math.min(0.62, 5.4 / (rows.length + 1))), fontFace: 'Calibri', margin: [0.04, 0.07, 0.04, 0.07], autoPage: false });
    } else if (sd.t === 'chart') {
      const data = (sd.series || []).map((s) => ({ name: s.name, labels: sd.labels, values: s.values.map((v) => Number(v) || 0) }));
      slide.addChart(pptx.charts.BAR, data, {
        x: 0.45, y: 1.55, w: W - 0.9, h: 5.4, barDir: 'col', barGrouping: 'clustered',
        chartColors: ['0B7F77', 'B7FF1A', 'F59E0B', '64748B'].slice(0, Math.max(data.length, 1)),
        showLegend: data.length > 1, legendPos: 'b', legendFontSize: 11,
        showValue: true, dataLabelFontSize: 9, dataLabelColor: C.text,
        catAxisLabelFontSize: 10, valAxisLabelFontSize: 10, valGridLine: { color: 'E2E8F0', size: 0.5 },
      });
    } else if (sd.t === 'qrs') {
      const it = sd.items || [];
      const cw = 4.0;
      it.forEach((x, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const px = 0.45 + col * (cw + 0.15);
        const py = 1.3 + row * 2.85;
        slide.addShape(pptx.ShapeType.rect, { x: px, y: py, w: cw, h: 2.7, fill: { color: 'FFFFFF' }, line: { color: C.grid, width: 1 } });
        slide.addImage({ data: x.img, x: px + 0.1, y: py + 0.1, w: 2.5, h: 2.5 });
        slide.addText(String(x.kode || ''), { x: px + 2.65, y: py + 0.15, w: cw - 2.75, h: 0.5, fontSize: 14, bold: true, color: C.deep, fontFace: 'Calibri', fit: 'shrink' });
        slide.addText(String(x.name || ''), { x: px + 2.65, y: py + 0.7, w: cw - 2.75, h: 1.0, fontSize: 11, bold: true, color: C.text, fontFace: 'Calibri', valign: 'top', fit: 'shrink' });
        slide.addText(String(x.lokasi || ''), { x: px + 2.65, y: py + 1.75, w: cw - 2.75, h: 0.8, fontSize: 10, color: C.muted, fontFace: 'Calibri', valign: 'top', fit: 'shrink' });
      });
    } else {
      const b = (sd.bullets || []).filter((x) => String(x).trim());
      slide.addText(b.map((t) => ({ text: String(t), options: { bullet: true, breakLine: true } })), { x: 0.6, y: 1.6, w: W - 1.2, h: 5.2, fontSize: 20, color: C.text, fontFace: 'Calibri', valign: 'top', paraSpaceAfter: 10, fit: 'shrink' });
    }
    if (sd.note) slide.addNotes(String(sd.note));
  });

  return pptx.write({ outputType: 'blob' });
}
