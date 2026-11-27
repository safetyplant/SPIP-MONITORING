// Saran pencegahan kecelakaan otomatis dari teks poin temuan. Berbasis aturan (kata kunci), bukan AI,
// jadi hasilnya konsisten. Dasar yang disebut adalah acuan umum: cocokkan dengan SOP, izin, dan regulasi terbaru perusahaan.
// Urutan penting: aturan yang lebih spesifik ditaruh di atas.
const RULES = [
  { re: /apar|pemadam|tabung pemadam|fire extinguisher/, segera: 'Ganti atau isi ulang APAR yang bermasalah dan pasang APAR pengganti sementara.', cegah: 'Periksa APAR tiap bulan (segel, tekanan zona hijau, tagging), pasang pada tinggi dan jarak yang sesuai, dan latih personel memakainya.', dasar: 'Permenaker 4/1980 (APAR)' },
  { re: /p3k|first aid/, segera: 'Lengkapi isi kotak P3K dan ganti yang kedaluwarsa.', cegah: 'Tunjuk petugas P3K, periksa isi kotak tiap bulan, dan pasang daftar nomor darurat.', dasar: 'Permenaker 15/2008 (P3K)' },
  { re: /eyewash|emergency shower|pencuci mata|shower darurat/, segera: 'Perbaiki aliran eyewash / shower dan bebaskan akses dari penghalang.', cegah: 'Uji fungsi tiap minggu, catat hasil uji, dan pastikan jarak jangkau tidak lebih dari 10 detik dari area bahaya kimia.', dasar: 'Kepmenaker 187/MEN/1999 dan SDS bahan' },
  { re: /spill kit|absorben|tumpahan|tumpah|rembes|bocor oli|ceceran/, segera: 'Bersihkan tumpahan dengan absorben, kumpulkan sebagai limbah B3, dan tutup sumber kebocoran.', cegah: 'Sediakan spill kit lengkap di titik risiko, pasang drip tray / secondary containment, dan latih simulasi tumpahan.', dasar: 'Permen LHK 6/2021 (Limbah B3)' },
  { re: /limbah|b3|\btps\b|simbol|logbook|neraca|manifest|drum limbah|label limbah/, segera: 'Pasang simbol dan label limbah B3 yang benar, rapikan dan pisahkan limbah menurut karakteristik.', cegah: 'Lengkapi logbook / neraca dan manifest, patuhi batas waktu penyimpanan pada izin, serahkan hanya ke pengangkut dan pengolah berizin.', dasar: 'PP 22/2021 dan Permen LHK 6/2021' },
  { re: /sling|shackle|hook|kait|chain ?block|hoist|crane|alat angkat|swl|rigging|lifting|webbing|webing/, segera: 'Tarik alat angkat dari pemakaian (tag out) sampai diperbaiki atau diuji ulang.', cegah: 'Inspeksi sebelum pakai, tagging periode berjalan, jangan melebihi SWL, pastikan operator dan rigger kompeten dan bersertifikat.', dasar: 'Permenaker 8/2020 (Pesawat Angkat dan Angkut)' },
  { re: /tabung|regulator|flashback|asetilen|acetylene|acytelin|oksigen|oxygen|lpg|selang gas/, segera: 'Hentikan pemakaian bila ada kebocoran gas, ikat / rantai tabung, dan pasang tutup pengaman.', cegah: 'Uji kebocoran dengan air sabun, pisahkan tabung penuh dan kosong serta oksigen dan asetilena, dan pasang flashback arrestor.', dasar: 'Permenaker 37/2016 (Bejana Tekan dan Tangki Timbun)' },
  { re: /kompresor|receiver|safety valve|manometer|bejana|tangki udara|drain/, segera: 'Hentikan kompresor bila safety valve atau manometer rusak, lalu perbaiki sebelum dioperasikan.', cegah: 'Buang kondensat berkala, uji safety valve dan manometer sesuai jadwal, dan pastikan pemeriksaan serta izin bejana tekan berlaku.', dasar: 'Permenaker 37/2016 (Bejana Tekan dan Tangki Timbun)' },
  { re: /kabel|steker|stop kontak|panel|elcb|mcb|pembumian|grounding|earth|listrik|loto|gembok|tagout|tag out|sambungan/, segera: 'Putuskan sumber listrik dan kunci (LOTO) sebelum perbaikan, ganti kabel / steker yang rusak.', cegah: 'Pasang ELCB dan pembumian, tutup panel, lakukan inspeksi listrik berkala, dan pekerjaan listrik hanya oleh personel berkompetensi.', dasar: 'Permenaker 12/2015 (K3 Listrik)' },
  { re: /guard|pelindung|emergency stop|e-stop|safety switch|mesin|\bbor\b|gerinda|grinda|grinder|cutting wheel|disc|mata (bor|gerinda)|impact|bubut/, segera: 'Hentikan mesin / alat sampai guard dan tombol darurat terpasang dan berfungsi.', cegah: 'Pasang guard lengkap, periksa mata gerinda / bor sebelum pakai, wajibkan APD (kacamata, sarung tangan, earplug), dan terapkan SOP penggunaan alat.', dasar: 'Permenaker 38/2016 (Pesawat Tenaga dan Produksi) dan Permenaker 8/2010 (APD)' },
  { re: /\blas\b|welding|miller|elektroda|kawat las|oven kawat|kerja panas|hot work|percikan/, segera: 'Hentikan kerja panas, singkirkan bahan mudah terbakar, dan sediakan APAR di lokasi.', cegah: 'Gunakan izin kerja panas, pelindung percikan, juru las bersertifikat, dan simpan kawat las kering pada oven sesuai suhu.', dasar: 'Permenaker 2/1982 (Juru Las) dan SMKP Minerba' },
  { re: /jack|\bstand\b|ganjal|wheel chock|chock|penopang|\bban\b|tyre|velg|\brim\b|inflator|tekanan angin|tire/, segera: 'Jangan bekerja di bawah unit yang hanya ditopang jack; pasang jack stand / ganjal yang layak.', cegah: 'Gunakan tire cage / pelindung saat mengisi angin, regulator dan gauge terkalibrasi, serta SOP pergantian ban dengan LOTO.', dasar: 'SMKP Minerba (Permen ESDM 26/2018)' },
  { re: /apd|sepatu|helm|kacamata|sarung tangan|earplug|masker|respirator|rompi|apron/, segera: 'Sediakan atau ganti APD yang rusak / hilang dan hentikan pekerjaan tanpa APD.', cegah: 'Wajibkan APD sesuai area dan bahaya, sediakan stasiun APD, dan lakukan safety talk / P5M rutin.', dasar: 'Permenaker 8/2010 (APD)' },
  { re: /parit|drainase|saluran air|selokan|\bgot\b|genangan/, segera: 'Bersihkan sedimen dan sampah pada parit, pasang penutup / grating atau pagar pengaman di area terbuka.', cegah: 'Jadwalkan pembersihan parit rutin, pastikan kemiringan aliran lancar, beri marka dan rambu agar tidak ada risiko jatuh atau tergelincir.', dasar: 'Permen ESDM 26/2018 dan SMKP Minerba' },
  { re: /lantai|licin|oli|berminyak|housekeeping|5r|berserakan|kotor|sampah/, segera: 'Bersihkan lantai dari oli / genangan dan rapikan barang yang berserakan.', cegah: 'Terapkan 5R, pasang absorben dan drip tray pada sumber kebocoran, serta beri rambu lantai licin.', dasar: 'UU 1/1970 dan Permenaker 5/2018' },
  { re: /penerangan|lampu|pencahayaan|lux|gelap/, segera: 'Ganti lampu yang mati dan tambah penerangan pada area gelap.', cegah: 'Ukur pencahayaan berkala dan pastikan memenuhi persyaratan area kerja.', dasar: 'Permenaker 5/2018 (K3 Lingkungan Kerja)' },
  { re: /bising|kebisingan|noise|dba/, segera: 'Wajibkan earplug / earmuff di area bising dan pasang rambu.', cegah: 'Ukur kebisingan berkala, kendalikan sumber (peredam, perawatan), dan batasi durasi paparan di atas NAB.', dasar: 'Permenaker 5/2018 (NAB 85 dBA / 8 jam)' },
  { re: /ventilasi|exhaust|asap|debu|uap|udara/, segera: 'Aktifkan atau perbaiki exhaust / ventilasi dan hentikan pekerjaan penghasil asap sampai udara layak.', cegah: 'Perawatan exhaust berkala, gunakan masker / respirator yang sesuai, dan pantau kualitas udara kerja.', dasar: 'Permenaker 5/2018 (K3 Lingkungan Kerja)' },
  { re: /jalur evakuasi|pintu darurat|titik kumpul|evakuasi|denah/, segera: 'Singkirkan penghalang jalur dan pintu darurat serta pasang rambu / denah yang jelas.', cegah: 'Lakukan simulasi evakuasi berkala dan inspeksi jalur evakuasi mingguan.', dasar: 'Permen PU 26/2008 (Proteksi Kebakaran Gedung)' },
  { re: /rambu|marka|tagging|\btag\b|color code|identifikasi|label|papan|penanda/, segera: 'Pasang rambu / label / tagging yang hilang atau tidak terbaca.', cegah: 'Terapkan color code periode berjalan, cek rambu saat inspeksi rutin, dan standarkan simbol K3.', dasar: 'UU 1/1970 dan SMKP Minerba' },
  { re: /bbm|solar|fuel|nozzle|selang|dispenser|bonding|pit ?stop|tangki timbun/, segera: 'Hentikan pengisian bila ada kebocoran, perbaiki nozzle / selang, dan bersihkan BBM yang tumpah.', cegah: 'Pastikan grounding dan bonding terpasang, mesin unit mati saat pengisian, emergency shutoff berfungsi, dan spill kit tersedia.', dasar: 'Permenaker 37/2016 dan SMKP Minerba' },
  { re: /sertifikat|izin|sio|kompetensi|kalibrasi|dokumen|\blog\b|catatan|belum diuji|uji ulang/, segera: 'Lengkapi atau perpanjang dokumen / sertifikat dan hentikan pemakaian alat yang masa ujinya habis.', cegah: 'Buat jadwal pengingat masa berlaku sertifikat dan kalibrasi serta tunjuk penanggung jawab dokumen.', dasar: 'Permenaker 8/2020 dan SMKP Minerba' },
  { re: /hilang|lost|tidak lengkap|kurang|rusak|broken|retak|bengkok|aus|berjamur|longgar|patah|pecah/, segera: 'Pisahkan dan tag-out perkakas / komponen rusak, lalu ganti atau perbaiki.', cegah: 'Inspeksi sebelum pakai, simpan perkakas pada tempatnya dengan daftar inventaris, dan catat serah terima tiap shift.', dasar: 'UU 1/1970 dan SMKP Minerba' },
];

const GENERIC = {
  segera: 'Amankan area, tag-out peralatan yang berbahaya, dan tetapkan tindakan perbaikan sementara.',
  cegah: 'Tetapkan penanggung jawab dan batas waktu perbaikan, bahas pada safety talk / P5M, verifikasi hasil perbaikan, dan tinjau IBPR / HIRADC terkait.',
  dasar: 'UU 1/1970 dan SMKP Minerba (Permen ESDM 26/2018)',
};

// Mengembalikan { segera, cegah, dasar } untuk satu poin temuan. `konteks` (jenis / detail) ikut dicocokkan.
export function saranFor(poin, keterangan = '', konteks = '') {
  const text = `${poin} ${keterangan}`.toLowerCase();
  const ctx = String(konteks || '').toLowerCase();
  let hit = RULES.find((r) => r.re.test(text));
  if (!hit) hit = RULES.find((r) => r.re.test(ctx));
  return hit ? { segera: hit.segera, cegah: hit.cegah, dasar: hit.dasar } : GENERIC;
}

export const saranText = (poin, ket, ctx) => {
  const s = saranFor(poin, ket, ctx);
  return `${s.segera} ${s.cegah}`;
};
