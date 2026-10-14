# TAMAKI — DESIGN SYSTEM
## Presensi Digital GTK

**File:** `design.md`  
**Status:** Pedoman desain resmi aplikasi  
**Versi:** 1.0  
**Brand:** Tamaki — Presensi Digital GTK

---

## 1. Tujuan dan Ruang Lingkup

Dokumen ini menetapkan standar visual dan interaksi yang harus digunakan secara konsisten di seluruh aplikasi Tamaki.

Cakupan standar meliputi:

- Identitas visual dan warna merek.
- Tipografi dan hierarki teks.
- Penggunaan ikon.
- Warna dan representasi status presensi.
- Komponen antarmuka.
- Layout, spacing, border, dan radius.
- Grafik, tabel, kartu statistik, dan indikator.
- Aksesibilitas dan pemeriksaan konsistensi desain.

Dokumen ini menjadi acuan untuk pengembangan fitur baru, penyempurnaan halaman, dan audit UI yang sudah ada.

### Batasan utama

1. Dokumen ini mengatur presentasi visual, bukan mengubah aturan bisnis.
2. Logika presensi, perhitungan persentase kehadiran, otorisasi, database, dan alur kerja yang telah selesai diimplementasikan harus dipertahankan.
3. Implementasi yang sudah ada harus diperiksa sebelum membuat komponen atau aturan baru.
4. Jangan mengganti library, menambah dependensi, atau merombak arsitektur hanya untuk memenuhi preferensi visual jika tidak diperlukan.
5. Jika ditemukan ketidaksesuaian antara UI dan logika bisnis yang sudah berjalan, dokumentasikan temuannya terlebih dahulu.

---

## 2. Prinsip Desain

### 2.1 Minimalis dan fungsional

Antarmuka harus sederhana, rapi, mudah dipahami, dan berorientasi pada informasi.

- Hindari dekorasi yang tidak memiliki fungsi.
- Hindari penggunaan warna berlebihan.
- Jangan memenuhi halaman dengan badge, ikon besar, atau kartu yang tidak diperlukan.
- Utamakan keterbacaan dan hierarki informasi.
- Setiap elemen harus memiliki tujuan yang jelas.

### 2.2 Konsistensi lintas halaman

Komponen yang memiliki fungsi sama harus menggunakan pola visual dan perilaku yang sama.

Contoh:

- Tombol aksi utama menggunakan warna dan ukuran yang konsisten.
- Status presensi yang sama menggunakan warna yang sama.
- Ikon untuk tindakan yang sama tidak boleh berubah-ubah.
- Judul halaman, judul bagian, label, dan angka statistik mengikuti hierarki tipografi yang sama.
- Kartu dengan fungsi serupa menggunakan padding, border, dan radius yang seragam.

### 2.3 Warna sebagai sistem

Warna tidak boleh ditentukan secara acak per halaman.

- Oranye merupakan warna identitas utama Tamaki.
- Warna oranye digunakan untuk identitas merek, aksi utama, penekanan, dan kategori presensi.
- Warna netral digunakan untuk latar belakang, teks, border, dan kondisi tanpa data.
- Status presensi menggunakan pemetaan warna tetap.
- Jangan memperkenalkan warna merah, hijau, biru, atau ungu sebagai warna indikator status presensi tanpa keputusan desain yang terdokumentasi.

### 2.4 Informasi tidak bergantung pada warna saja

Setiap status harus tetap dapat dipahami melalui teks dan, jika relevan, ikon atau tooltip. Perbedaan warna saja tidak cukup untuk menyampaikan makna status.

---

## 3. Sistem Warna

### 3.1 Warna merek utama

Warna utama Tamaki adalah Orange Sunset.

| Token | Hex | Penggunaan |
|---|---|---|
| `brand-50` | `#FFF7ED` | Latar sorotan oranye sangat lembut |
| `brand-100` | `#FFEDD5` | Latar indikator ringan |
| `brand-200` | `#FED7AA` | Border atau aksen lembut |
| `brand-300` | `#FDBA74` | Aksen oranye terang |
| `brand-400` | `#FB923C` | Aksen sekunder |
| `brand-500` | `#F97316` | Warna merek utama |
| `brand-600` | `#EA580C` | Aksi atau penekanan lebih kuat |
| `brand-700` | `#C2410C` | Teks atau indikator oranye gelap |
| `brand-800` | `#9A3412` | Penekanan gelap |
| `brand-900` | `#7C2D12` | Penekanan paling gelap |

