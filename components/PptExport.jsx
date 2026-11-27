'use client';

import { useState } from 'react';
import { buildPptx } from '@/lib/pptBuild';

const clone = (x) => JSON.parse(JSON.stringify(x));

// Tombol laporan PPT: ambil data -> pratinjau yang bisa diedit -> unduh .pptx.
export default function PptExport({ query = '', label = 'Unduh PPT', className = 'btn' }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [deck, setDeck] = useState(null);
  const [sel, setSel] = useState(0);

  async function start() {
    setErr('');
    setBusy(true);
    setOpen(true);
    setDeck(null);
    try {
      const res = await fetch(`/api/admin/deck${query}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Gagal menyusun laporan');
      setDeck(data);
      setSel(0);
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }

  const upd = (fn) => setDeck((d) => {
    const n = clone(d);
    fn(n);
    return n;
  });
  const cur = deck && deck.slides[sel];

  function move(dir) {
    const j = sel + dir;
    if (!deck || j < 0 || j >= deck.slides.length) return;
    upd((d) => {
      [d.slides[sel], d.slides[j]] = [d.slides[j], d.slides[sel]];
    });
    setSel(j);
  }
  function remove() {
    if (!deck || deck.slides.length <= 1) return;
    upd((d) => d.slides.splice(sel, 1));
    setSel((s) => Math.max(0, s - 1));
  }
  async function download() {
    setErr('');
    setBusy(true);
    try {
      const blob = await buildPptx(deck);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${(deck.title || 'laporan').replace(/[^A-Za-z0-9_-]+/g, '_')}.pptx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (e) {
      setErr(e.message || 'Gagal membuat PPT');
    }
    setBusy(false);
  }

  const setField = (k) => (e) => upd((d) => { d.slides[sel][k] = e.target.value; });
  const setCell = (r, c) => (e) => upd((d) => { d.slides[sel].rows[r][c] = e.target.value; });
  const setCol = (c) => (e) => upd((d) => { d.slides[sel].cols[c] = e.target.value; });
  const delRow = (r) => upd((d) => { d.slides[sel].rows.splice(r, 1); });

  return (
    <>
      <button type="button" className={`${className} noprint`} onClick={start}>{label}</button>
      {open && (
        <div className="pv-back" role="dialog" aria-modal="true" aria-label="Pratinjau PPT">
          <div className="pv-modal">
            <div className="pv-head">
              <b>Pratinjau PPT · edit dulu sebelum diunduh</b>
              <span className="row">
                <button type="button" className="btn primary sm" disabled={!deck || busy} onClick={download}>{busy && deck ? 'Menyusun…' : 'Unduh .pptx'}</button>
                <button type="button" className="btn sm" onClick={() => setOpen(false)}>Tutup</button>
              </span>
            </div>
            {err && <p className="ck-err" role="alert" style={{ margin: 8 }}>{err}</p>}
            {!deck && !err && <p className="muted" style={{ padding: 20 }}>Menyusun laporan…</p>}
            {deck && (
              <div className="pv-body">
                <ol className="pv-list">
                  {deck.slides.map((s, i) => (
                    <li key={i}>
                      <button type="button" className={i === sel ? 'on' : ''} onClick={() => setSel(i)}>
                        <span>{i + 1}</span>{s.title || '(tanpa judul)'}
                      </button>
                    </li>
                  ))}
                </ol>
                {cur && (
                  <div className="pv-edit">
                    <div className="pv-tools">
                      <input className="pv-doc" value={deck.title} onChange={(e) => upd((d) => { d.title = e.target.value; })} aria-label="Nama file" />
                      <button type="button" className="btn sm" onClick={() => move(-1)} disabled={sel === 0}>↑ Naik</button>
                      <button type="button" className="btn sm" onClick={() => move(1)} disabled={sel === deck.slides.length - 1}>↓ Turun</button>
                      <button type="button" className="btn sm" onClick={remove} disabled={deck.slides.length <= 1}>Hapus slide</button>
                    </div>
                    <div className={`pv-slide t-${cur.t}`}>
                      <input className="pv-title" value={cur.title || ''} onChange={setField('title')} aria-label="Judul slide" />
                      {cur.t !== 'cover' || true ? (
                        <input className="pv-sub" value={cur.sub || ''} onChange={setField('sub')} placeholder="Sub judul" aria-label="Sub judul" />
                      ) : null}
                      {cur.t === 'kpi' && (
                        <div className="pv-kpis">
                          {cur.kpis.map((k, i) => (
                            <div key={i}>
                              <input value={k.l} onChange={(e) => upd((d) => { d.slides[sel].kpis[i].l = e.target.value; })} />
                              <input className="big" value={k.v} onChange={(e) => upd((d) => { d.slides[sel].kpis[i].v = e.target.value; })} />
                            </div>
                          ))}
                        </div>
                      )}
                      {cur.t === 'table' && (
                        <div className="tscroll">
                          <table>
                            <thead><tr>{cur.cols.map((c, i) => <th key={i}><input value={c} onChange={setCol(i)} /></th>)}<th /></tr></thead>
                            <tbody>
                              {cur.rows.map((r, ri) => (
                                <tr key={ri}>
                                  {r.map((c, ci) => <td key={ci}><input value={c} onChange={setCell(ri, ci)} /></td>)}
                                  <td><button type="button" className="btn sm" onClick={() => delRow(ri)} aria-label="Hapus baris">×</button></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {cur.t === 'chart' && (
                        <div className="tscroll">
                          <table>
                            <thead><tr><th>Label</th>{cur.series.map((s, i) => <th key={i}>{s.name}</th>)}</tr></thead>
                            <tbody>
                              {cur.labels.map((l, ri) => (
                                <tr key={ri}>
                                  <td><input value={l} onChange={(e) => upd((d) => { d.slides[sel].labels[ri] = e.target.value; })} /></td>
                                  {cur.series.map((s, si) => (
                                    <td key={si}><input inputMode="decimal" value={s.values[ri]} onChange={(e) => upd((d) => { d.slides[sel].series[si].values[ri] = e.target.value; })} /></td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {cur.t === 'qrs' && (
                        <div className="pv-qrs">
                          {cur.items.map((x, i) => (
                            <div key={i}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={x.img} alt="" width="84" height="84" />
                              <span>
                                <input value={x.kode} onChange={(e) => upd((d) => { d.slides[sel].items[i].kode = e.target.value; })} placeholder="Kode" />
                                <input value={x.name} onChange={(e) => upd((d) => { d.slides[sel].items[i].name = e.target.value; })} placeholder="Nama" />
                                <input value={x.lokasi} onChange={(e) => upd((d) => { d.slides[sel].items[i].lokasi = e.target.value; })} placeholder="Lokasi" />
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {cur.t === 'bullets' && (
                        <textarea rows={8} value={(cur.bullets || []).join('\n')} onChange={(e) => upd((d) => { d.slides[sel].bullets = e.target.value.split('\n'); })} />
                      )}
                    </div>
                    <label className="field"><span>Catatan pembicara (opsional)</span><input value={cur.note || ''} onChange={setField('note')} /></label>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
