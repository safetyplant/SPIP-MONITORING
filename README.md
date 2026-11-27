# SPIP Monitor

Dashboard SPIP (Ringkasan, Achievement, Mapping, Temuan) dengan checklist per aset. Next.js 14, Neon Postgres, deploy ke Vercel.

- Setiap aset punya link unik `/i/<kode>` dan QR sendiri. Link ini dibuka pemeriksa di lapangan.
- Kolom pemeriksa wajib berisi NRP (4 sampai 15 huruf atau angka), nama, dan tanggal.
- Setiap item SPIP menampilkan kategori **Sarana / Prasarana / Instalasi / Peralatan** beserta keterangannya.
- Data masuk lewat Excel (menu Data & Excel). Setiap aset baru otomatis mendapat link.

## 1. Database (Neon)

1. Buat project di https://neon.tech, salin connection string (`postgresql://...`).
2. Jalankan skema, pilih salah satu:
   - Buka **SQL Editor** di Neon, tempel isi `db/schema.sql`, jalankan.
   - Atau lokal: salin `.env.example` ke `.env.local`, isi `DATABASE_URL`, lalu `npm install && npm run db:setup`.

## 2. GitHub

```bash
git init
git add .
git commit -m "SPIP Monitor"
git branch -M main
git remote add origin https://github.com/<akun>/<repo>.git
git push -u origin main
```

## 3. Vercel

1. **Add New Project**, impor repo GitHub tadi.
2. Isi Environment Variables:

| Nama | Isi |
|---|---|
| `DATABASE_URL` | connection string Neon |
| `ADMIN_PASSWORD` | password login admin |
| `SESSION_SECRET` | teks acak panjang (opsional, bawaannya memakai ADMIN_PASSWORD) |
| `APP_URL` | opsional, mis. `https://spip.perusahaan.com` agar link dan QR memakai domain tetap |

3. Deploy. Buka `/login`, masuk dengan `ADMIN_PASSWORD`.

## 4. Pemakaian

1. **Data & Excel**: unduh template, isi, impor. File ekspor Tableau (tab Mapping Detail Jenis & Lokasi) juga dikenali.
2. **QR**: cetak label QR, tempel di aset.
3. Pemeriksa scan QR, isi NRP dan nama, jawab checklist (Sesuai / Temuan / N/A), kirim.
4. Dashboard otomatis menghitung achievement. Temuan ditindaklanjuti lewat link yang sama atau menu Temuan.
5. **Data & Excel** juga bisa mengunduh data aset beserta link, dan riwayat inspeksi lengkap dengan NRP.

## Akses dan edit data

- **Mapping Detail Jenis & Lokasi terkunci**: buka dengan kata sandi yang sama dengan kata sandi login (berlaku 2 jam, bisa dikunci kembali). Perubahan data aset juga ditolak server bila Mapping masih terkunci.
- **Admin** masuk di `/login` dengan kunci admin: `ADMIN_PASSWORD` (environment variable) atau kata sandi bawaan `kb17161`. Setelah login, admin bisa melihat dashboard, mengimpor Excel, menambah, mengubah, dan menghapus aset di menu Mapping.
- **Selain admin** hanya bisa membuka link inspeksi `/i/<kode>` dan mengisi checklist. Halaman admin dan API admin selalu meminta login.

## Kode unit

- Isi lewat menu **Mapping** (Tambah aset / Edit) atau kolom **Kode Unit** di Excel (header `Kode Aset` atau `Kode Alat` juga dikenali).
- Kode tampil di tabel Mapping, label QR, halaman checklist, menu Temuan, dan ekspor Excel. Kolom ini juga bisa dicari.
- Kode ikut membentuk identitas aset, jadi beberapa aset sejenis di lokasi yang sama (mis. 5 APAR di workshop) bisa dibedakan dengan kode berbeda.
- Database lama: kolom dibuat otomatis saat server mulai. Bila gagal, jalankan `db/migrations/002-kode-aset.sql` di SQL Editor Neon.

## Status per bulan dan riwayat

