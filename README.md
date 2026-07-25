# COMMAND360 — Dashboard Komandan Batalyon Infanteri
Prototipe dashboard operasional untuk Komandan Batalyon (Danyon), Wadanyon, Staf, seluruh Komandan Kompi, dan sistem keamanan satuan (APMS).

Status: **Prototipe / Mockup Fungsional Lanjutan** — sebagian besar data adalah data contoh (dummy), sebagian sudah tersambung ke sumber real-time (cuaca). Belum tersambung ke database/backend sungguhan. Dokumen ini terakhir diperbarui menyeluruh mengikuti kondisi aplikasi terkini.

---

## 1. Isi Folder — File Aktif

| File | Fungsi |
|---|---|
| `dashboard-login.html` | Halaman login (**mulai dari sini**) |
| `dashboard-command360-unified.html` | **Dashboard utama** — seluruh role, seluruh menu, dalam satu aplikasi |
| `apms-scan-gate.html` | Halaman scan HP — masuk/keluar Kesatrian |
| `apms-scan-checkpoint.html` | Halaman scan HP — absen patroli, wajib selfie + validasi GPS |
| `apms-scan-alat.html` | Halaman scan HP — peminjaman/pengembalian alat |
| `apms-scan-senjata.html` | Halaman scan HP — pengeluaran/penggudangan senjata |
| `apms-rfid-kiosk.html` | Layar kiosk untuk reader NFC fisik (gate, checkpoint, gudang) |
| `logo-command360-lg.png` | Logo besar (halaman login) |
| `logo-command360-sm.png` | Logo kecil (sidebar dashboard) |
| `login-badge-icon.png` | Lencana shield+gembok (halaman login) |
| `radar-map-indonesia.png` | Latar peta radar (halaman login) |
| `title-command360.png` | *(cadangan, tidak lagi dipakai — judul kini teks CSS logam 3D)* |

**File lain** (`dashboard-intel.html`, `dashboard-komando.html`, `dashboard-operasi.html`, `dashboard-personel.html`, `dashboard-logistik.html`, `dashboard-kompi-*.html` individual) adalah **versi awal/lama** sebelum semua digabung menjadi satu `dashboard-command360-unified.html`. **Tidak perlu dipakai** — boleh diabaikan atau dihapus, murni arsip riwayat pengembangan.

**Wajib satu folder:** `dashboard-login.html`, `dashboard-command360-unified.html`, dan seluruh file `.png` di atas harus berada di **folder yang sama** agar logo dan navigasi antar-halaman berfungsi.

---

## 2. Cara Menjalankan

### Opsi A — Buka langsung (cepat, tapi APMS live-update tidak berfungsi)
1. Klik dua kali `dashboard-login.html`.
2. Login dengan Nama, Username, Password bebas + pilih Role.
3. Masukkan kode OTP yang muncul di kotak "MODE DEMO" di layar (kode acak, beda setiap kali login).

### Opsi B — Jalankan via server lokal (disarankan, agar data APMS antar-halaman tersambung)
Buka Terminal/Command Prompt di folder ini, jalankan:
```bash
python3 -m http.server 8000
```
Lalu buka browser ke:
```
http://localhost:8000/dashboard-login.html
```
Kenapa perlu ini? Lihat bagian **§6 Alur Data APMS** di bawah.

---

## 3. Role & Hak Akses

| Role | Bisa membuka |
|---|---|
| **Danyon** | Semua menu |
| **Wadanyon** | Semua menu (setara Danyon) |
| **Pasi Intelijen** | Dashboard Intel + APMS |
| **Pasi Operasi** | Dashboard Operasi |
| **Pasi Personel** | Dashboard Personel |
| **Pasi Logistik** | Dashboard Logistik |
| **Danki A / B / C / Bantuan / Markas** | Dashboard Kompi masing-masing |
| **Danki Pertanian/Peternakan/Perikanan/Konstruksi/Kesehatan** | Dashboard Kompi Produksi masing-masing |

AI Assistant dan Daily Briefing terbuka untuk semua role.

---

## 4. Struktur Menu

