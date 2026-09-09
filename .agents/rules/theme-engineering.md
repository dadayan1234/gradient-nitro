---
description: Aturan rekayasa tema, standar warna OKLCH, dan isolasi runtime workbench Gradient Nitro Glass.
globs: ["src/**/*.ts", "themes/**/*.json", "media/**/*.js"]
---

# Theme Engineering Rules

1. **OKLCH Math & Clamping**:
   - Seluruh derivasi warna gradien dan peran antarmuka harus menggunakan transformasi ruang warna OKLCH di `src/palette.ts`.
   - Pastikan nilai LCH selalu di-clamp pada batas fisik gamut RGB yang valid (0–1).
2. **Kepatuhan Aksesibilitas (WCAG AA)**:
   - Kontras teks pada elemen yang dipilih (*selected*) dan di-hover terhadap background harus memiliki rasio kontras minimal 4.5:1.
   - Gunakan fungsi `contrastRatio` dan `readableIndicator` untuk menentukan warna teks/ikon secara dinamis.
3. **Isolasi Token Sintaks vs Workbench**:
   - Perubahan pada warna workbench (`BASE` / `ACCENT`) dilarang mengubah atau mewarnai ulang token sintaks bahasa pemrograman. Keduanya memiliki alur derivasi independen.
4. **Permukaan AI Antigravity IDE**:
   - Dukung token `chat.*`, `inlineChat.*`, `interactive.*`, dan `diffEditor.*` agar antarmuka AI di Antigravity IDE selalu serasi dengan aura gradien dan frosted glass tema.