- Periode bawaan Dashboard dan Achievement adalah **year to date** (1 Januari sampai hari ini) bila tidak ada filter tanggal; tombol Bulan ini / Bulan lalu / Tahun ini ada di bawah filter.
- Unit yang terakhir diinspeksi bulan lalu otomatis berstatus **Belum** pada bulan berjalan (Mapping, checklist, Achievement, Dashboard).
- Achievement dan Dashboard membaca riwayat di tabel `inspections`, jadi angka bulan-bulan lama tidak berubah walau unit sudah diinspeksi lagi bulan berikutnya.
- Menu **Riwayat**: matriks status Januari sampai Desember per kode unit, dan halaman Detail berisi semua inspeksi, pemeriksa, hasil per poin, serta tindak lanjut. Riwayat bulanan juga tampil di halaman checklist (QR).

## Bank checklist

Daftar lengkap ada di menu **Checklist** (bisa diunduh ke Excel beserta dasar regulasinya). Template khusus yang ditambahkan:

| Area | Template |
|---|---|
| TPS Limbah B3 | Kondisi fisik & fasilitas; Dokumen, pencatatan & kepatuhan |
| Pit stop | Area pengisian BBM & servis lapangan |
| Workshop | Kondisi area, K3 & housekeeping; Penyimpanan oli, B3, drum & tabung gas; Dokumen & kepatuhan SMKP |

Dasar acuan yang dipakai: UU 1/1970, PP 22/2021, Permen LHK 6/2021, Permen ESDM 26/2018, Kepmen ESDM 1827.K/30/MEM/2018, Kepdirjen Minerba 185.K/37.04/DJB/2019 (SMKP), serta Permenaker 4/1980, 8/2010, 12/2015, 15/2008, 5/2018, 37/2016, 8/2020. Poin pemeriksaan adalah draf: cocokkan dengan izin lingkungan, persetujuan teknis, SOP/IBPR perusahaan, dan regulasi terbaru, lalu ubah di `lib/checklists.js` bila perlu.

## Logo

Logo KPP Mining, CISS, dan ASTO ada di `public/logos` (kpp.png, ciss.png, asto.png). Ganti file itu untuk mengubah logo.

## Catatan

- Satu password admin bersama, belum per pengguna.
- Link checklist bersifat publik bagi yang tahu link (kode acak, sulit ditebak). Tidak ada pembatasan laju selain validasi NRP, batas tanggal mundur 90 hari, dan penjaga kirim ganda.
- Poin checklist adalah draf. Cocokkan dengan SOP perusahaan di `lib/checklists.js`.
- Kode ditulis tanpa bisa dijalankan di lingkungan pembuatnya. Jalankan `npm install && npm run build` dulu dan perbaiki bila ada error kecil.
- Impor mode "Samakan dengan file" tidak menghapus aset, hanya menandai tidak aktif, sehingga riwayat tetap aman.

## Pembaruan v4

- **Temuan**: tabel bergaris, peringkat dari terbanyak dan tersering, filter tanggal temuan, nama pemeriksa (NRP), dan saran pencegahan kecelakaan otomatis berdasarkan kata kunci temuan (lib/saran.js). Dasar regulasi pada saran adalah acuan awal, cocokkan dengan ketentuan perusahaan.
- **Mapping terkunci**: buka dengan kata sandi yang sama dengan login (berlaku 2 jam, tombol Kunci ulang tersedia). Perubahan data juga ditolak di server bila belum dibuka.
- **Checklist tools baru**: tyre changer, RAD, tyre inflator, jack pneumatic, impact, welding miller, acytelin, grinda tangan, cutting wheel, bor duduk, bor tangan, oven kawat las, rumah kompresor, kompresor udara, tabung kompresor, parit; poin parit juga ada di checklist Workshop.
- **Checklist publik** berbentuk tabel rapat (No, poin, Sesuai, Temuan, N/A).
- **QR**: tombol Unduh PNG per aset dengan pratinjau yang bisa diedit; Unduh semua lewat PPT.
- **PPT**: semua laporan (Dashboard, Achievement, Mapping, Riwayat, Riwayat unit, Temuan, QR, Daftar checklist) punya tombol PPT. Klik, edit di pratinjau (judul, isi sel, hapus/urut slide), lalu Unduh .pptx. Pustaka pptxgenjs ada di public/vendor (tidak perlu npm).
- **Achievement** tanpa filter tanggal otomatis year to date.
