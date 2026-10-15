# TAMAKI — IDENTITAS VISUAL & DESIGN SYSTEM v1

## 1. Tujuan dan Prinsip Desain
Dokumen ini menjadi acuan resmi identitas visual, warna semantik, ikon, indikator, kartu, grafik, tabel, badge, tipografi, border, dan konsistensi komponen aplikasi Tamaki — Presensi Digital GTK.

**Prinsip Desain:**
- **Minimalis dan Profesional:** Fokus pada informasi, tenang, dan tertata.
- **Inklusif:** Nyaman digunakan oleh seluruh GTK dengan tingkat literasi digital yang beragam.
- **Terarah:** Dominasi putih dan abu-abu terang; warna digunakan hanya untuk informasi semantik.
- **Konsisten:** Seragam di seluruh perangkat (desktop, tablet, mobile).
- **Aksesibel:** Prioritas pada keterbacaan, hierarki, dan kontras (WCAG AA).

---

## 2. Identitas Visual Tamaki
- **Nama Aplikasi:** Tamaki (menggunakan font `Casual-Regular`).
- **Warna Identitas:** Orange Sunset (`#F97316`).
- **Prinsip Penggunaan Warna:** Warna digunakan untuk fokus interaksi dan elemen tindakan. Hindari dekorasi warna yang berlebihan, warna neon, atau penggunaan warna tanpa fungsi semantik.

---

## 3. Palet Warna Utama dan Netral
### Warna Utama (Orange Sunset)
- **Primary Accent:** `#F97316` (Tombol utama, fokus interaksi, aksi relevan).
- *Catatan:* Oranye bukan pengganti warna semantik status presensi.

### Warna Netral (Struktur UI)
- Latar canvas: `#F2F2F2`
- Latar permukaan: `#FFFFFF`
- Border: `#E5E7EB`
- Teks: `#111827` (Utama), `#6B7280` (Sekunder)

---

## 4. Palet Warna Semantik Presensi
Warna status presensi digunakan secara konsisten pada seluruh komponen (badges, tabel, grafik).

| Status | Warna Utama | Warna Latar Lembut (Pastel) |
|---|---|---|
| Total Pegawai | #64748B | #E9EDF2 |
| Hadir | #39805A | #E8F4EB |
| Terlambat | #7B922F | #F0F4DE |
| Dinas Luar | #477BAE | #E8F0FA |
| Sakit | #4F98B2 | #E6F4F8 |
| Izin | #C47735 | #FFF0E3 |
| Cuti | #8669AC | #F0EAF8 |
| Alpha | #F4382C | #FDE9E7 |

*Catatan Alpha:* Untuk teks Alpha pada latar terang, gunakan `#C92D24` untuk meningkatkan kontras jika diperlukan. Warna `#F4382C` tetap digunakan untuk ikon, titik indikator, elemen grafik, dan aksen status.

---

## 5. Tabel Design Tokens
*Nama token ini adalah standar dokumentasi (usulan).*

| Nama Token | HEX | Kegunaan |
|---|---|---|
| `--color-brand-primary` | `#F97316` | Aksi utama, fokus branding |
| `--color-status-total` | `#64748B` | Total Pegawai |
| `--color-status-present` | `#39805A` | Hadir |
| `--color-status-late` | `#7B922F` | Terlambat |
| `--color-status-official-duty` | `#477BAE` | Dinas Luar |
| `--color-status-sick` | `#4F98B2` | Sakit |
| `--color-status-permission` | `#C47735` | Izin |
| `--color-status-leave` | `#8669AC` | Cuti |
| `--color-status-absent` | `#F4382C` | Alpha |

---

## 6. Aturan Penggunaan Komponen
- **Cards:** Latar putih. Warna status hanya untuk ikon/angka/aksen. Hindari mewarnai seluruh card.
- **Icons:** Konsisten dengan makna. Jangan gunakan ikon dekoratif berwarna tanpa fungsi semantik.
- **Indicators dan Badges:** Latar pastel, teks/ikon warna tegas. Wajib menyertakan label teks.
- **Charts:** Warna status harus sinkron dengan tabel/cards/badges. Jangan ubah warna seri untuk variasi visual.
- **Tables:** Latar putih. Terapkan warna status pada badge/indikator kecil. Hindari mewarnai baris penuh dengan warna jenuh.

---

## 7. Tipografi dan Aksesibilitas
- Font tidak berubah dari implementasi saat ini.
- Target kontras WCAG AA: rasio minimal 4,5:1 untuk teks normal, 3:1 untuk teks besar.
- Jika kombinasi warna saat ini tidak memenuhi kontras, dokumentasikan rekomendasi penanganannya.

---

## 8. Konsistensi
- Satu status harus memiliki warna yang sama di seluruh aplikasi.
- Dilarang membuat status bisnis baru atau mengubah arti status yang sudah ada.

---

## 9. Do and Don't
- **DO:** Gunakan warna secara terarah, pastikan status memiliki label teks, jaga konsistensi.
- **DON'T:** Hindari warna neon, jangan gunakan warna status untuk notifikasi sistem (karena berbeda konteks), jangan mengubah arti status.

---

## 10. Prosedur Perubahan Standar Visual
Perubahan standar visual di masa depan wajib melalui:
1. Analisis dampak (audit dampak pada konsistensi yang ada).
2. Dokumentasi pada file ini (`design.md`).
3. Pengujian kontras (aksesibilitas).
4. Persetujuan desain.
