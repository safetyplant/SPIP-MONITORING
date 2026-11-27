'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

// Unduh QR satu aset sebagai gambar PNG. Sebelum diunduh, teks label bisa diedit di pratinjau.
export default function QrDownload({ url, kode = '', title = '', lokasi = '', kategori = '', slug = '' }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ kode, title, lokasi, foot: 'Scan untuk mengisi checklist inspeksi' });
  const [withText, setWithText] = useState(true);
  const cv = useRef(null);

  useEffect(() => {
    if (!open) return;
    let dead = false;
    (async () => {
      const W = 800;
      const qrSize = 640;
      const H = withText ? 1120 : W;
      const c = cv.current;
      if (!c || dead) return;
      c.width = W;
      c.height = H;
      const g = c.getContext('2d');
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, W, H);
      const qr = document.createElement('canvas');
      await QRCode.toCanvas(qr, url, { width: qrSize, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#073b37', light: '#ffffff' } });
      if (dead) return;
      const qy = withText ? 150 : (W - qrSize) / 2;
      if (withText) {
        g.fillStyle = '#0b7f77';
        g.fillRect(0, 0, W, 110);
        g.fillStyle = '#b7ff1a';
        g.fillRect(0, 110, W, 8);
        g.fillStyle = '#ffffff';
        g.font = '700 38px Arial, sans-serif';
        g.textAlign = 'center';
        g.fillText('SPIP MONITOR', W / 2, 52);
        g.font = '24px Arial, sans-serif';
        g.fillText(kategori ? `Checklist inspeksi · ${kategori}` : 'Checklist inspeksi', W / 2, 90);
      }
      g.drawImage(qr, (W - qrSize) / 2, qy);
      if (withText) {
        g.strokeStyle = '#0b7f77';
        g.lineWidth = 4;
        g.strokeRect(70, qy - 6, W - 140, qrSize + 12);
        g.textAlign = 'center';
        const wrap = (text, y, font, color, max, lh) => {
          g.font = font;
          g.fillStyle = color;
          const words = String(text || '').split(/\s+/);
          let line = '';
          let n = 0;
          for (const w of words) {
            const t = line ? `${line} ${w}` : w;
            if (g.measureText(t).width > max && line) {
              g.fillText(line, W / 2, y + n * lh);
              n += 1;
              line = w;
            } else line = t;
          }
          if (line) {
            g.fillText(line, W / 2, y + n * lh);
            n += 1;
          }
          return y + n * lh;
        };
        let y = qy + qrSize + 56;
        if (f.kode) y = wrap(f.kode, y, '700 44px Arial, sans-serif', '#073b37', W - 100, 50);
        y = wrap(f.title, y + 6, '700 30px Arial, sans-serif', '#111827', W - 100, 38);
        y = wrap(f.lokasi, y + 4, '24px Arial, sans-serif', '#475569', W - 100, 32);
        wrap(f.foot, H - 26, '20px Arial, sans-serif', '#0b7f77', W - 100, 26);
      }
    })();
    return () => {
      dead = true;
    };
  }, [open, f, withText, url, kategori]);

  function download() {
    const c = cv.current;
    if (!c) return;
    c.toBlob((blob) => {
      const a = document.createElement('a');
      const name = (f.kode || slug || 'qr').replace(/[^A-Za-z0-9_-]+/g, '_');
      a.href = URL.createObjectURL(blob);
      a.download = `QR-${name}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }, 'image/png');
  }

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  return (
    <>
      <button type="button" className="btn sm noprint" onClick={() => setOpen(true)}>Unduh PNG</button>
      {open && (
        <div className="pv-back" role="dialog" aria-modal="true" aria-label="Pratinjau QR" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="pv-modal pv-sm">
            <div className="pv-head">
              <b>Pratinjau QR · edit sebelum diunduh</b>
              <button type="button" className="btn sm" onClick={() => setOpen(false)}>Tutup</button>
            </div>
            <div className="pv-qrbody">
              <div className="pv-qrprev"><canvas ref={cv} style={{ width: '100%', height: 'auto' }} /></div>
              <div className="pv-qrform">
                <label className="field"><span>Kode unit</span><input value={f.kode} onChange={set('kode')} /></label>
                <label className="field"><span>Nama item</span><input value={f.title} onChange={set('title')} /></label>
                <label className="field"><span>Lokasi</span><input value={f.lokasi} onChange={set('lokasi')} /></label>
                <label className="field"><span>Teks bawah</span><input value={f.foot} onChange={set('foot')} /></label>
                <label className="row small"><input type="checkbox" checked={withText} onChange={(e) => setWithText(e.target.checked)} /> Sertakan label teks (kosongkan untuk QR saja)</label>
                <button type="button" className="btn primary" onClick={download}>Unduh PNG</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
