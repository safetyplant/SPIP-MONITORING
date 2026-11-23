'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const KATS = ['Sarana', 'Prasarana', 'Instalasi', 'Peralatan'];
const PERIODES = ['Weekly', 'Monthly', 'Every 3 Months', 'Every 6 Months', 'Yearly'];

async function call(body) {
  const res = await fetch('/api/admin/edit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(data.error || `Gagal (${res.status})`);
    e.status = res.status;
    throw e;
  }
  return data;
}

const EMPTY = {
  kategori: '', distrik: '', dept: '', jenis: '', detail_jenis: '', lokasi: '', periode: '',
  start_date: '', end_date: '', is_active: true, is_plan: true, last_inspection: '', has_finding: false, followed_up: false,
};

function Dl({ id, items }) {
  return (
    <datalist id={id}>
      {(items || []).map((o) => <option key={o} value={o} />)}
    </datalist>
  );
}

function Form({ asset, options, onClose }) {
  const router = useRouter();
  const [v, setV] = useState({ ...EMPTY, ...Object.fromEntries(Object.entries(asset || {}).map(([k, x]) => [k, x ?? EMPTY[k] ?? ''])) });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function run(fn) {
    setBusy(true);
    setErr('');
    try {
      await fn();
      router.refresh();
      onClose();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }

  const save = (e) => {
    e.preventDefault();
    run(() => call({ action: 'save', slug: asset ? asset.slug : '', asset: v }));
  };
  const del = () => run(() => call({ action: 'delete', slug: asset.slug }));

  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-label={asset ? 'Edit aset' : 'Tambah aset'}>
      <form className="modal" onSubmit={save}>
        <h2>{asset ? 'Edit aset' : 'Tambah aset'}</h2>
        {asset && (
          <p className="small muted">
            Link checklist (bisa dibuka tanpa login):{' '}
            <a href={`/i/${asset.slug}`} target="_blank" rel="noreferrer">{`${typeof window !== 'undefined' ? window.location.origin : ''}/i/${asset.slug}`}</a>
          </p>
        )}
        <div className="form-grid">
          <label className="field">
            <span>Kategori SPIP</span>
            <select value={v.kategori} onChange={set('kategori')}>
              <option value="">(Otomatis dari jenis)</option>
              {KATS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <label className="field"><span>Distrik</span><input list="dl-d" value={v.distrik} onChange={set('distrik')} maxLength={80} /></label>
          <label className="field"><span>Dept</span><input list="dl-p" value={v.dept} onChange={set('dept')} maxLength={80} /></label>
          <label className="field"><span>Jenis</span><input list="dl-j" value={v.jenis} onChange={set('jenis')} /></label>
          <label className="field wide"><span>Detail jenis</span><input list="dl-de" value={v.detail_jenis} onChange={set('detail_jenis')} /></label>
          <label className="field wide"><span>Lokasi</span><input value={v.lokasi} onChange={set('lokasi')} /></label>
          <label className="field"><span>Periode</span><input list="dl-pr" value={v.periode} onChange={set('periode')} maxLength={40} /></label>
          <label className="field"><span>Inspeksi terakhir</span><input type="date" value={v.last_inspection} onChange={set('last_inspection')} /></label>
          <label className="field"><span>Start date</span><input type="date" value={v.start_date} onChange={set('start_date')} /></label>
          <label className="field"><span>End date</span><input type="date" value={v.end_date} onChange={set('end_date')} /></label>
        </div>
        <div className="row chk">
          <label><input type="checkbox" checked={v.is_active} onChange={set('is_active')} /> Aktif</label>
          <label><input type="checkbox" checked={v.is_plan} onChange={set('is_plan')} /> Plan</label>
          <label><input type="checkbox" checked={v.has_finding} onChange={set('has_finding')} disabled={!v.last_inspection} /> Ada temuan</label>
          <label><input type="checkbox" checked={v.followed_up} onChange={set('followed_up')} disabled={!v.has_finding} /> Sudah follow up</label>
        </div>
        <Dl id="dl-d" items={options.d} />
        <Dl id="dl-p" items={options.p} />
        <Dl id="dl-j" items={options.j} />
        <Dl id="dl-de" items={options.de} />
        <Dl id="dl-pr" items={[...new Set([...PERIODES, ...(options.pr || [])])]} />

        {err && <p className="form-error" role="alert">{err}</p>}

        <div className="row spread">
          <div className="row">
            <button className="btn primary" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</button>
            <button type="button" className="btn" onClick={onClose} disabled={busy}>Batal</button>
          </div>
          {asset && !confirmDel && (
            <button type="button" className="btn ghost danger" onClick={() => setConfirmDel(true)} disabled={busy}>Hapus</button>
          )}
          {asset && confirmDel && (
            <span className="row">
              <span className="small">Riwayat inspeksi ikut terhapus. Yakin?</span>
              <button type="button" className="btn danger" onClick={del} disabled={busy}>Ya, hapus</button>
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

// Bilah di atas tabel: tambah aset baru. Hanya admin yang bisa membuka halaman ini.
export function EditBar({ options }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="lockbar open">
      <span>Tambah atau ubah data aset langsung di sini.</span>
      <button type="button" className="btn sm primary" onClick={() => setAdding(true)}>Tambah aset</button>
      {adding && <Form asset={null} options={options} onClose={() => setAdding(false)} />}
    </div>
  );
}

export function RowEdit({ asset, options }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn sm" onClick={() => setOpen(true)}>Edit</button>
      {open && <Form asset={asset} options={options} onClose={() => setOpen(false)} />}
    </>
  );
}
