---
description: Protokol pengemasan ekstensi, verifikasi checksum, dan rilis versi Gradient Nitro Glass.
globs: ["release/**", "scripts/**", "package.json"]
---

# Release Protocol Rules

1. **Target Direktori Rilis**:
   - Seluruh artefak biner `.vsix` dan berkas `.sha256` wajib disimpan di folder `release/` (`npm run package`).
   - Jangan meletakkan file `.vsix` di root repositori.
2. **Validasi Rilis Lokal**:
   - Jalankan `npm run release:check` sebelum membuat tag rilis.
   - Skrip Python ini memvalidasi integritas file VSIX, lockfile, kesesuaian preset Midnight Studio, serta struktur frame animasi GIF.
3. **Validasi Media Publik**:
   - Setelah push ke GitHub `main`, jalankan `npm run release:media` untuk memastikan semua gambar README diakses publik tanpa error 404.
4. **Kepatuhan Lisensi**:
   - Versi sebelum dan sampai dengan `v1.5.3` dilindungi oleh MIT License.
   - Versi berikutnya tunduk pada PolyForm Noncommercial License 1.0.0.
