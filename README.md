# musa-landing

Landing page statis untuk Musa (pure HTML/CSS/JS, tanpa build step).

- `index.html` — perkenalan + download + fitur + FAQ
- `release.html` — ringkasan rilis terbaru + arsip versi lama + checksum
- `app.js` — **config manual** `MUSA_RELEASE` (versi, tanggal, notes, URL file). Tidak fetch GitHub API karena repo kode private.
- `styles.css` — tema gelap responsif

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
2. Edit `MUSA_RELEASE` di `app.js`: `version`, `date`, `notes`, dan 6 URL file (`#` = belum ada, tombol otomatis redup via `.is-pending`).
3. Tambah satu baris ke tabel Arsip di `release.html`.
4. Isi blok checksum SHA-256 dari artifacts CI.
