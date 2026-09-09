# Gradient Nitro Glass — Release Versions & Feature Log

Dokumen ini menyajikan riwayat lengkap versi rilis **Gradient Nitro Glass**, log fitur dan perbaikan pada setiap versi, serta akses unduhan paket binary `.vsix` baik melalui **GitHub Releases** maupun berkas lokal di folder `release/`.

---

## Tabel Versi Rilis (Release Versions Table)

> [!NOTE]
> Seluruh artefak binary `.vsix` lokal tersimpan rapi di dalam direktori **[`release/`](../release/)** dan tidak mengotori direktori root proyek. Untuk pengguna publik, berkas `.vsix` dapat diunduh secara resmi melalui **[GitHub Releases](https://github.com/dadayan1234/gradient-nitro/releases)**.

| Versi | Tanggal Rilis | Target VS Code | Fitur Utama & Ringkasan Perubahan | Download VSIX (GitHub) | Berkas Lokal | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`v1.5.3`** | 2026-09-09 | `^1.129.0`<br>*(Tested 1.136.1)* | Preset Midnight Studio, lavender softlight, validasi media & SHA-256 | [Download v1.5.3](https://github.com/dadayan1234/gradient-nitro/releases/download/v1.5.3/gradient-nitro-glass-1.5.3.vsix) | `release/gradient-nitro-glass-1.5.3.vsix` | `Latest Stable` |
| **`v1.5.2`** | 2026-09-09 | `^1.129.0`<br>*(Tested 1.136.1)* | Lapisan Explorer & terminal transparan, kontras teks seleksi, Save & Apply side-menu | [Download v1.5.2](https://github.com/dadayan1234/gradient-nitro/releases/download/v1.5.2/gradient-nitro-glass-1.5.2.vsix) | `release/gradient-nitro-glass-1.5.2.vsix` | `Stable` |
| **`v1.5.1`** | 2026-09-09 | `^1.129.0`<br>*(Tested 1.136.1)* | Perbaikan grid Modern UI, pengaturan Border (0–4px, warna, visibilitas) | [Download v1.5.1](https://github.com/dadayan1234/gradient-nitro/releases/download/v1.5.1/gradient-nitro-glass-1.5.1.vsix) | `release/gradient-nitro-glass-1.5.1.vsix` | `Stable` |
| **`v1.5.0`** | 2026-09-08 | `^1.129.0`<br>*(Tested 1.136.1)* | Arsitektur visual versioned, drag controls, editor softlight, 5 preset OKLCH | [Download v1.5.0](https://github.com/dadayan1234/gradient-nitro/releases/download/v1.5.0/gradient-nitro-glass-1.5.0.vsix) | `release/gradient-nitro-glass-1.5.0.vsix` | `Stable` |
| **`v1.4.0`** | 2026-09-08 | `^1.129.0`<br>*(Tested 1.136.1)* | Preview workbench full-canvas, panel kontrol responsif, undo/redo grup | [Download v1.4.0](https://github.com/dadayan1234/gradient-nitro/releases/download/v1.4.0/gradient-nitro-glass-1.4.0.vsix) | `release/gradient-nitro-glass-1.4.0.vsix` | `Stable` |
| **`v1.3.2`** | 2026-09-07 | `^1.129.0` | Panduan instalasi customizer terperinci dan tangkapan layar beranotasi | [Download v1.3.2](https://github.com/dadayan1234/gradient-nitro/releases/download/v1.3.2/gradient-nitro-glass-1.3.2.vsix) | `release/gradient-nitro-glass-1.3.2.vsix` | `Archive` |
| **`v1.3.1`** | 2026-09-07 | `^1.129.0` | Header panel gelap, permukaan tab aktif kontras, pengaturan font editor | [Download v1.3.1](https://github.com/dadayan1234/gradient-nitro/releases/download/v1.3.1/gradient-nitro-glass-1.3.1.vsix) | `release/gradient-nitro-glass-1.3.1.vsix` | `Archive` |
| **`v1.3.0`** | 2026-09-07 | `^1.129.0` | Helper runtime terikat sesi, radius adaptif, mode borderless, kontrol intensitas | [Download v1.3.0](https://github.com/dadayan1234/gradient-nitro/releases/download/v1.3.0/gradient-nitro-glass-1.3.0.vsix) | `release/gradient-nitro-glass-1.3.0.vsix` | `Archive` |
| **`v1.2.0`** | 2026-09-07 | `^1.129.0` | Integrasi rounded corner Modern UI native, palet per bahasa, semantic tokens | [Download v1.2.0](https://github.com/dadayan1234/gradient-nitro/releases/download/v1.2.0/gradient-nitro-glass-1.2.0.vsix) | `release/gradient-nitro-glass-1.2.0.vsix` | `Archive` |
| **`v1.1.0`** | 2026-09-07 | `^1.129.0` | Migrasi ke warna native ter-scoped, recovery legacy nitro CSS, kontrol SVG | [Download v1.1.0](https://github.com/dadayan1234/gradient-nitro/releases/download/v1.1.0/gradient-nitro-glass-1.1.0.vsix) | `release/gradient-nitro-glass-1.1.0.vsix` | `Archive` |
| **`v1.0.8`** | 2026-09-05 | `^1.129.0` | Mode High-Contrast Light dengan CSS scoping dual-theme | [Download v1.0.8](https://github.com/dadayan1234/gradient-nitro/releases/download/v1.0.8/gradient-nitro-glass-1.0.8.vsix) | `release/gradient-nitro-glass-1.0.8.vsix` | `Archive` |
| **`v1.0.7`** | 2026-09-05 | `^1.129.0` | Scoping ketat `colorCustomizations` ke `[Gradient Nitro Glass]` & fix reset bersih | [Download v1.0.7](https://github.com/dadayan1234/gradient-nitro/releases/download/v1.0.7/gradient-nitro-glass-1.0.7.vsix) | `release/gradient-nitro-glass-1.0.7.vsix` | `Archive` |
| **`v1.0.6`** | 2026-09-05 | `^1.129.0` | Pembersihan patch file system untuk kepatuhan penuh kebijakan Marketplace | [Download v1.0.6](https://github.com/dadayan1234/gradient-nitro/releases/download/v1.0.6/gradient-nitro-glass-1.0.6.vsix) | `release/gradient-nitro-glass-1.0.6.vsix` | `Archive` |
| **`v1.0.5`** | 2026-09-04 | `^1.129.0` | Aliran gradien ke editor, explorer & tabs; kartu pop-up bersudut bulat | [Download v1.0.5](https://github.com/dadayan1234/gradient-nitro/releases/download/v1.0.5/gradient-nitro-glass-1.0.5.vsix) | `release/gradient-nitro-glass-1.0.5.vsix` | `Archive` |
| **`v1.0.4`** | 2026-09-04 | `^1.129.0` | Integrasi tab editor header, breadcrumbs, dan efek frosted glass capsule | [Download v1.0.4](https://github.com/dadayan1234/gradient-nitro/releases/download/v1.0.4/gradient-nitro-glass-1.0.4.vsix) | `release/gradient-nitro-glass-1.0.4.vsix` | `Archive` |
| **`v1.0.3`** | 2026-09-04 | `^1.129.0` | Penyesuaian layout dan transisi warna gradien sekunder | [Download v1.0.3](https://github.com/dadayan1234/gradient-nitro/releases/download/v1.0.3/gradient-nitro-glass-1.0.3.vsix) | `release/gradient-nitro-glass-1.0.3.vsix` | `Archive` |
| **`v1.0.2`** | 2026-09-03 | `^1.129.0` | Optimasi tampilan frosted glass dan tuning stop warna | [Download v1.0.2](https://github.com/dadayan1234/gradient-nitro/releases/download/v1.0.2/gradient-nitro-glass-1.0.2.vsix) | `release/gradient-nitro-glass-1.0.2.vsix` | `Archive` |
| **`v1.0.1`** | 2026-09-03 | `^1.129.0` | Penyesuaian manifest ekstensi dan perbaikan aset pengemasan | [Download v1.0.1](https://github.com/dadayan1234/gradient-nitro/releases/download/v1.0.1/gradient-nitro-glass-1.0.1.vsix) | `release/gradient-nitro-glass-1.0.1.vsix` | `Archive` |
| **`v1.0.0`** | 2026-09-03 | `^1.129.0` | Rilis perdana tema Gradient Nitro Glass dengan palet Emerald ke Violet | [Download v1.0.0](https://github.com/dadayan1234/gradient-nitro/releases/download/v1.0.0/gradient-nitro-glass-1.0.0.vsix) | `release/gradient-nitro-glass-1.0.0.vsix` | `Archive` |

---

## Log Fitur Terperinci (Detailed Feature Log)

### 🌟 Versi 1.5.3 (2026-09-09) — *Latest Stable*
- **Midnight Studio Preset**: Memperkenalkan konfigurasi bawaan `Midnight Studio` (`#243B61` midnight indigo & `#51344F` plum dengan pencahayaan lembut lavender) yang dapat diimpor langsung melalui [docs/midnight-studio.gradient-nitro.json](midnight-studio.gradient-nitro.json).
- **Validasi Rilis Terintegrasi**: Skrip verifikasi rilis otomatis `scripts/check-release.py` untuk memvalidasi keselarasan versi package/lockfile, struktur frame animasi GIF, validitas URL publik gambar HTTPS, serta menghitung berkas verifikasi SHA-256 (`release/gradient-nitro-glass-1.5.3.vsix.sha256`).
- **Penyegaran Tangkapan Layar**: Memperbarui seluruh visual dokumentasi dan animasi dari satu konfigurasi rilis terpadu.

### 🌟 Versi 1.5.2 (2026-09-09)
- **Explorer & Terminal Glass Transparency**: Mengeliminasi lapisan buram (*opaque*) pada Explorer dan panel terminal di layout Classic maupun Modern UI.
- **Kontras Teks & Seleksi**: Memperkuat kontras teks dan warna isian (*fill*) saat item dipilih (*selected*) atau di-hover pada daftar file, tab, menu, dan navigasi.
- **Aksi Cepat Menu Samping**: Menambahkan tombol "Save and Apply Configuration" langsung pada panel samping Gradient Nitro di Activity Bar dan toolbar judulnya.

### 🌟 Versi 1.5.1 (2026-09-09)
- **Perbaikan Grid Modern UI**: Mengatasi masalah lapisan grid Modern UI yang menutupi gradien setelah melakukan "Save Theme".
- **Kontrol Borders Lengkap**: Menambahkan bagian pengaturan Border di Theme Studio dengan color picker, input hex, slider ketebalan 0–4px, slider visibilitas, dan tombol aktif/nonaktif.
- **Pengujian Regresi**: Memperluas pengujian integrasi Preview → Save dan verifikasi rendering border pada ekstensi yang dipaketkan.

### 🌟 Versi 1.5.0 (2026-09-08)
- **Restorasi Sub-sistem Gradien**: Gradien ambient dan pencahayaan lembut (*softlight*) di area editor dijadikan fitur visual utama kelas satu.
- **Adjustable Softness**: Kontrol transisi kelembutan gradien (Defined, Balanced, Very Soft) yang terpisah dari opasitas.
- **Editor-Centered Softlight**: Penerangan lembut melingkar di tengah editor tanpa menyilaukan sidebar atau chrome titlebar.
- **Mesin Palet OKLCH Perseptual**: Menghasilkan seluruh peran warna secara harmonis dari formula Base + Accent (`gradient-base`, `gradient-accent`, `gradient-softlight`, dsb.).
- **5 Preset Harmonis**: *Nitro Aqua*, *Mint*, *Electric Violet*, *Nitro Pink*, dan *Electric Blue*.
- **Drag & Drop Studio Controls**: Panel kontrol Theme Studio dapat digeser bebas atau diminimalkan menjadi bottom-sheet pada resolusi sempit.
- **Preset Impor & Ekspor Lengkap**: Menyimpan dan memulihkan seluruh parameter tema dalam format JSON mandiri.

### 🌟 Versi 1.4.0 (2026-09-08)
- **Full-Canvas Workbench Preview**: Pratinjau interaktif canvas penuh dengan kontrol mengambang (*floating controls*).
- **Undo / Redo Berkelompok**: Kemudahan membatalkan atau mengulang perubahan pengaturan secara instan.
- **Diagnostik Kontras & Inspeksi Palet**: Pengujian rasio kontras warna secara real-time terhadap standar keterbacaan WCAG.
- **Pemisahan Pengaturan Sintaks**: Sintaks bahasa pemrograman dipisahkan secara bersih dari palet workbench.

### 🌟 Versi 1.3.0 – 1.3.2 (2026-09-07)
- **Session-bound Renderer Helper**: Gradien pada editor dan workbench diikat pada sesi aktif dengan pemulihan otomatis saat pergantian tema.
- **Pengaturan Tipografi Editor**: Konfigurasi font-family, font-size, font-weight, line-height, dan font ligatures langsung dari customizer.
- **Header Panel Gelap & Tab Kontras**: Peningkatan visibilitas pada panel bawah dan indikator tab aktif.

### 🌟 Versi 1.1.0 – 1.2.0 (2026-09-07)
- **Migrasi ke Native Scoped Colors**: Menggantikan pendekatan injeksi global menjadi warna-warna scoped VS Code asli yang aman dan sesuai pedoman Marketplace.
- **Modern UI Rounded Corners**: Menghubungkan sudut melengkung dengan arsitektur Modern UI bawaan VS Code.
- **Palet Sintaks Multi-Bahasa**: Dukungan semantic tokens untuk Markdown, bahasa pemrograman populer, dan grammar bawaan.

### 🌟 Versi 1.0.0 – 1.0.8 (2026-09-03 s/d 2026-09-05)
- **Rilis Perdana Gradient Nitro Glass**: Konsep tema ungu dan hijau zamrud terinspirasi Discord Nitro.
- **Webview Theme Customizer**: Antarmuka visual awal untuk memodifikasi warna stop.
- **Pematuhan Kebijakan Marketplace**: Pembersihan patch sistem file untuk memastikan keamanan dan stabilitas instalasi ekstensi.

---

## Panduan Mengunduh dan Memasang File VSIX

### Cara 1: Memasang melalui Antarmuka Grafis (GUI) VS Code
1. Unduh file `.vsix` dari tabel di atas (contoh: [gradient-nitro-glass-1.5.3.vsix](https://github.com/dadayan1234/gradient-nitro/releases/download/v1.5.3/gradient-nitro-glass-1.5.3.vsix)) atau ambil dari folder `release/` lokal.
2. Buka Visual Studio Code.
3. Buka Command Palette:
   - **Windows / Linux**: `Ctrl + Shift + P`
   - **macOS**: `Cmd + Shift + P`
4. Ketik dan pilih **`Extensions: Install from VSIX...`**.
5. Pilih file `.vsix` yang telah diunduh.
6. Tunggu konfirmasi instalasi, lalu klik **Reload Window** bila diminta.
7. Aktifkan tema via **Preferences: Color Theme** -> **Gradient Nitro Glass**.

### Cara 2: Memasang melalui Terminal / Command Prompt
Jalankan perintah berikut di root repositori:

```bash
# Memasang langsung dari folder release/ lokal
code --install-extension release/gradient-nitro-glass-1.5.3.vsix
```

Untuk VS Code Insiders:
```bash
code-insiders --install-extension release/gradient-nitro-glass-1.5.3.vsix
```

---

## Verifikasi Integritas File (SHA-256)

Untuk memastikan keaslian paket biner `.vsix` sebelum dipasang:

### Windows (PowerShell)
```powershell
Get-FileHash .\release\gradient-nitro-glass-1.5.3.vsix -Algorithm SHA256
Get-Content .\release\gradient-nitro-glass-1.5.3.vsix.sha256
```

### Linux / macOS
```bash
sha256sum -c release/gradient-nitro-glass-1.5.3.vsix.sha256
```

---

## Navigasi Dokumentasi Terkait
- [Kembali ke README Utama](../README.md)
- [Direktori Berkas Release](../release/README.md)
- [Changelog Lengkap](../CHANGELOG.md)
- [Panduan Rilis & Pembuatan Paket (docs/release-guide.md)](release-guide.md)
- [Panduan Pengujian Runtime (docs/runtime-coverage.md)](runtime-coverage.md)
- [Dokumentasi Lengkap Theme Studio (docs/theme-studio.md)](theme-studio.md)
