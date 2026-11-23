// Form filter berbasis GET, dirender di server (tanpa JavaScript di browser).
function Select({ name, label, value, options }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select name={name} defaultValue={value || ''}>
        <option value="">(Semua)</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

// `full` menambah filter Detail Jenis, Periode, dan Lokasi seperti pada dashboard Tableau.
export default function FilterForm({ f, options, action, period = true, full = false, lastRefresh, children }) {
  return (
    <form className={`card filters${full ? ' tb' : ''}`} method="get" action={action}>
      <div className="filter-grid">
        <Select name="d" label="Distrik" value={f.d} options={options.d} />
        <Select name="p" label="Dept" value={f.p} options={options.p} />
        <Select name="k" label="Kategori SPIP" value={f.k} options={options.k} />
        <Select name="j" label="Jenis" value={f.j} options={options.j} />
        {full && (
          <>
            <Select name="de" label="Detail Jenis" value={f.de} options={options.de || []} />
            <Select name="pr" label="Periode" value={f.pr} options={options.pr || []} />
            <label className="field">
              <span>Lokasi</span>
              <input type="search" name="l" defaultValue={f.l || ''} placeholder="Cari lokasi…" />
            </label>
          </>
        )}
        {period && (
          <>
            <label className="field">
              <span>{full ? 'Start Date' : 'Mulai'}</span>
              <input type="date" name="start" defaultValue={f.start} />
            </label>
            <label className="field">
              <span>{full ? 'End Date' : 'Sampai'}</span>
              <input type="date" name="end" defaultValue={f.end} />
            </label>
          </>
        )}
        {children}
      </div>
      <div className="row">
        <button className="btn primary" type="submit">
          Terapkan
        </button>
        <a className="btn ghost" href={action}>
          Atur ulang
        </a>
        {lastRefresh ? <span className="muted small tb-refresh">Last refresh: {lastRefresh}</span> : null}
      </div>
    </form>
  );
}
