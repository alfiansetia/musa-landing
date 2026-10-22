# musa-landing

Landing page statis untuk Musa (pure HTML/CSS/JS, tanpa build step).

- `index.html` — perkenalan + download + fitur + FAQ
- `release.html` — ringkasan rilis terbaru + arsip versi lama + checksum
- `app.js` — baca `./version.json` (same-origin, tanpa GitHub API karena repo
  kode private). Fallback baked-in hanya untuk preview `file://`.
- `version.json` — **sumber kebenaran rilis**: `version`, `date`, `notes`,
  `changes`, dan URL `files` per-OS. Dibaca landing SEKALIGUS aplikasi
  (Settings → General → Update) — jadi satu file untuk dua konsumen.
- `styles.css` — tema gelap responsif
- `assets/` — `logo.svg`, `favicon.svg`, `apple-touch-icon.svg`, `og-image.svg`
- `sitemap.xml`, `robots.txt`, `site.webmanifest` — SEO dasar

> Domain default di canonical/OG/sitemap adalah
> `https://alfiansetia.github.io/musa-landing/`. Kalau deploy ke domain lain
> (misal Cloudflare Pages + domain sendiri), find-replace domain itu di
> `index.html`, `release.html`, `robots.txt`, `sitemap.xml`.

## Jalankan lokal

Buka `index.html` langsung, atau serve:

```bash
cd musa-landing
python3 -m http.server 8080
```

## Deploy

Folder ini repo terpisah. Opsi:

- **Cloudflare Pages**: New Project → Upload assets / connect git → output = folder ini (tanpa build command).
- **GitHub Pages**: Settings → Pages → Deploy from branch → `main` / root.

## Update rilis baru (manual)

Repo kode private → tidak ada fetch otomatis. Tiap rilis:

1. Upload installer ke hosting publik (R2 / file host pilihanmu).
2. Edit **satu file**: `version.json` — `version`, `date`, `notes`, `changes`,
   dan 6 URL `files` (`"#"` = belum ada, tombol otomatis redup via `.is-pending`).
   Sinkronkan juga `FALLBACK_RELEASE` di `app.js` (untuk preview offline).
3. Tambah satu baris ke tabel Arsip di `release.html`.
4. Isi blok checksum SHA-256 dari artifacts CI.
5. Domain `musa.kacangan.net` harus mengarah ke hosting ini — aplikasi
   mengambil `https://musa.kacangan.net/version.json` untuk cek pembaruan.
