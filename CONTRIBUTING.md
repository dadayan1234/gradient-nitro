# Panduan Kontribusi (Contributing Guide)

Terima kasih atas minat Anda untuk berkontribusi pada **Gradient Nitro Glass**! Kami menyambut baik laporan bug, saran perbaikan, dan kontribusi kode dari komunitas pengembang.

---

## 1. Alur Kerja Kontribusi (Workflow)

1. **Fork Repositori**: Buat fork repositori [dadayan1234/gradient-nitro](https://github.com/dadayan1234/gradient-nitro) ke akun GitHub Anda.
2. **Buat Branch Fitur**:
   ```bash
   git checkout -b feat/nama-fitur-anda
   ```
3. **Setup Lingkungan Pengembangan**:
   ```bash
   npm install
   npm run compile
   ```
4. **Jalankan Pengujian & Linter**:
   Pastikan seluruh test lokal lulus sebelum mengajukan Pull Request:
   ```bash
   npm test
   npm run lint
   ```
5. **Ajukan Pull Request**: Buka Pull Request ke branch `main` dengan deskripsi jelas mengenai perubahan yang Anda lakukan.

---

## 2. Klausul Perjanjian Lisensi Kontribusi (Contributor License Grant)

Dengan mengajukan *Pull Request*, *patch*, kode, dokumentasi, atau materi lainnya (disebut sebagai "**Kontribusi**") ke repositori ini, Anda menyetujui ketentuan berikut:

### A. Hak Cipta dan Pemberian Lisensi (Grant of Rights)
1. Anda menyatakan dan menjamin bahwa Kontribusi yang Anda kirimkan adalah karya asli Anda sendiri, atau Anda memiliki hak hukum yang sah atas Kontribusi tersebut untuk dilisensikan sesuai ketentuan ini.
2. Anda memberikan kepada pemilik proyek (**dadayan1234**) lisensi hak cipta yang bersifat:
   - **Abadi (*Perpetual*)**,
   - **Berlaku di seluruh dunia (*Worldwide*)**,
   - **Bebas royalti (*Royalty-free*)**,
   - **Tidak dapat ditarik kembali (*Irrevocable*)**, dan
   - **Non-eksklusif**,
   untuk menggunakan, mereproduksi, memodifikasi, menampilkan secara publik, mendistribusikan, mensublisensikan, mengkomersialkan, dan memasukkan Kontribusi Anda ke dalam proyek Gradient Nitro Glass di bawah lisensi apa pun yang ditentukan oleh pemilik proyek (termasuk lisensi saat ini maupun lisensi masa depan).

### B. Developer Certificate of Origin (DCO)
Setiap commit yang Anda ajukan dianggap memenuhi ketentuan *Developer Certificate of Origin* (DCO):
- Kontribusi diciptakan seluruhnya atau sebagian oleh Anda, dan Anda berhak menyediakannya untuk proyek ini.
- Kontribusi tidak melanggar hak cipta, paten, merek dagang, atau rahasia dagang pihak ketiga.
- Anda memahami bahwa proyek dan Kontribusi Anda bersifat publik dan riwayat catatan kontribusi akan disimpan secara permanen.

> [!NOTE]
> Klausul ini memastikan proyek dapat terus dikelola, dilindungi secara hukum, dan didistribusikan secara berkelanjutan tanpa risiko sengketa hak cipta di masa depan.
