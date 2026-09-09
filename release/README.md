# Gradient Nitro Glass — Release Packages

Direktori ini berisi paket biner `.vsix` lokal dan berkas checksum `.sha256` hasil kompilasi ekstensi.

- Seluruh paket `.vsix` otomatis dihasilkan ke direktori ini melalui perintah:
  ```bash
  npm run package
  ```
- Validasi integritas dan pembuatan berkas `.sha256` dijalankan melalui:
  ```bash
  npm run release:check
  ```
- Paket rilis resmi dapat diunduh langsung dari [GitHub Releases Resmi](https://github.com/dadayan1234/gradient-nitro/releases).
- Lihat tabel riwayat versi dan log fitur lengkap di [docs/release-versions.md](../docs/release-versions.md).