Nilai `#F97316` harus dipertahankan sebagai warna merek utama selama tidak ada keputusan branding baru.

### 3.2 Warna netral

| Token | Hex | Penggunaan |
|---|---|---|
| `neutral-white` | `#FFFFFF` | Permukaan kartu dan konten |
| `neutral-canvas` | `#F2F2F2` | Latar canvas aplikasi |
| `neutral-50` | `#F9FAFB` | Latar netral lembut |
| `neutral-100` | `#F3F4F6` | Latar sekunder |
| `neutral-200` | `#E5E7EB` | Border dan pemisah |
| `neutral-300` | `#D1D5DB` | Elemen nonaktif dan data belum terkonfirmasi |
| `neutral-500` | `#6B7280` | Teks sekunder |
| `neutral-700` | `#374151` | Teks utama sekunder |
| `neutral-900` | `#111827` | Teks utama |

Gunakan warna netral untuk struktur antarmuka, bukan sebagai alasan untuk menambahkan warna status baru.

### 3.3 Penerapan warna identitas

- Nama aplikasi **Tamaki** pada halaman login: `#F97316`.
- Nama aplikasi **Tamaki** pada sidebar: `#FFFFFF`.
- Font nama aplikasi: `Casual-Regular`, sesuai implementasi yang sudah ada.
- Teks utama halaman login: `#111827`.
- Canvas utama: `#F2F2F2`.
- Permukaan kartu: `#FFFFFF`.
- Sidebar mempertahankan identitas oranye yang telah ditetapkan.
- Jangan mengubah konfigurasi warna yang sudah sesuai dengan pedoman ini.

### 3.4 Aturan penggunaan warna

- Gunakan satu warna utama untuk aksi utama pada suatu konteks.
- Hindari gradien, efek glow, dan bayangan berlebihan.
- Jangan menggunakan beberapa warna hanya untuk mempercantik tampilan.
- Pastikan teks di atas latar memiliki kontras yang memadai.
- Warna oranye yang sangat terang tidak boleh digunakan sebagai warna teks kecil di atas latar putih.
- Untuk indikator berwarna terang, gunakan teks atau ikon berwarna gelap dengan kontras yang memadai.

---

## 4. Sistem Ikon — Aturan Wajib

Konsistensi ikon merupakan standar utama desain Tamaki.

### 4.1 Satu keluarga ikon

Gunakan **Lucide React** sebagai standar ikon apabila library tersebut sudah digunakan dalam proyek.

Sebelum implementasi:

1. Periksa dependensi dan pola ikon yang sudah ada.
2. Jika Lucide React sudah digunakan, lanjutkan dengan library tersebut.
3. Jika proyek menggunakan library lain secara konsisten, audit terlebih dahulu sebelum melakukan migrasi.
4. Jangan memasang library ikon kedua hanya untuk kebutuhan dekoratif.
5. Jangan mencampur ikon Lucide, Material Icons, Font Awesome, emoji, dan ikon dari keluarga berbeda dalam satu antarmuka.

### 4.2 Ukuran ikon

Gunakan ukuran berdasarkan fungsi, bukan berdasarkan selera per komponen.

| Penggunaan | Ukuran acuan |
|---|---:|
| Ikon kecil di dalam teks | 14–16 px |
| Ikon menu sidebar | 20 px |
| Ikon tombol | 16–18 px |
| Ikon aksi tabel | 16–18 px |
| Ikon status | 16–20 px |
| Ikon kartu statistik | 20–24 px |
| Ilustrasi keadaan kosong | 32–40 px |

Ukuran di atas merupakan standar awal. Pertahankan ukuran yang sudah konsisten dan sesuai pada komponen yang ada.

### 4.3 Ketebalan garis

- Gunakan `strokeWidth` yang seragam, dengan acuan `2`.
- Jangan mengubah ketebalan garis secara acak.
- Hindari ikon outline yang dicampur dengan ikon solid tanpa alasan desain yang jelas.
- Jika suatu ikon memerlukan variasi visual, variasi tersebut harus berlaku konsisten pada seluruh komponen sejenis.

