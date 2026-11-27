import Link from 'next/link';
import FilterForm from '@/components/FilterForm';
import KatBadge from '@/components/KatBadge';
import PptExport from '@/components/PptExport';
import { filterOptions, parseFilters } from '@/lib/stats';
import { loadTemuan, temuanParams } from '@/lib/temuan';
import { fmtDate } from '@/lib/format';
import { qs } from '@/lib/qs';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
export const metadata = { title: 'Temuan' };

const PAGE = 40;
const one = (v) => (Array.isArray(v) ? v[0] : v) || '';

function Bar({ v, max }) {
  return <span className="rk-bar"><i style={{ width: `${Math.max(4, Math.round((v / (max || 1)) * 100))}%` }} /></span>;
}

export default async function Page({ searchParams }) {
  const sp = searchParams || {};
  const f = parseFilters(sp); // periode bawaan: year to date
  const tp = temuanParams(sp);
  const page = Math.max(1, parseInt(one(sp.page), 10) || 1);
  const [options, data] = await Promise.all([filterOptions(), loadTemuan({ start: f.start, end: f.end, ...tp, k: f.k || tp.k, j: f.j || tp.j, d: f.d || tp.d })]);

  const pages = Math.max(1, Math.ceil(data.detail.length / PAGE));
  const rows = data.detail.slice((page - 1) * PAGE, page * PAGE);
  const top = data.poinRank.slice(0, 15);
  const maxP = top[0]?.jumlah || 1;
  const keep = { start: f.start, end: f.end, k: f.k, j: f.j, d: f.d, st: tp.st, q: tp.q };
  const deckQuery = qs({ type: 'temuan', ...keep });

  return (
    <>
      <div className="page-h">
        <div className="row spread">
          <div>
            <h1>Temuan inspeksi</h1>
            <p className="muted">
              Peringkat temuan dari yang terbanyak dan tersering, periode {fmtDate(f.start)} s/d {fmtDate(f.end)} (bawaan: year to date). Saran pencegahan disusun otomatis dari isi temuan.
            </p>
          </div>
          <PptExport query={deckQuery} label="Pratinjau & unduh PPT" />
        </div>
      </div>

      <FilterForm f={f} options={options} action="/admin/temuan">
        <label className="field">
          <span>Status</span>
          <select name="st" defaultValue={tp.st}>
            <option value="">Semua</option>
            <option value="menunggu">Menunggu tindak lanjut</option>
            <option value="selesai">Sudah ditindaklanjuti</option>
          </select>
        </label>
        <label className="field">
          <span>Cari</span>
          <input type="search" name="q" defaultValue={tp.q} placeholder="pemeriksa, kode unit, poin…" />
        </label>
      </FilterForm>

      <section className="kpis">
        <div className="tile" style={{ '--tc': 'var(--c-tem)' }}><div className="tile-l">Total temuan</div><div className="tile-v">{data.total.toLocaleString('id-ID')}</div><div className="tile-s">poin berstatus Temuan</div></div>
        <div className="tile" style={{ '--tc': 'var(--teal)' }}><div className="tile-l">Unit terdampak</div><div className="tile-v">{data.unitCount.toLocaleString('id-ID')}</div><div className="tile-s">kode unit / item berbeda</div></div>
        <div className="tile" style={{ '--tc': 'var(--c-belum)' }}><div className="tile-l">Menunggu tindak lanjut</div><div className="tile-v">{data.menunggu.toLocaleString('id-ID')}</div><div className="tile-s">{data.total - data.menunggu} sudah ditindaklanjuti</div></div>
        <div className="tile" style={{ '--tc': 'var(--lime-2)' }}><div className="tile-l">Temuan teratas</div><div className="tile-v tile-v-sm">{top[0] ? top[0].label : '–'}</div><div className="tile-s">{top[0] ? `${top[0].jumlah}× di ${top[0].unit} unit` : ''}</div></div>
      </section>

      {!data.total && <div className="card empty"><p className="muted">Tidak ada temuan pada periode dan filter ini.</p></div>}

      {data.total > 0 && (
        <>
          <h2 className="sec">Peringkat poin temuan (terbanyak dan tersering)</h2>
          <div className="tscroll">
            <table className="gt-fit">
              <thead>
                <tr>
                  <th className="no">Peringkat</th>
                  <th className="l">Poin temuan</th>
                  <th>Jumlah temuan</th>
                  <th>Unit terdampak</th>
                  <th>Menunggu</th>
                  <th>Terakhir</th>
                  <th className="l">Saran pencegahan kecelakaan (otomatis)</th>
                  <th className="l">Dasar regulasi</th>
                </tr>
              </thead>
              <tbody>
                {top.map((g) => (
                  <tr key={g.key}>
                    <td className="no">{g.rank}</td>
                    <td className="l"><b>{g.label}</b></td>
                    <td className="rk-cell"><b>{g.jumlah}</b><Bar v={g.jumlah} max={maxP} /></td>
                    <td>{g.unit}</td>
                    <td>{g.menunggu}</td>
                    <td className="nowrap">{fmtDate(g.terakhir)}</td>
                    <td className="l saran"><b>Segera:</b> {g.saran.segera}<br /><b>Pencegahan:</b> {g.saran.cegah}</td>
                    <td className="l small">{g.saran.dasar}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rk-two">
            <div>
              <h2 className="sec">Peringkat jenis / detail jenis</h2>
              <div className="tscroll">
                <table className="gt-fit">
                  <thead><tr><th className="no">No</th><th className="l">Jenis (kategori)</th><th>Jumlah temuan</th><th>Unit</th><th>Terakhir</th></tr></thead>
                  <tbody>
                    {data.jenisRank.slice(0, 10).map((g) => (
                      <tr key={g.key}><td className="no">{g.rank}</td><td className="l">{g.label}</td><td><b>{g.jumlah}</b></td><td>{g.unit}</td><td className="nowrap">{fmtDate(g.terakhir)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h2 className="sec">Unit paling sering temuan</h2>
              <div className="tscroll">
                <table className="gt-fit">
                  <thead><tr><th className="no">No</th><th className="l">Kode unit · item</th><th>Jumlah temuan</th><th>Menunggu</th><th>Terakhir</th></tr></thead>
                  <tbody>
                    {data.unitRank.slice(0, 10).map((g) => (
                      <tr key={g.key}><td className="no">{g.rank}</td><td className="l"><Link href={`/admin/riwayat/${g.key}`}>{g.label}</Link></td><td><b>{g.jumlah}</b></td><td>{g.menunggu}</td><td className="nowrap">{fmtDate(g.terakhir)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <h2 className="sec">Daftar temuan ({data.detail.length.toLocaleString('id-ID')})</h2>
          <div className="tscroll">
            <table className="gt-fit">
              <thead>
                <tr>
                  <th className="no">No</th>
                  <th className="l">Tanggal temuan</th>
                  <th className="l">Kode unit</th>
                  <th className="l">Item</th>
                  <th className="l">Lokasi</th>
                  <th className="l">Poin temuan</th>
                  <th className="l">Keterangan</th>
                  <th className="l">Pemeriksa</th>
                  <th>Peringkat · frekuensi</th>
                  <th>Status</th>
                  <th className="l">Saran pencegahan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.slug}-${r.tgl}-${i}-${r.poin}`}>
                    <td className="no">{(page - 1) * PAGE + i + 1}</td>
                    <td className="l nowrap">{fmtDate(r.tgl)}</td>
                    <td className="l nowrap"><b>{r.kode_aset || '–'}</b></td>
                    <td className="l"><KatBadge kategori={r.kategori} /> <span className="cellname">{r.detail_jenis || r.jenis}</span></td>
                    <td className="l">{r.lokasi}</td>
                    <td className="l">{r.poin}</td>
                    <td className="l">{r.ket || '–'}</td>
                    <td className="l"><b>{r.pemeriksa}</b>{r.nrp && r.nrp !== '–' ? <><br /><span className="muted small">NRP {r.nrp}</span></> : null}</td>
                    <td className="nowrap">#{r.rank} · {r.frek}×</td>
                    <td><span className={`pill ${r.selesai ? 'ok' : 'warn'}`}>{r.selesai ? 'Selesai' : 'Menunggu'}</span></td>
                    <td className="l saran small">{r.saran.segera} {r.saran.cegah} <span className="muted">({r.saran.dasar})</span></td>
                    <td className="nowrap"><Link className="btn sm" href={`/i/${r.slug}`} target="_blank">Buka</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pager">
            {page > 1 ? <Link className="btn" href={`/admin/temuan${qs({ ...keep, page: page - 1 })}`}>Sebelumnya</Link> : <span />}
            <span className="muted small">Halaman {page} dari {pages}</span>
            {page < pages ? <Link className="btn" href={`/admin/temuan${qs({ ...keep, page: page + 1 })}`}>Berikutnya</Link> : <span />}
          </div>
        </>
      )}
      <p className="muted small">Saran dibuat otomatis berdasarkan kata kunci pada isi temuan dan mengacu pada regulasi umum (UU 1/1970, Permen ESDM 26/2018, Permenaker terkait). Cocokkan dengan SOP, IBPR, dan regulasi terbaru perusahaan sebelum dipakai sebagai keputusan resmi.</p>
    </>
  );
}
