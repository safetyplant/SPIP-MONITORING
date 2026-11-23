'use client';

export default function PrintButton({ label = 'Cetak halaman' }) {
  return (
    <button type="button" className="btn" onClick={() => window.print()}>
      {label}
    </button>
  );
}