### 4.4 Ikon sidebar

- Menu sidebar menggunakan ikon dengan ukuran dan gaya yang sama.
- Ikon menu aktif menggunakan warna aksen yang sesuai dengan desain sidebar.
- Ikon menu nonaktif menggunakan warna netral yang telah ditetapkan.
- Jangan menggunakan ikon berukuran besar untuk memperindah menu.
- Kondisi collapsed tetap menampilkan ikon yang sama seperti kondisi expanded.
- Setiap ikon menu yang tidak disertai label harus memiliki `aria-label` atau tooltip yang menjelaskan tujuannya.

### 4.5 Ikon tombol dan tindakan

Ikon harus menjelaskan fungsi, bukan menjadi dekorasi.

Contoh pemetaan yang konsisten:

| Fungsi | Ikon acuan Lucide |
|---|---|
| Tambah data | `Plus` |
| Edit | `Pencil` |
| Hapus | `Trash2` |
| Cari | `Search` |
| Filter | `Filter` |
| Unduh | `Download` |
| Lihat detail | `Eye` |
| Tutup | `X` |
| Kembali | `ArrowLeft` |
| Kalender | `CalendarDays` |
| Waktu | `Clock` |
| Lokasi | `MapPin` |
| Pengguna | `UserRound` |
| Pengaturan | `Settings2` |
| Notifikasi | `Bell` |
| Check-in | `LogIn` |
| Check-out | `LogOut` |
| Riwayat | `History` |
| Kehadiran | `CalendarCheck` |

Nama di atas adalah acuan, bukan perintah untuk mengganti semua ikon yang sudah tepat. Pastikan nama ikon tersedia pada versi library yang terpasang.

### 4.6 Ikon dan aksesibilitas

- Ikon dekoratif di samping teks tidak perlu mengulang nama teks melalui pembaca layar.
- Tombol yang hanya berisi ikon harus memiliki nama aksesibel.
- Tooltip tidak boleh menjadi satu-satunya cara menyampaikan informasi penting.
- Hindari penggunaan emoji sebagai pengganti ikon antarmuka.

---

## 5. Sistem Status Presensi

### 5.1 Prinsip dasar

Kategori status presensi harus tetap terpisah jika grafik atau tabel bertujuan menampilkan rincian status.

Kategori utama:

1. Hadir
2. Terlambat
3. Dinas Luar
4. Sakit
5. Izin
6. Cuti
7. Belum Presensi

Status tambahan yang benar-benar digunakan oleh sistem harus diaudit dan dimasukkan ke dalam pemetaan yang sama tanpa mengubah aturan bisnisnya.

### 5.2 Pemetaan warna tetap

Gunakan pemetaan awal berikut secara konsisten di seluruh aplikasi:

| Status | Warna | Hex |
|---|---|---|
| Hadir | Orange 900 | `#7C2D12` |
| Terlambat | Orange 700 | `#C2410C` |
| Dinas Luar | Orange 600 | `#EA580C` |
| Sakit | Orange 500 | `#F97316` |
| Izin | Orange 400 | `#FB923C` |
| Cuti | Orange 300 | `#FDBA74` |
| Belum Presensi | Orange 100 | `#FFEDD5` |

Pemetaan ini merupakan standar visual awal. Sebelum diterapkan, audit implementasi aktual dan pastikan keterbacaan semua indikator, terutama pada latar putih. Jika kontras suatu indikator tidak memadai, perbaiki warna teks, outline, atau representasi indikator tanpa mengubah arti statusnya.

Gunakan warna abu-abu untuk data yang belum tersedia, belum diketahui, atau tidak berlaku jika kondisi tersebut memang berbeda dari status Belum Presensi.

### 5.3 Status bukan sekadar warna

Setiap indikator status harus menampilkan teks yang jelas.

- Pada tabel, tampilkan label status.
- Pada grafik, tampilkan legenda yang jelas.
- Pada tooltip, tampilkan nama kategori dan jumlah atau persentase jika tersedia.
- Jangan menggunakan warna saja untuk membedakan status.
- Jangan menganggap status Belum Presensi otomatis berarti Tidak Hadir tanpa mengikuti aturan sistem yang sudah ada.

