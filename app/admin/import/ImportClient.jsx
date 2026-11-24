'use client';

import { useState } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { resolveKategori } from '@/lib/spip';

/* ---------- pembacaan Excel ---------- */
const pad = (n) => String(n).padStart(2, '0');

const COLS = {
  distrik: ['distrik', 'district'],
  dept: ['dept', 'departemen', 'department', 'divisi'],
  kategori: ['kategorispip', 'kategori'],
  jenis: ['jenis'],
  detail_jenis: ['detailjenis', 'detail'],
  lokasi: ['lokasi', 'location'],
  kode_aset: ['kodeunit', 'kodeaset', 'kodealat', 'kode', 'noaset', 'nounit', 'assetcode', 'codenumber', 'cn'],
  periode: ['periode', 'frekuensi'],
  start_date: ['startdate', 'tglmulai', 'mulai'],
  end_date: ['enddate', 'tglakhir', 'akhir'],
  is_active: ['isactive', 'aktif', 'active'],
  is_plan: ['isplan', 'plan'],
  first_inspection: ['firstinspection', 'inspeksipertama'],
  last_inspection: ['lastinspection', 'inspeksiterakhir'],
  has_finding: ['adatemuan', 'temuan'],
  followed_up: ['sudahfollowup', 'followup'],
};
const LABELS = {
  distrik: 'Distrik', dept: 'Dept', kategori: 'Kategori SPIP', jenis: 'Jenis', detail_jenis: 'Detail Jenis', lokasi: 'Lokasi',
  kode_aset: 'Kode Unit',
  periode: 'Periode', start_date: 'Start Date', end_date: 'End Date', is_active: 'Is Active', is_plan: 'Is Plan',
  first_inspection: 'First Inspection', last_inspection: 'Last Inspection', has_finding: 'Ada Temuan', followed_up: 'Sudah Follow Up',
};

const norm = (h) => String(h).toLowerCase().replace(/[^a-z0-9]/g, '');

function mapHeader(h) {
  const n = norm(h);
  if (!n) return null;
  for (const f of Object.keys(COLS)) {
    if (COLS[f].some((a) => n === a || (a.length >= 10 && n.indexOf(a) === 0))) return f;
  }
  return null;
}

function toIso(v) {
  if (v === '' || v == null) return '';
  if (typeof v === 'number') {
    if (v > 20000 && v < 80000) {
      const d = new Date(Math.round((v - 25569) * 864e5));
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    }
    return '';
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
  if (m) return `${m[3]}-${pad(+m[2])}-${pad(+m[1])}`;
  return '';
}

const YES = ['1', 'true', 'ya', 'y', 'yes', 'active', 'aktif', 'plan', 'v', 'ok', '✓', '✔'];
function toBool(v, present, def) {
  if (!present) return def;
  if (v === '' || v == null) return false;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'boolean') return v;
  return YES.indexOf(String(v).trim().toLowerCase()) >= 0;
}

const txt = (v) => (v == null ? '' : String(v).trim());

function parseBook(buf, fileName) {
  const wb = XLSX.read(buf, { type: 'array' });
  let best = null;
  wb.SheetNames.forEach((sn) => {
    const aoa = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: true, defval: '' });
    for (let r = 0; r < Math.min(15, aoa.length); r++) {
      const idx = {};
      let n = 0;
      aoa[r].forEach((h, c) => {
        const f = mapHeader(h);
        if (f && idx[f] == null) {
          idx[f] = c;
          n++;
        }
      });
      if (n >= 3 && (idx.detail_jenis != null || idx.jenis != null || idx.lokasi != null)) {
        if (!best || n > best.n) best = { sn, aoa, row: r, idx, n };
        break;
      }
    }
  });
  if (!best) throw new Error('Header kolom tidak dikenali. Gunakan template impor.');

  const { idx } = best;
  const rows = [];
  const seen = new Map();
  let skipped = 0;
  for (let i = best.row + 1; i < best.aoa.length; i++) {
    const line = best.aoa[i];
    const g = (f) => (idx[f] == null ? '' : line[idx[f]]);
    const detail = txt(g('detail_jenis'));
    const jenis = txt(g('jenis'));
    const lokasi = txt(g('lokasi'));
    if (!detail && !jenis && !lokasi) {
      skipped++;
      continue;
    }
    if (/^(grand )?total$/i.test(detail || jenis || lokasi) || /^(grand )?total$/i.test(txt(g('distrik')))) {
      skipped++;
      continue;
    }
    const kategori = resolveKategori(g('kategori'), jenis, detail);
    const distrik = txt(g('distrik'));
    const kode = txt(g('kode_aset'));
    const key = [distrik, kategori, jenis, detail, lokasi, ...(kode ? [kode] : [])].join('|').toLowerCase();
    const seq = (seen.get(key) || 0) + 1;
    seen.set(key, seq);

    const last = toIso(g('last_inspection'));
    const hasFinding = last && idx.has_finding != null ? toBool(g('has_finding'), true, false) : false;
    rows.push({
      seq,
      distrik,
      dept: txt(g('dept')),
      kategori,
      jenis,
      detail_jenis: detail,
      lokasi,
      kode_aset: kode,
      periode: txt(g('periode')),
      start_date: toIso(g('start_date')),
      end_date: toIso(g('end_date')),
      is_active: toBool(g('is_active'), idx.is_active != null, true),
      is_plan: toBool(g('is_plan'), idx.is_plan != null, true),
      first_inspection: toIso(g('first_inspection')) || last,
      last_inspection: last,
      has_finding: hasFinding,
      followed_up: hasFinding && idx.followed_up != null ? toBool(g('followed_up'), true, false) : false,
    });
  }
  const missing = Object.keys(LABELS).filter((f) => f !== 'kode_aset' && idx[f] == null).map((f) => LABELS[f]);
  const dup = rows.filter((r) => r.seq > 1).length;
  return { name: fileName, sheet: best.sn, rows, skipped, missing, dup };
}

