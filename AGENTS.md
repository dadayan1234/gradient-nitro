# Antigravity Workspace Guide — Gradient Nitro Glass

Selamat datang di repositori **Gradient Nitro Glass** (`dadayan1234/gradient-nitro`). Dokumen ini adalah panduan resmi bagi **Google Antigravity Agent** (IDE, CLI, dan 2.0) saat bekerja di dalam repositori ini.

---

## 1. Ikhtisar Proyek (Project Overview)

- **Deskripsi:** Ekstensi tema VS Code & runtime workbench dengan estetika *frosted glass*, gradien berkesinambungan, dan pencahayaan lembut (*softlight*).
- **Teknologi Utama:** TypeScript, Node.js, VS Code Extension API, OKLCH Perceptual Color Math, CSS Workbench Runtime Ingestion, Python (Release Validator).
- **Status Lisensi:**
  - Versi rilis `<= v1.5.3`: Tetap di bawah **MIT License** (permanen & tidak dapat ditarik kembali).
  - Versi rilis `> v1.5.3`: Berada di bawah **PolyForm Noncommercial License 1.0.0** (lihat [LICENSE.md](LICENSE.md) dan [RE-LICENSING.md](RE-LICENSING.md)).
  - Kontribusi Pull Request: Mengikuti ketentuan *Contributor License Grant* di [CONTRIBUTING.md](CONTRIBUTING.md).

---

## 2. Arsitektur Kode (Core Architecture)

Agen Antigravity harus memahami pemisahan tanggung jawab (*separation of concerns*) berikut:

1. **Mesin Palet Warna OKLCH (`src/palette.ts`)**:
   - Menghasilkan token warna secara perseptual dari kombinasi `BASE` + `ACCENT`.
   - Menjamin rasio kontras teks minimal 4.5:1 (kepatuhan WCAG AA).
   - Menyediakan token antarmuka workbench, file icons, serta permukaan AI Antigravity (`chat.*`, `inlineChat.*`, `diffEditor.*`).
2. **Mesin Efek & Dynamic CSS (`src/workbenchEffects.ts`)**:
   - Membangun CSS dinamis untuk gradien viewport, editor softlight radial, backdrop blur (glassmorphism), dan efek spring motion.
3. **Runtime Helper & Session Recovery (`src/workbenchRuntime.ts`)**:
   - Mengelola injeksi CSS aman ke workbench HTML dengan sistem backup dan session journal.
   - Mengembalikan tema ke default saat deactivation atau ganti tema.
4. **Theme Studio Webview (`media/customizer.js` & `src/extension.ts`)**:
   - Antarmuka interaktif Theme Studio untuk pratinjau live tanpa latensi.
5. **Artefak Rilis (`release/`)**:
   - Seluruh paket binary `.vsix` dan berkas `.sha256` tersimpan di folder `release/`. Dilarang menaruh file biner di root proyek.

---

## 3. Standar & Perintah Verifikasi (Verification Commands)

Sebelum mengusulkan perubahan atau menyelesaikan tugas, agen Antigravity **WAJIB** menjalankan verifikasi berikut:

```powershell
# 1. Kompilasi TypeScript & Jalankan 53 Test Suites
npm test

# 2. Periksa Sintaks & Type Checking
npm run lint

# 3. Regenerasi File Tema JSON setelah mengubah src/palette.ts
npm run themes:generate

# 4. Kemas Ekstensi (otomatis disimpan ke folder release/)
npm run package

# 5. Validasi Artefak Rilis & Update SHA-256
npm run release:check
```

---

## 4. Aturan Penting bagi Antigravity Agent

1. **Integritas Uji Regresi**: Jangan memodifikasi pengujian di `tests/` kecuali fitur yang diuji memang berubah secara sah. Seluruh 53 pengujian harus selalu *pass*.
2. **Dilarang Menghapus Komentar/Docstring Asli**: Pertahankan dokumentasi teknis di codebase.
3. **Manajemen File Biner**: Jangan pernah menghapus konfigurasi `.gitignore` untuk `*.vsix`. File biner hanya boleh berada di direktori `release/`.
4. **Dukungan Antigravity IDE**: Saat menambah atau memperbarui token workbench, pastikan elemen AI Antigravity (Chat panel, Inline diff, Agent code lens) tetap harmonis dengan palet tema.
