---
name: gradient-nitro-ops
description: Operasi rutin pengembangan, pengujian 53 test suites, regenerasi tema, pengemasan VSIX ke folder release/, dan verifikasi rilis untuk Gradient Nitro Glass. Gunakan skill ini saat melakukan build, test, packaging, atau rilis ekstensi.
---

# Gradient Nitro Ops Skill

Skill ini menyediakan panduan terstruktur bagi agen Antigravity untuk menjalankan alur kerja teknis pada repositori Gradient Nitro Glass.

## Alur Kerja Terpadu (Workflow)

### 1. Menjalankan Seluruh Pengujian & Linter
```powershell
npm test
npm run lint
```
*Catatan:* Terdapat 53 test case di `tests/` yang memvalidasi mesin OKLCH, generasi CSS gradien, isolasi runtime, dan token Modern UI. Semua harus lulus.

### 2. Meregenerasi Berkas Tema JSON
Bila ada perubahan pada `src/palette.ts`:
```powershell
npm run themes:generate
```
Perintah ini akan memperbarui `themes/gradient-nitro-theme.json` dan `themes/gradient-nitro-light-theme.json`.

### 3. Mengemas Paket Ekstensi ke Folder `release/`
```powershell
npm run package
```
Ekstensi akan dikompilasi, diperiksa pra-publikasi, dan disimpan ke `release/gradient-nitro-glass-<version>.vsix`.

### 4. Memverifikasi Artefak Rilis & SHA-256
```powershell
npm run release:check
```
Memverifikasi arsip zip VSIX, struktur frame GIF animasi, URL gambar README, serta memperbarui file `release/*.vsix.sha256`.

### 5. Memeriksa Ketersediaan Gambar Publik
Setelah perubahan di-push ke GitHub `main`:
```powershell
npm run release:media
```
