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

- **Admin** masuk di `/login` dengan kunci admin: `ADMIN_PASSWORD` (environment variable) atau kata sandi bawaan `kb17161`. Setelah login, admin bisa melihat dashboard, mengimpor Excel, menambah, mengubah, dan menghapus aset di menu Mapping.
- **Selain admin** hanya bisa membuka link inspeksi `/i/<kode>` dan mengisi checklist. Halaman admin dan API admin selalu meminta login.

## Kode aset / kode unit / kode alat

- Isi lewat menu **Mapping** (Tambah aset / Edit) atau kolom **Kode Aset** di Excel (header `Kode Aset`, `Kode Unit`, atau `Kode Alat` juga dikenali).
- Kode tampil di tabel Mapping, label QR, halaman checklist, menu Temuan, dan ekspor Excel. Kolom ini juga bisa dicari.
- Kode ikut membentuk identitas aset, jadi beberapa aset sejenis di lokasi yang sama (mis. 5 APAR di workshop) bisa dibedakan dengan kode berbeda.
- Database lama: kolom dibuat otomatis saat server mulai. Bila gagal, jalankan `db/migrations/002-kode-aset.sql` di SQL Editor Neon.

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