### 5.4 Aturan bisnis yang wajib dipertahankan

- Dinas Luar tetap dihitung sebagai Hadir dalam rekap dan persentase kehadiran sesuai implementasi Tamaki saat ini.
- Dinas Luar tetap dapat ditampilkan sebagai kategori tersendiri dalam grafik rincian status.
- Terlambat tetap mengikuti aturan perhitungan kehadiran yang sudah diterapkan.
- Sakit, Izin, dan Cuti tetap menjadi kategori berbeda secara visual.
- Jangan mengubah rumus persentase, penyebut perhitungan, atau penanganan status apa pun hanya demi menyederhanakan grafik.
- Jangan menghitung satu catatan presensi dua kali ketika menyajikan grafik kategori dan agregat.

### 5.5 Konsistensi lintas komponen

Status yang sama harus memakai warna yang sama pada:

- Diagram donat.
- Grafik batang bertumpuk.
- Grafik tren.
- Legenda.
- Tabel presensi.
- Kartu statistik.
- Badge atau indikator status.
- Detail presensi dan riwayat.

Jangan membuat pemetaan warna baru untuk setiap halaman.

---

## 6. Standar Grafik dan Visualisasi Data

### 6.1 Prinsip grafik

- Grafik harus menjawab kebutuhan informasi yang jelas.
- Gunakan palet oranye monokromatik untuk kategori presensi.
- Gunakan warna netral untuk grid, sumbu, garis bantu, dan data yang tidak tersedia.
- Hindari efek 3D, dekorasi, dan warna yang tidak berkaitan dengan data.
- Jangan mengubah definisi metrik atau rumus hanya demi tampilan.

### 6.2 Grafik batang bertumpuk

- Setiap kategori menggunakan warna tetap sesuai sistem status.
- Urutan kategori harus konsisten di antara grafik sejenis.
- Gunakan legenda yang jelas.
- Pastikan kategori dengan warna terang tetap terlihat di atas latar putih.
- Tooltip menampilkan nama status dan nilai yang relevan.
- Jika jumlah kategori terlalu banyak, prioritaskan keterbacaan dan gunakan legenda yang mudah dipindai.

### 6.3 Diagram donat

- Gunakan pemetaan warna status yang sama dengan grafik batang.
- Tampilkan total di tengah hanya jika total tersebut memiliki definisi yang jelas.
- Legenda harus menjelaskan kategori dan nilainya.
- Jangan menggabungkan Sakit, Izin, Cuti, dan Dinas Luar menjadi satu kategori generik pada grafik yang mengklaim sebagai rincian status.
- Jangan menyimpulkan persentase dari data yang tidak lengkap.

### 6.4 Agregasi data

Grafik boleh menyajikan ringkasan dengan kelompok yang lebih sederhana jika tujuan grafik memang berbeda, misalnya membedakan kehadiran secara keseluruhan dari rincian administratif.

Namun:

- Nama kelompok harus menjelaskan arti agregasi.
- Detail kategori harus tetap dapat ditelusuri jika diperlukan.
- Agregasi tidak boleh mengubah logika bisnis yang sudah diterapkan.
- Hindari penghitungan ganda antara kategori rinci dan nilai agregat.

---

## 7. Tipografi

### 7.1 Identitas aplikasi

- Nama aplikasi harus ditulis **Tamaki**, bukan TAMAKI atau tamaki, kecuali konteks teknis tertentu mengharuskannya.
- Font nama aplikasi: `Casual-Regular`.
- Login: nama aplikasi menggunakan warna `#F97316`.
- Sidebar: nama aplikasi menggunakan warna `#FFFFFF`.
- Jangan mengubah font nama aplikasi tanpa keputusan desain yang jelas.

### 7.2 Teks antarmuka

Gunakan font sans-serif utama yang sudah dikonfigurasi dalam proyek. Pertahankan konfigurasi font yang ada jika sudah sesuai.

Hierarki teks acuan:

| Elemen | Ukuran acuan |
|---|---:|
| Judul halaman | 24–30 px |
| Judul bagian | 18–20 px |
| Judul kartu | 14–16 px |
| Isi teks | 14–16 px |
| Label dan keterangan | 12–14 px |
| Catatan kecil | Minimal 12 px jika memungkinkan |

