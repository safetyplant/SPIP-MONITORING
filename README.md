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
| `EDIT_PASSWORD` | opsional, kata sandi edit data. Bila kosong, memakai bawaan `kb17161` |
| `SESSION_SECRET` | teks acak panjang (opsional, bawaannya memakai ADMIN_PASSWORD) |
| `APP_URL` | opsional, mis. `https://spip.perusahaan.com` agar link dan QR memakai domain tetap |

3. Deploy. Buka `/login`, masuk dengan `ADMIN_PASSWORD`.

## 4. Pemakaian

1. **Data & Excel**: unduh template, isi, impor. File ekspor Tableau (tab Mapping Detail Jenis & Lokasi) juga dikenali.
2. **QR**: cetak label QR, tempel di aset.
3. Pemeriksa scan QR, isi NRP dan nama, jawab checklist (Sesuai / Temuan / N/A), kirim.
4. Dashboard otomatis menghitung achievement. Temuan ditindaklanjuti lewat link yang sama atau menu Temuan.
5. **Data & Excel** juga bisa mengunduh data aset beserta link, dan riwayat inspeksi lengkap dengan NRP.

## Edit data langsung

Di menu **Mapping Detail Jenis & Lokasi**, klik **Buka kunci** lalu masukkan `EDIT_PASSWORD`. Setelah terbuka (berlaku 2 jam) muncul tombol **Tambah aset** dan **Edit** di tiap baris, termasuk hapus aset. Tanpa kata sandi itu, data hanya bisa dilihat. Kata sandi edit bawaan adalah `kb17161`. Untuk mengganti, isi `EDIT_PASSWORD` di Environment Variables hosting.

## Logo

Logo KPP Mining, CISS, dan ASTO ada di `public/logos` (kpp.png, ciss.png, asto.png). Ganti file itu untuk mengubah logo.

## Catatan

- Satu password admin bersama, belum per pengguna.
- Link checklist bersifat publik bagi yang tahu link (kode acak, sulit ditebak). Tidak ada pembatasan laju selain validasi NRP, batas tanggal mundur 90 hari, dan penjaga kirim ganda.
- Poin checklist adalah draf. Cocokkan dengan SOP perusahaan di `lib/checklists.js`.
- Kode ditulis tanpa bisa dijalankan di lingkungan pembuatnya. Jalankan `npm install && npm run build` dulu dan perbaiki bila ada error kecil.
- Impor mode "Samakan dengan file" tidak menghapus aset, hanya menandai tidak aktif, sehingga riwayat tetap aman.