```
RINGKASAN → Executive Dashboard (Danyon/Wadanyon)
STAF      → Intelijen · Operasi · Personel · Logistik · APMS
KOMPI     → A · B · C · Bantuan · Markas · Pertanian · Peternakan · Perikanan · Konstruksi · Kesehatan
LAINNYA   → AI Assistant · Daily Briefing
```
*(Menu "Notification Center" sudah dihapus — notifikasi kini hanya lewat ikon lonceng di topbar, klik untuk buka daftar.)*

---

## 5. Fitur Utama

- **Keamanan sesi**: OTP acak per login (`Math.random()`, beda setiap kali), auto-logout setelah 10 menit tanpa aktivitas (peringatan muncul 30 detik sebelumnya), wajib login untuk akses dashboard.
- **Jam & tanggal real-time**: topbar seluruh dashboard sekarang mengikuti waktu asli perangkat, update tiap detik (bukan lagi teks statis).
- **AI Assistant**: bisa ditanya soal data personel/logistik per-Kompi maupun Batalyon, contoh: *"Berapa personel sakit di Kompi A?"*, *"Siap gerak Kompi Bantuan berapa?"*. Menjawab dari database internal (bukan LLM sungguhan — pencocokan kata kunci).
- **Daily Briefing**: laporan harian format baku, bisa "Generate Ulang" dan **Cetak/Ekspor PDF** (lihat §7).
- **Prediksi Cuaca real-time**: di Dashboard Danyon & Staf Intelijen, tersambung ke OpenWeatherMap.org (lihat §8 untuk setup API key). Data ini otomatis masuk ke Daily Briefing.
- **Upload data via Excel**: 5 tabel sekarang bisa diperbarui langsung dari file Excel Staf tanpa perlu edit kode — **Rekapitulasi Senjata & Munisi**, **Kendaraan**, **Kondisi Materiil** (semua di Dashboard Logistik), **Personel & Siap Gerak** (Dashboard Personel), dan **Produksi Kompi Produksi** (Dashboard Danyon). Klik "TEMPLATE" untuk contoh format, isi, lalu "UPLOAD EXCEL". Data tersimpan otomatis di browser (localStorage) dan tetap muncul saat dashboard dibuka lagi. Tombol "RESET" mengembalikan ke data contoh.
- **APMS (Access & Patrol Management System)**: sistem keamanan satuan lengkap 3 tahap (QR/Gate/Patroli → GPS/Selfie/Panic Button → NFC/Face Recognition/Smart Barrier), lihat §6.
- **Efek visual**: seluruh kartu/panel dan sidebar punya efek glow neon 3D saat hover, termasuk di halaman-halaman scan APMS.

---

## 6. Alur Data APMS — Cara Kerja & Keterbatasannya

**Cara kerja saat ini:**
- Anggota scan di `apms-scan-gate.html` / `apms-scan-checkpoint.html` / dll → data ditulis ke **localStorage browser** dengan key `apms_events`.
- Dashboard APMS (`dashboard-command360-unified.html`) membaca `apms_events` dan menampilkan **Log Aktivitas Real-Time** — daftar event terbaru yang benar-benar tercatat dari halaman scan.

**Kenapa harus pakai server lokal (§2 Opsi B)?**
`localStorage` hanya bisa dibagi antar-halaman yang **origin-nya sama**. Kalau file dibuka langsung lewat klik-dua-kali (`file://...`), sebagian besar browser modern (terutama Chrome) memperlakukan tiap file `file://` sebagai origin terpisah — jadi data yang ditulis `apms-scan-gate.html` **tidak akan terbaca** oleh `dashboard-command360-unified.html`. Begitu dijalankan lewat `http://localhost:8000/...` (§2 Opsi B), semua halaman berbagi origin yang sama dan data mengalir dengan benar.

**Keterbatasan yang tetap ada** (bahkan dengan server lokal):
- Data **hanya tersimpan di satu browser** yang dipakai — kalau anggota scan pakai HP-nya sendiri dan Danyon buka dashboard di laptop terpisah, data **tidak akan sinkron** antar-perangkat (localStorage tidak pernah keluar dari satu browser).
- Untuk sinkronisasi sungguhan lintas-perangkat (anggota scan di lapangan → langsung muncul di dashboard Danyon di kantor), **wajib backend/database asli** — localStorage hanya solusi demo satu-perangkat.
- Reset browser / clear cache akan menghapus seluruh riwayat `apms_events`.