/* ---------- komponen ---------- */
const CHUNK = 300;

async function post(body) {
  const res = await fetch('/api/admin/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Server menolak permintaan (${res.status})`);
  return data;
}

export default function ImportClient() {
  const [info, setInfo] = useState(null);
  const [mode, setMode] = useState('merge');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  function onFile(e) {
    const f = e.target.files && e.target.files[0];
    setError('');
    setResult(null);
    setInfo(null);
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        setInfo(parseBook(new Uint8Array(rd.result), f.name));
      } catch (err) {
        setError(err.message || 'File tidak bisa dibaca.');
      }
    };
    rd.onerror = () => setError('File tidak bisa dibaca.');
    rd.readAsArrayBuffer(f);
  }

  async function run() {
    if (!info || busy) return;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const { batch } = await post({ action: 'start' });
      let done = 0;
      for (let i = 0; i < info.rows.length; i += CHUNK) {
        await post({ action: 'rows', batch, rows: info.rows.slice(i, i + CHUNK) });
        done = Math.min(info.rows.length, i + CHUNK);
        setProgress(`Menyimpan ${done.toLocaleString('id-ID')} dari ${info.rows.length.toLocaleString('id-ID')} baris…`);
      }
      const fin = await post({ action: 'finish', batch, mode });
      setResult({ count: info.rows.length, ...fin });
      setInfo(null);
    } catch (err) {
      setError(err.message || 'Impor gagal.');
    }
    setProgress('');
    setBusy(false);
  }

  return (
    <div className="import">
      <input type="file" accept=".xlsx,.xls,.csv" onChange={onFile} disabled={busy} />

      {error && <p className="form-error" role="alert">{error}</p>}

      {info && (
        <div className="stack">
          <div className="notice">
            <b>{info.name}</b>: {info.rows.length.toLocaleString('id-ID')} baris aset terbaca dari sheet &quot;{info.sheet}&quot;.
            {info.missing.length > 0 && <div>Kolom tidak ditemukan (dikosongkan): {info.missing.join(', ')}.</div>}
            {info.skipped > 0 && <div>{info.skipped} baris dilewati (kosong atau baris total).</div>}
            {info.dup > 0 && <div>{info.dup} baris kembar (Distrik, Kategori, Jenis, Detail, dan Lokasi sama) disimpan sebagai aset terpisah.</div>}
          </div>

          <fieldset className="radios">
            <label>
              <input type="radio" name="mode" checked={mode === 'merge'} onChange={() => setMode('merge')} />
              <span><b>Tambah dan perbarui</b>: aset yang sudah ada diperbarui, aset lain tetap.</span>
            </label>
            <label>
              <input type="radio" name="mode" checked={mode === 'replace'} onChange={() => setMode('replace')} />
              <span><b>Samakan dengan file</b>: aset yang tidak ada di file ditandai tidak aktif. Riwayat inspeksi tetap tersimpan.</span>
            </label>
          </fieldset>

          <div className="tscroll">
            <table>
              <thead>
                <tr>
                  <th className="l">Kategori</th>
                  <th className="l">Distrik</th>
                  <th className="l">Dept</th>
                  <th className="l">Jenis</th>
                  <th className="l">Detail jenis</th>
                  <th className="l">Lokasi</th>
                  <th className="l">Kode unit</th>
                  <th>Periode</th>
                  <th>Inspeksi terakhir</th>
                </tr>
              </thead>
              <tbody>
                {info.rows.slice(0, 5).map((r, i) => (
                  <tr key={i}>
                    <td className="l">{r.kategori}</td>
                    <td className="l">{r.distrik}</td>
                    <td className="l">{r.dept}</td>
                    <td className="l">{r.jenis}</td>
                    <td className="l">{r.detail_jenis}</td>
                    <td className="l">{r.lokasi}</td>
                    <td className="l">{r.kode_aset || '–'}</td>
                    <td>{r.periode}</td>
                    <td>{r.last_inspection || '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="row">
            <button type="button" className="btn primary" onClick={run} disabled={busy}>
              {busy ? 'Mengimpor…' : 'Impor ke database'}
            </button>
            {progress && <span className="muted small">{progress}</span>}
          </div>
        </div>
      )}

      {result && (
        <div className="notice ok">
          Impor selesai: {result.count.toLocaleString('id-ID')} baris diproses, {result.active.toLocaleString('id-ID')} aset aktif.
          {result.deactivated > 0 && <> {result.deactivated.toLocaleString('id-ID')} aset ditandai tidak aktif.</>}{' '}
          <Link href="/admin/mapping">Lihat mapping</Link> atau <Link href="/admin/qr">cetak QR</Link>.
        </div>
      )}
    </div>
  );
}