Jangan memperbesar teks secara berlebihan. Utamakan hierarki yang jelas, keterbacaan, dan konsistensi.

---

## 8. Layout dan Spacing

Gunakan sistem spacing yang konsisten berdasarkan kelipatan 4 px.

| Token | Nilai |
|---|---:|
| `space-1` | 4 px |
| `space-2` | 8 px |
| `space-3` | 12 px |
| `space-4` | 16 px |
| `space-5` | 20 px |
| `space-6` | 24 px |
| `space-8` | 32 px |
| `space-10` | 40 px |
| `space-12` | 48 px |

Aturan:

- Gunakan padding yang seragam pada komponen sejenis.
- Jarak antarbagian harus cukup untuk memisahkan informasi.
- Hindari ruang kosong yang tidak memiliki tujuan.
- Hindari tampilan terlalu padat.
- Jangan mengubah struktur layout yang sudah berjalan hanya untuk menyesuaikan token.
- Pastikan tampilan responsif tidak menyebabkan informasi utama terpotong.

---

## 9. Komponen Antarmuka

### 9.1 Kartu

- Gunakan latar putih di atas canvas `#F2F2F2`.
- Gunakan border netral yang tipis jika diperlukan.
- Hindari shadow yang terlalu kuat.
- Gunakan radius secara konsisten pada seluruh kartu sejenis.
- Kartu statistik tidak harus selalu menggunakan ikon besar atau latar berwarna.

### 9.2 Tombol

- Tombol aksi utama menggunakan warna merek oranye.
- Tombol sekunder menggunakan gaya netral yang konsisten.
- Tombol destruktif harus memiliki konfirmasi yang sesuai; jangan menjadikan warna sebagai satu-satunya petunjuk.
- Ukuran tombol dan ikon harus konsisten untuk fungsi yang sama.
- Tombol hanya berisi ikon wajib memiliki label aksesibel.

### 9.3 Badge dan indikator status

- Gunakan badge hanya jika membantu mengenali status.
- Hindari badge pada setiap label atau teks biasa.
- Gunakan ukuran, padding, radius, dan tipografi yang konsisten.
- Status yang sama harus memakai warna yang sama di semua halaman.
- Jangan menambahkan indikator dekoratif yang tidak menyampaikan informasi.

### 9.4 Tabel

- Header tabel mudah dibedakan dari isi.
- Jarak antarkolom cukup untuk membaca informasi.
- Ikon aksi memiliki ukuran dan jarak yang konsisten.
- Label status menggunakan sistem warna resmi.
- Hindari penggunaan warna latar pada seluruh baris jika hanya satu indikator kecil yang diperlukan.

### 9.5 Keadaan kosong, memuat, dan gagal

- Keadaan kosong harus menjelaskan bahwa data belum tersedia.
- Keadaan memuat harus memberikan umpan balik yang jelas tanpa dekorasi berlebihan.
- Pesan gagal harus dapat dipahami dan tidak hanya menggunakan warna.
- Gunakan ikon dari keluarga yang sama jika ikon membantu pemahaman.
- Jangan menyamakan data kosong, data belum tersedia, dan status belum presensi jika maknanya berbeda.

---

## 10. Sidebar dan Header

Pertahankan pola layout yang sudah diimplementasikan.

- Sidebar mendukung mode expanded dan collapsed.
- Keadaan collapsed tetap menggunakan ikon menu yang sama.
- Tooltip atau `aria-label` harus tersedia untuk item tanpa teks.
- Nama aplikasi ditulis **Tamaki** dengan font `Casual-Regular` dan warna putih.
- Nama sekolah tidak ditampilkan sebagai teks di sidebar sesuai keputusan desain yang sudah ditetapkan.
- Canvas tetap `#F2F2F2`.
- Header mempertahankan perilaku sticky yang sudah ada.
- Jangan mengubah mekanisme penyimpanan keadaan sidebar hanya untuk kebutuhan visual.

---

## 11. Aksesibilitas dan Responsivitas