**Ringkasnya:** ini bukan solusi produksi, tapi sudah jauh lebih baik dari sebelumnya (yang sama sekali statis/tidak nyambung) — cukup untuk demo internal di satu laptop/HP.

---

## 7. Cetak / Ekspor

- **Daily Briefing**: tombol "Cetak / Ekspor PDF" di panel Daily Briefing — membuka jendela cetak browser (pilih "Save as PDF" di dialog print).
- **Tabel lain** (Rekapitulasi Senjata & Munisi, dll): belum ada tombol ekspor khusus. Cara sementara: gunakan Ctrl+P / Cmd+P (Print) bawaan browser pada halaman yang sedang dibuka, atau screenshot.

---

## 8. Setup Prediksi Cuaca (OpenWeatherMap)

Di dalam `dashboard-command360-unified.html`, cari baris ini (gunakan Ctrl+F di editor teks):
```js
const OWM_API_KEY = 'MASUKKAN_API_KEY_ANDA_DI_SINI';
const OWM_LAT = -6.1751;
const OWM_LON = 106.8272;
```
1. Daftar gratis di [openweathermap.org/api](https://openweathermap.org/api), ambil API key.
2. Ganti `OWM_API_KEY` dengan key Anda.
3. Ganti `OWM_LAT` / `OWM_LON` dengan koordinat lokasi Batalyon sebenarnya.

Selama belum diisi, panel cuaca akan menampilkan peringatan jelas (bukan data palsu).

---

## 9. Uji Tampilan HP / Mobile

- **Halaman scan APMS** (`apms-scan-*.html`, `apms-rfid-kiosk.html`) sudah dirancang **mobile-first** sejak awal — tampilan satu kolom, tombol besar, aman dibuka di HP.
- **Halaman login** sudah punya penyesuaian mobile (panel HUD disembunyikan otomatis di layar sempit, ukuran judul mengecil).
- **Dashboard utama** (`dashboard-command360-unified.html`) **dirancang untuk layar desktop/tablet** (banyak grid kolom kompleks per panel). Di layar HP, tata letak akan otomatis menyempit ke satu kolom tapi belum dioptimalkan penuh — beberapa tabel lebar (Rekapitulasi Senjata, Rincian TOP vs Nyata) kemungkinan perlu discroll ke samping. Untuk pemakaian sehari-hari oleh Danyon/Staf di lapangan lewat HP, disarankan tetap prioritaskan tablet atau laptop untuk saat ini.

---

## 10. Rencana Keamanan Akses (Belum Diimplementasi — Catatan untuk Tim IT)

Rencana Bapak (personel didaftarkan username/password + nomor WA untuk terima OTP, akses gagal kalau WA tidak terdaftar meski username/password benar) **belum diimplementasikan** di prototipe ini — OTP saat ini murni simulasi (kode ditampilkan di layar). Untuk versi produksi diperlukan:
1. Database pendaftaran personel (username, password terenkripsi, nomor WA terverifikasi).
2. Integrasi WhatsApp Business API untuk pengiriman OTP sungguhan.
3. Validasi backend yang menolak login jika nomor WA tidak terdaftar, walau username/password benar.

**Alur edit data oleh Staf/Kompi** juga belum ada di prototipe ini (dashboard bersifat read-only/tampilan saja). Opsi untuk versi produksi: (a) form input terpisah per-role, atau (b) tombol "Edit" langsung di tiap kartu data. Belum dikerjakan — tunggu arahan lanjut.

---

## 11. Yang Masih Perlu Dikembangkan (Ringkasan)

1. Backend & database sungguhan (poin paling mendasar — segala sesuatu di atas ini bergantung padanya).
2. Autentikasi & OTP sungguhan (§10).
3. Form edit data per-role (§10).
4. Tombol ekspor/cetak untuk tabel-tabel selain Daily Briefing (§7).
5. Optimasi tampilan dashboard utama untuk layar HP (§9).
6. Sinkronisasi APMS lintas-perangkat — perlu backend, localStorage tidak cukup (§6).
7. Reader NFC fisik sungguhan — saat ini `apms-rfid-kiosk.html` masih pakai tombol simulasi.

---

## 12. Dukungan

Prototipe ini dikembangkan bertahap lewat sesi diskusi dengan Claude (Anthropic). Untuk perubahan lanjutan, lanjutkan percakapan yang sama, atau sertakan file-file ini sebagai referensi di sesi baru.
