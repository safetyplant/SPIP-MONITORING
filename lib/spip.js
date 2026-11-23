// Empat kategori SPIP beserta keterangannya. Dipakai sebagai badge dan keterangan di setiap item.
export const KATEGORI = {
  Sarana: {
    key: 'sarana',
    label: 'Sarana',
    short: 'Bangunan dan fasilitas',
    desc: 'Fasilitas berupa bangunan, seperti kantor, pos, workshop, warehouse, klinik, mess, gudang, dan fuel station, yang menjadi aset dan memiliki risiko A atau AA yang dapat menimbulkan insiden.',
  },
  Prasarana: {
    key: 'prasarana',
    label: 'Prasarana',
    short: 'Fasilitas non-bangunan',
    desc: 'Fasilitas non-bangunan, seperti jalan tambang (mining road dan hauling road), stockpile, jembatan, oil trap, washing pod, area parkir, rest area, dan pit stop, yang memiliki risiko A atau AA yang dapat menimbulkan insiden.',
  },
  Instalasi: {
    key: 'instalasi',
    label: 'Instalasi',
    short: 'Rangkaian alat satu kesatuan',
    desc: 'Rangkaian alat yang menjadi satu kesatuan fungsi, seperti instalasi listrik, pneumatik atau hydraulic, bahan bakar cair, air, komunikasi, proteksi kebakaran, dan gas, yang menjadi aset dan memiliki risiko A atau AA yang dapat menimbulkan insiden.',
  },
  Peralatan: {
    key: 'peralatan',
    label: 'Peralatan',
    short: 'Alat dan unit operasional',
    desc: 'Alat bergerak dan tidak bergerak serta alat bantu kerja yang dipakai dalam operasional, seperti alat berat, kendaraan, pesawat angkat, genset, kompresor, perkakas tangan, dan peralatan listrik, yang menjadi aset dan memiliki risiko A atau AA yang dapat menimbulkan insiden.',
  },
};

export const KATEGORI_ORDER = ['Sarana', 'Prasarana', 'Instalasi', 'Peralatan'];

// Mengembalikan salah satu dari empat kategori, atau '' bila tidak dikenali.
export function normKategori(s) {
  const l = String(s || '').toLowerCase();
  if (l.includes('prasarana')) return 'Prasarana';
  if (l.includes('sarana')) return 'Sarana';
  if (l.includes('instal')) return 'Instalasi';
  if (l.includes('peralatan')) return 'Peralatan';
  return '';
}

// Dipakai bila kolom kategori di Excel kosong.
export function inferKategori(jenis, detail) {
  const t = `${detail || ''} ${jenis || ''}`.toLowerCase();
  if (/jalan|road|haul|stockpile|jembatan|parkir|parking|rest area|pit stop|simpang|oil trap|washing|front loading|prasarana/.test(t)) return 'Prasarana';
  if (/kantor|office|workshop|warehouse|gudang|mess|klinik|kantin|bangunan|ibadah|\bpos\b|fuel station|sarana/.test(t)) return 'Sarana';
  if (/instalasi|panel|jaringan|petir|hydrant|fire alarm|conveyor|ipal|wtp|wwtp|pneumat|hydraulic|pelumas|grease/.test(t)) return 'Instalasi';
  return 'Peralatan';
}

export function resolveKategori(kategori, jenis, detail) {
  return normKategori(kategori) || inferKategori(jenis, detail);
}

export function katMeta(kategori) {
  return KATEGORI[normKategori(kategori)] || null;
}