- Gunakan kontras teks dan latar yang memadai.
- Jangan mengandalkan warna saja untuk menunjukkan status atau kesalahan.
- Sediakan nama aksesibel untuk tombol ikon.
- Tooltip tidak boleh menggantikan informasi penting.
- Pertahankan perilaku keyboard dan fokus yang sudah ada.
- Pastikan elemen interaktif dapat digunakan pada layar sentuh.
- Pastikan layout dapat digunakan pada desktop, tablet, dan perangkat seluler.
- Jangan mengurangi keterbacaan demi mempertahankan tampilan minimalis.

---

## 12. Aturan Implementasi

Sebelum mengubah komponen apa pun:

1. Periksa implementasi aktual dan dependensi yang tersedia.
2. Identifikasi komponen atau token yang sudah sesuai.
3. Gunakan kembali komponen dan konfigurasi yang ada.
4. Hindari duplikasi konstanta warna, ukuran, atau pemetaan status.
5. Jika proyek sudah memiliki design tokens atau konfigurasi tema, selaraskan dengan standar ini daripada membuat sistem paralel.
6. Pisahkan perubahan visual dari perubahan logika bisnis.
7. Jangan mengubah skema database, fungsi backend, kebijakan keamanan, otorisasi, rumus presensi, atau aturan status sebagai bagian dari pekerjaan desain.
8. Jangan melakukan deployment sebagai bagian dari audit atau pembaruan dokumentasi.

### Sumber kebenaran

Jika nilai warna, ikon, atau komponen didefinisikan di beberapa tempat, usahakan satu sumber konfigurasi yang jelas dan digunakan kembali.

Jangan melakukan refactor besar hanya untuk memusatkan konfigurasi. Perubahan struktur harus dilakukan secara terpisah jika memang diperlukan.

---

## 13. Checklist Audit Desain

Sebelum menyatakan halaman selesai, periksa:

### Warna
- [ ] Warna merek menggunakan `#F97316`.
- [ ] Canvas menggunakan `#F2F2F2`.
- [ ] Latar kartu dan konten konsisten.
- [ ] Warna status sesuai pemetaan resmi.
- [ ] Tidak ada warna status tambahan yang tidak terdokumentasi.
- [ ] Teks memiliki kontras yang memadai.

### Ikon
- [ ] Menggunakan keluarga ikon yang konsisten.
- [ ] Tidak ada campuran emoji atau ikon dari keluarga berbeda.
- [ ] Ukuran ikon sesuai fungsi.
- [ ] Ketebalan garis konsisten.
- [ ] Ikon untuk fungsi yang sama menggunakan simbol yang sama.
- [ ] Tombol ikon memiliki nama aksesibel.
- [ ] Ikon sidebar tetap konsisten dalam mode collapsed dan expanded.

### Status dan grafik
- [ ] Status rinci tidak digabung secara keliru.
- [ ] Dinas Luar tetap dihitung sebagai Hadir sesuai logika sistem.
- [ ] Pemetaan warna status sama pada grafik, tabel, dan indikator.
- [ ] Legenda dan tooltip menjelaskan kategori dengan benar.
- [ ] Tidak ada penghitungan ganda.
- [ ] Rumus dan aturan bisnis tidak berubah.

### Layout dan tipografi
- [ ] Spacing dan padding konsisten.
- [ ] Hierarki teks mudah dibaca.
- [ ] Kartu tidak memiliki dekorasi berlebihan.
- [ ] Layout responsif.
- [ ] Identitas Tamaki sesuai ketentuan.

### Validasi teknis
- [ ] Tidak ada regresi pada fungsi yang sudah berjalan.
- [ ] TypeScript check berhasil jika tersedia.
- [ ] Build berhasil jika tersedia.
- [ ] Perubahan yang belum diverifikasi dilaporkan secara terbuka.

---

## 14. Prinsip Keputusan Akhir

Jika terdapat beberapa pilihan desain, prioritaskan secara berurutan:

1. Ketepatan informasi dan aturan bisnis.
2. Konsistensi ant halaman.
3. Keterbacaan dan aksesibilitas.
4. Kesederhanaan dan efisiensi ruang.
5. Keindahan visual.

**Prinsip utama Tamaki: satu identitas visual, satu sistem ikon, satu pemetaan warna status, dan satu aturan yang konsisten untuk setiap komponen sejenis.**
