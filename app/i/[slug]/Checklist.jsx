'use client';

import { useEffect, useMemo, useState } from 'react';
import Logos from '@/components/Logos';
import { MONTHS } from '@/lib/format';

/* ---------- ikon ---------- */
const Svg = ({ children, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const IcCheck = () => <Svg><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>;
const IcAlert = () => <Svg><path d="M12 4l9 16H3L12 4z" /><path d="M12 10v4" /><path d="M12 17.2v.1" /></Svg>;
const IcMinus = () => <Svg><path d="M6 12h12" /></Svg>;
const IcPin = () => <Svg size={16}><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></Svg>;
const KAT_ICON = {
  sarana: () => <Svg size={22}><path d="M4 20V8l8-4 8 4v12" /><path d="M9 20v-6h6v6" /></Svg>,
  prasarana: () => <Svg size={22}><path d="M8 3l-3 18" /><path d="M16 3l3 18" /><path d="M12 6v2" /><path d="M12 12v2" /><path d="M12 18v2" /></Svg>,
  instalasi: () => <Svg size={22}><path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z" /></Svg>,
  peralatan: () => <Svg size={22}><path d="M14.5 6.5a4 4 0 0 0-5 5L4 17l3 3 5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-2-.5-.5-2 2.5-2.5z" /></Svg>,
};

const OPTS = [
  { v: 'ok', label: 'Sesuai', Icon: IcCheck },
  { v: 'tem', label: 'Temuan', Icon: IcAlert },
  { v: 'na', label: 'N/A', Icon: IcMinus },
];

const fmtDate = (s) => {
  if (!s) return '–';
  const [y, m, d] = s.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

function Item({ i, q, val, note, onPick, onNote }) {
  return (
    <>
      <tr id={`ck-q-${i}`} className={`ck-row${val ? ` is-${val}` : ''}`}>
        <td className="ck-c-no">{i + 1}</td>
        <td className="ck-c-q">{q}</td>
        {OPTS.map(({ v, label, Icon }) => (
          <td key={v} className="ck-c-opt">
            <button
              type="button"
              role="radio"
              aria-checked={val === v}
              aria-label={`${label}, poin ${i + 1}`}
              className={`ck-opt ${v}${val === v ? ' on' : ''}`}
              onClick={() => onPick(i, v)}
            >
              <Icon />
            </button>
          </td>
        ))}
      </tr>
      {val === 'tem' && (
        <tr className="ck-row-note">
          <td className="ck-c-no" />
          <td colSpan={4}>
            <textarea
              className="ck-note"
              rows={2}
              maxLength={500}
              placeholder="Jelaskan temuan: apa, di mana, dan seberapa parah"
              value={note || ''}
              onChange={(e) => onNote(i, e.target.value)}
            />
          </td>
        </tr>
      )}
    </>
  );
}

export default function Checklist({ asset, kat, tplKey, templates, history, months, year, findings, hasOpenFinding, today, minDate }) {
  const [tk, setTk] = useState(tplKey);
  const tpl = useMemo(() => templates.find((t) => t.key === tk) || templates[0], [tk, templates]);
  const [ans, setAns] = useState({});
  const [nrp, setNrp] = useState('');
  const [name, setName] = useState('');
  const [date, setDate] = useState(today);
  const [memo, setMemo] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  const [fuOpen, setFuOpen] = useState(false);
  const [fuNote, setFuNote] = useState('');
  const [fuBusy, setFuBusy] = useState(false);
  const [fuDone, setFuDone] = useState(false);
  const [fuErr, setFuErr] = useState('');

  useEffect(() => {
    try {
      setNrp(localStorage.getItem('spip_nrp') || '');
      setName(localStorage.getItem('spip_name') || '');
    } catch {}
  }, []);

  const total = tpl.items.length;
  const answered = tpl.items.filter((_, i) => ans[i] && ans[i].r).length;
  const temCount = tpl.items.filter((_, i) => ans[i] && ans[i].r === 'tem').length;
  const pctDone = total ? Math.round((answered / total) * 100) : 0;
  const KatIcon = KAT_ICON[kat.key] || KAT_ICON.peralatan;

  const pick = (i, v) => setAns((a) => ({ ...a, [i]: { ...(a[i] || {}), r: v } }));
  const note = (i, n) => setAns((a) => ({ ...a, [i]: { ...(a[i] || {}), n } }));
  const allOk = () =>
    setAns((a) => {
      const next = { ...a };
      tpl.items.forEach((_, i) => {
        if (!next[i] || !next[i].r) next[i] = { ...(next[i] || {}), r: 'ok' };
      });
      return next;
    });

  function fail(msg, id) {
    setErr(msg);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function remember(n, nm) {
    try {
      localStorage.setItem('spip_nrp', n);
      localStorage.setItem('spip_name', nm);
    } catch {}
  }

  async function submit() {
    setErr('');
    const cleanNrp = nrp.trim().toUpperCase();
    if (!/^[A-Z0-9]{4,15}$/.test(cleanNrp)) return fail('NRP wajib diisi: 4 sampai 15 huruf atau angka, tanpa spasi.', 'ck-who');
    if (name.trim().length < 2) return fail('Nama pemeriksa wajib diisi.', 'ck-who');
    const missing = tpl.items.findIndex((_, i) => !(ans[i] && ans[i].r));
    if (missing >= 0) return fail(`Masih ada ${total - answered} poin yang belum dijawab.`, `ck-q-${missing}`);
    const noNote = tpl.items.findIndex((_, i) => ans[i].r === 'tem' && (ans[i].n || '').trim().length < 3);
    if (noNote >= 0) return fail('Jelaskan setiap poin yang berstatus Temuan.', `ck-q-${noNote}`);

    setBusy(true);
    try {
      const res = await fetch(`/api/i/${asset.slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nrp: cleanNrp,
          name: name.trim(),
          date,
          tpl: tpl.key,
          items: tpl.items.map((_, i) => ({ r: ans[i].r, n: (ans[i].n || '').trim() })),
          notes: memo.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || 'Gagal menyimpan. Coba lagi.');
        setBusy(false);
        return;
      }
      remember(cleanNrp, name.trim());
      setDone({ nrp: cleanNrp, name: name.trim(), date, hasil: data.hasil, tem: data.temuan });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setErr('Tidak bisa terhubung. Periksa sinyal lalu coba lagi.');
    }
    setBusy(false);
  }

  async function submitFollowup() {
    setFuErr('');
    const cleanNrp = nrp.trim().toUpperCase();
    if (!/^[A-Z0-9]{4,15}$/.test(cleanNrp) || name.trim().length < 2) {
      setFuErr('Isi NRP dan nama pemeriksa pada bagian Pemeriksa di bawah terlebih dahulu.');
      document.getElementById('ck-who')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (fuNote.trim().length < 5) return setFuErr('Jelaskan tindakan perbaikan yang sudah dilakukan.');
    setFuBusy(true);
    try {
      const res = await fetch(`/api/i/${asset.slug}/followup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nrp: cleanNrp, name: name.trim(), note: fuNote.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setFuErr(data.error || 'Gagal menyimpan.');
      else {
        remember(cleanNrp, name.trim());
        setFuDone(true);
      }
    } catch {
      setFuErr('Tidak bisa terhubung. Coba lagi.');
    }
    setFuBusy(false);
  }

  function again() {
    setDone(null);
    setAns({});
    setMemo('');
    setErr('');
    window.scrollTo({ top: 0 });
  }

  const thisMonth = asset.last && asset.last.slice(0, 7) === today.slice(0, 7);
  const status = thisMonth
    ? `Sudah diinspeksi bulan ini (${fmtDate(asset.last)})`
    : asset.last
      ? `Belum diinspeksi bulan ini · terakhir ${fmtDate(asset.last)}`
      : 'Belum pernah diinspeksi';

  return (
    <div className={`ck-page kat-${kat.key}`}>
      <header className="ck-hero">
        <div className="ck-wrap">
          <Logos size="sm" />
          <p className="ck-eyebrow">SPIP Monitor · Checklist inspeksi</p>
          <div className="ck-katchip">
            <span className="ck-katicon"><KatIcon /></span>
            <span>
              <b>{kat.label}</b>
              <em>{kat.short}</em>
            </span>
          </div>
          {asset.kode ? <p className="ck-kode"><span>Kode unit</span><b>{asset.kode}</b></p> : null}
          <h1 className="ck-title">{asset.detail || asset.jenis}</h1>
          <p className="ck-loc"><IcPin /> {asset.lokasi || asset.distrik || 'Lokasi belum diisi'}</p>

          <div className="ck-keterangan">
            <b>Keterangan {kat.label}</b>
            <p>{kat.desc}</p>
          </div>

          <table className="ck-info">
            <tbody>
              <tr><th>Distrik</th><td>{asset.distrik || '–'}</td><th>Dept</th><td>{asset.dept || '–'}</td></tr>
              <tr><th>Jenis</th><td>{asset.jenis || '–'}</td><th>Periode</th><td>{asset.periode || '–'}</td></tr>
            </tbody>
          </table>
          <p className={`ck-status ${thisMonth ? 'is-done' : 'is-todo'}`}>{status}</p>
        </div>
      </header>

      <main className="ck-wrap ck-main">
        {!asset.active && (
          <div className="ck-banner warn">Aset ini ditandai tidak aktif. Hubungi admin SPIP bila link ini masih perlu dipakai.</div>
        )}

        {done ? (
          <section className="ck-done">
            <div className={`ck-doneicon ${done.hasil === 'temuan' ? 'tem' : 'ok'}`}>
              {done.hasil === 'temuan' ? <IcAlert /> : <IcCheck />}
            </div>
            <h2>{done.hasil === 'temuan' ? 'Inspeksi tersimpan dengan temuan' : 'Inspeksi tersimpan'}</h2>
            <p className="muted">
              {done.hasil === 'temuan'
                ? `${done.tem} poin temuan tercatat dan menunggu tindak lanjut.`
                : 'Semua poin yang diperiksa sesuai.'}
            </p>
            <dl className="ck-summary">
              <div><dt>Aset</dt><dd>{asset.kode ? `${asset.kode} · ` : ''}{asset.detail || asset.jenis}</dd></div>
              <div><dt>Tanggal</dt><dd>{fmtDate(done.date)}</dd></div>
              <div><dt>Pemeriksa</dt><dd>{done.name} · NRP {done.nrp}</dd></div>
              <div><dt>Checklist</dt><dd>{tpl.name}</dd></div>
            </dl>
            <button type="button" className="ck-btn ghost" onClick={again}>Isi inspeksi lagi</button>
          </section>
        ) : (
          <>
            {hasOpenFinding && !fuDone && (
              <section className="ck-banner amber">
                <div className="ck-banner-h">
                  <IcAlert />
                  <b>Ada temuan sebelumnya yang belum ditindaklanjuti</b>
                </div>
                {findings.length > 0 && (
                  <ul>
                    {findings.map((f, i) => (
                      <li key={i}><span>{f.q}</span><em>{f.n || 'Tanpa keterangan'}</em></li>
                    ))}
                  </ul>
                )}
                {!fuOpen ? (
                  <button type="button" className="ck-btn small" onClick={() => setFuOpen(true)}>Catat tindak lanjut</button>
                ) : (
                  <div className="ck-fu">
                    <textarea
                      rows={3}
                      maxLength={500}
                      placeholder="Tindakan perbaikan yang sudah dilakukan"
                      value={fuNote}
                      onChange={(e) => setFuNote(e.target.value)}
                    />
                    {fuErr && <p className="ck-err" role="alert">{fuErr}</p>}
                    <button type="button" className="ck-btn small" disabled={fuBusy} onClick={submitFollowup}>
                      {fuBusy ? 'Menyimpan…' : 'Simpan tindak lanjut'}
                    </button>
                  </div>
                )}
              </section>
            )}
            {fuDone && <div className="ck-banner ok">Tindak lanjut tercatat. Terima kasih.</div>}

            {asset.active && (
              <>
                <section id="ck-who" className="ck-card">
                  <h2 className="ck-h2">Pemeriksa</h2>
                  <div className="ck-grid2">
                    <label className="ck-field">
                      <span>NRP</span>
                      <input
                        inputMode="text"
                        autoCapitalize="characters"
                        autoComplete="off"
                        placeholder="mis. 12345678"
                        value={nrp}
                        onChange={(e) => setNrp(e.target.value.toUpperCase().replace(/\s/g, ''))}
                        maxLength={15}
                      />
                    </label>
                    <label className="ck-field">
                      <span>Nama pemeriksa</span>
                      <input autoComplete="name" placeholder="Nama lengkap" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
                    </label>
                    <label className="ck-field">
                      <span>Tanggal inspeksi</span>
                      <input type="date" value={date} min={minDate} max={today} onChange={(e) => setDate(e.target.value)} />
                    </label>
                    <label className="ck-field">
                      <span>Jenis checklist</span>
                      <select
                        value={tk}
                        onChange={(e) => {
                          setTk(e.target.value);
                          setAns({});
                        }}
                      >
                        {templates.map((t) => (
                          <option key={t.key} value={t.key}>{t.name}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </section>

                <section className="ck-card">
                  <div className="ck-list-h">
                    <div>
                      <h2 className="ck-h2">{tpl.name}</h2>
                      {tpl.ref ? <p className="ck-ref"><b>Dasar:</b> {tpl.ref}</p> : null}
                      <p className="muted small">{answered} dari {total} poin dijawab{temCount ? ` · ${temCount} temuan` : ''}</p>
                    </div>
                    <button type="button" className="ck-link" onClick={allOk}>Isi sisanya Sesuai</button>
                  </div>
                  <div className="ck-progress" aria-hidden="true"><i style={{ width: `${pctDone}%` }} /></div>
                  <div className="ck-tbl-wrap">
                    <table className="ck-tbl">
                      <thead>
                        <tr>
                          <th className="ck-c-no">No</th>
                          <th className="ck-c-q">Poin pemeriksaan</th>
                          <th className="ck-c-opt ok">Sesuai</th>
                          <th className="ck-c-opt tem">Temuan</th>
                          <th className="ck-c-opt na">N/A</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tpl.items.map((q, i) => (
                          <Item key={`${tpl.key}-${i}`} i={i} q={q} val={ans[i] && ans[i].r} note={ans[i] && ans[i].n} onPick={pick} onNote={note} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="ck-card">
                  <label className="ck-field">
                    <span>Catatan umum (opsional)</span>
                    <textarea rows={3} maxLength={500} placeholder="Catatan tambahan untuk inspeksi ini" value={memo} onChange={(e) => setMemo(e.target.value)} />
                  </label>
                </section>

                <section className="ck-card ck-riwayat">
                  <h2 className="ck-h2">Riwayat inspeksi {year}</h2>
                  <ol className="ck-months" aria-label={`Status inspeksi per bulan tahun ${year}`}>
                    {MONTHS.map((m, i) => {
                      const v = months[i];
                      const future = year === Number(today.slice(0, 4)) && i > Number(today.slice(5, 7)) - 1;
                      const cls = v === 2 ? 'tem' : v === 1 ? 'ok' : future ? 'fut' : 'no';
                      return (
                        <li key={m} className={`m-${cls}`} title={v === 2 ? 'Ada temuan' : v === 1 ? 'Sudah diinspeksi' : future ? 'Belum waktunya' : 'Belum diinspeksi'}>
                          <span>{m}</span>
                          <b>{v === 2 ? '!' : v === 1 ? '✓' : future ? '·' : '–'}</b>
                        </li>
                      );
                    })}
                  </ol>
                  {history.length > 0 ? (
                    <p className="ck-history">
                      Terakhir: {history.map((h) => `${fmtDate(h.date)} (${h.result === 'temuan' ? 'ada temuan' : 'sesuai'})`).join(' · ')}
                    </p>
                  ) : (
                    <p className="ck-history">Belum ada riwayat inspeksi yang tersimpan lewat aplikasi.</p>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </main>

      {!done && asset.active && (
        <div className="ck-bar">
          <div className="ck-bar-in">
            <div className="ck-bar-info">
              {err ? <span className="ck-err" role="alert">{err}</span> : (
                <>
                  <b>{answered}/{total}</b>
                  <span>poin dijawab</span>
                </>
              )}
            </div>
            <button type="button" className="ck-btn" disabled={busy} onClick={submit}>
              {busy ? 'Menyimpan…' : 'Kirim inspeksi'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
