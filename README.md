# musa-landing

Landing page statis untuk Musa (pure HTML/CSS/JS, tanpa framework).
Halaman rilis dibuat **statis per versi** (SEO-friendly) dan digenerate
dari satu sumber kebenaran: `releases.json`.

> Domain default di canonical/OG/sitemap adalah
> `https://alfiansetia.github.io/musa-landing/`. Kalau deploy ke domain lain
> (misal `https://musa.kacangan.net`), ganti **satu tempat**: field `site`
> di `releases.json`, lalu jalankan `node tools/build.mjs`.
> Jangan find-replace manual per file — file di `rilis/` itu hasil generate.

## Struktur folder

```
index.html            Beranda (hero + download + fitur + FAQ).
                      Bagian download dinamis via version.json (badge versi,
                      tombol per-OS), konten lainnya statis.

rilis/                GENERATED, tidak di-commit. Arsip + halaman per versi.
  index.html          Arsip rilis — kartu versi terbaru + tabel arsip.
  v1.0.0/index.html   Halaman per versi — download, changelog,
  v1.1.0/index.html   catatan install, checksum. Satu versi = satu URL.

releases.json         SUMBER KEBENARAN (di-push). Daftar semua rilis: versi,
                      tanggal, notes, changes, dan URL files. Edit tiap rilis.

version.json          GENERATED, tidak di-commit. Dibangun dari releases.json
                      (rilis terbaru) saat `node tools/build.mjs` / docker build.
                      Dibaca landing (app.js) SEKALIGUS aplikasi
                      (Settings → General → Update) untuk cek pembaruan.

sitemap.xml           GENERATED, tidak di-commit (/, /rilis/, /rilis/vX/ per versi).

release.html          Redirect legacy (canonical + meta refresh) ke rilis/.
                      Jangan dihapus — menjaga backlink lama tetap hidup.

downloads/
  v1.0.0/             Taruh installer HASIL BUILD di sini per versi.
  v1.1.0/             Nama file bebas, nanti terdeteksi otomatis (lihat tabel).
  .gitkeep            (placeholder agar folder ikut ke-commit)

tools/build.mjs       Generator (Node >= 18, tanpa dependensi). Dijalankan
                      manual (`node tools/build.mjs`) atau otomatis di docker build.

Dockerfile            Multi-stage: node:20-alpine (build) → nginx:alpine (serve).
nginx.conf            Config nginx: try_files, 301 /release.html, cache /downloads/.
docker-compose.yml    Jalankan lokal: `docker compose up --build` (+ SITE_URL/PORT).
.dockerignore         Batasi konteks build (tanpa .git).
.gitignore            generated (rilis/, version.json, sitemap.xml) + downloads/v*/
                      tidak di-commit — dibangun ulang saat deploy.

app.js, styles.css, assets/, robots.txt, site.webmanifest
```

## Alur rilis baru (3 langkah, ~2 menit)

Skenario: rilis `v1.1.0`.

**1. Scaffold entri + folder:**

```bash
node tools/build.mjs --new 1.1.0
```

Ini menambah entri baru ke `releases.json` (dicopy dari versi sebelumnya,
semua URL `"#"`) dan membuat folder kosong `downloads/v1.1.0/`.

**2. Isi data rilis** — edit entri baru di `releases.json`:

```json
{
  "version": "1.1.0",
  "date": "5 November 2026",
  "notes": "Satu kalimat ringkasan untuk meta description + arsip.",
  "changes": ["poin 1 apa yang berubah", "poin 2"],
  "files": { "x64-setup": "#", "...": "#" }
}
```

Biarkan `"#"` untuk file yang belum ada — tombolnya otomatis redup
(`.is-pending`). Kalau pakai hosting eksternal (R2/dll), isi URL langsung:

```json
"files": { "x64-setup": "https://files.contoh.net/musa/Musa_1.1.0_x64-setup.exe" }
```

**3. Taruh file build + generate:**

```bash
# copy hasil build CI ke folder versi (nama file bebas, contoh):
#   downloads/v1.1.0/Musa_1.1.0_x64-setup.exe
#   downloads/v1.1.0/musa_1.1.0_amd64.deb
#   ...

node tools/build.mjs
```

Selesai. Script akan:

- mendeteksi file di `downloads/v1.1.0/` berdasarkan pola nama (tabel di bawah),
- menghitung **SHA-256** tiap file → tampil di halaman versi + ditulis ke
  `downloads/v1.1.0/SHA256SUMS.txt` (ikut ke-commit sebagai bukti),
- menulis ulang `rilis/index.html`, `rilis/v1.1.0/index.html`,
  `version.json` (versi terbaru), dan `sitemap.xml`,
- lalu tinggal `git add + commit + push`.

## Auto-detect nama file

File di `downloads/vX.Y.Z/` dipetakan ke 6 slot berdasarkan pola
(case-insensitive, yang pertama cocok menang):

| Slot (`releases.json`) | Pola nama file              | Contoh                              |
| ---------------------- | --------------------------- | ----------------------------------- |
| `x64-setup`            | `*x64*.exe`                 | `Musa_1.1.0_x64-setup.exe`          |
| `x86-setup`            | `*x86*.exe`, `*ia32*.exe`   | `Musa_1.1.0_x86-setup.exe`          |
| `dmg`                  | `*.dmg`                     | `Musa_1.1.0_aarch64.dmg`            |
| `app-targz`            | `*.app.tar.gz`, `*.tar.gz`  | `Musa_1.1.0_aarch64.app.tar.gz`     |
| `deb`                  | `*.deb`                     | `musa_1.1.0_amd64.deb`              |
| `appimage`             | `*.AppImage`                | `Musa_1.1.0_amd64.AppImage`         |

Catatan:

- Prioritas selalu: **URL eksplisit di `releases.json`** (selain `"#"`)
  menang atas file lokal. Jadi R2 + file lokal bisa campur per slot.
- File yang tidak cocok pola apapun diabaikan (tetap ikut ter-upload,
  tapi tidak jadi tombol download).
- `SHA256SUMS.txt` lama tidak dihitung ulang sebagai slot.
- Link tombol di HTML memakai **path relatif** (`../../downloads/...`)
  sehingga tetap benar di domain/subpath apapun; di `version.json`
  (untuk aplikasi) ditulis **absolut** (`{site}/downloads/...`).

## Hosting file build: lokal vs eksternal

|                        | `downloads/` (repo ini)              | Eksternal (R2 / object storage)          |
| ---------------------- | ------------------------------------ | ---------------------------------------- |
| Cocok untuk            | file kecil, rilis jarang             | file besar (>50 MB), traffic besar       |
| Batas                  | GitHub: maks 100 MB/file, repo ±1 GB | mengikuti paket storage                  |
| Cara                   | copy file → `node tools/build.mjs`   | upload → paste URL ke `releases.json`    |
| Checksum               | otomatis dihitung                    | isi manual / tempel output `sha256sum`   |

Rekomendasi: installer Windows/macOS/Linux (±3–50 MB) masih aman di repo
untuk tahap awal. Kalau total repo membengkak, pindah ke R2 tanpa ubah
alur — cukup ganti value `files` jadi URL.

## Kenapa struktur per-versi (catatan SEO)

- Dulu satu `release.html` yang isinya dimuat via `fetch(version.json)`
  — crawler melihat halaman nyaris kosong. Sekarang tiap versi adalah
  HTML statis penuh (judul, changelog, link, checksum ada di source).
- Satu versi = satu URL kanonis (`/rilis/v1.1.0/`) + `SoftwareApplication`
  JSON-LD (`softwareVersion`, `datePublished`, `downloadUrl`) → layak
  tampil sebagai rich result & enak di-share.
- `rilis/index.html` hanya berisi ringkasan + link ke tiap versi
  (hindari konten duplikat penuh di halaman arsip).
- `og:image`/`twitter:image` memakai URL **absolut** (wajib untuk scraper
  sosmed); favicon/CSS memakai relatif (portabel antar domain).
- `release.html` lama dipertahankan sebagai redirect + `noindex`
  supaya URL lama tidak 404 dan tidak jadi konten duplikat.

## Jalankan lokal (tanpa Docker)

```bash
cd musa-landing
node tools/build.mjs          # wajib sekali setelah clone (file generated tidak di-commit)
python3 -m http.server 8080
# buka http://localhost:8080/ dan http://localhost:8080/rilis/
```

## Deploy (Docker — cara utama)

Yang di-push hanya sumber: `index.html`, `releases.json`, `downloads/`,
aset, dan config. File hasil generate (`rilis/`, `version.json`,
`sitemap.xml`) **tidak di-commit** (lihat `.gitignore`) — dibangun ulang
di dalam image saat `docker build` (tahap `builder` menjalankan
`node tools/build.mjs`).

```bash
# Build + jalan lokal
docker compose up --build
# buka http://localhost:8080/ dan http://localhost:8080/rilis/

# Domain lain (canonical/OG/sitemap + page di version.json ikut ganti):
SITE_URL=https://musa.kacangan.net docker compose up --build

# Port lain:
PORT=9000 docker compose up --build
```

Isi compose (`docker-compose.yml`): build dari `Dockerfile`
multi-stage (`node:20-alpine` build → `nginx:alpine` serve),
`restart: unless-stopped`. File internal (`tools/`, `releases.json`,
`Dockerfile`, dll) tidak ikut di-serve — cek: `/releases.json` → 404.

Catatan:

- Kalau pakai file lokal di `downloads/vX.Y.Z/`, file itu harus ada
  saat `docker build` (ikut konteks build, lalu ikut ke image).
  Kalau pakai URL eksternal di `releases.json`, tidak ada yang perlu
  disiapkan — paling ringan untuk image.
- `nginx.conf`: `try_files` untuk URL bersih (`/rilis/v1.0.0/`),
  redirect permanen 301 `/release.html` → `/rilis/`,
  cache lama khusus `/downloads/` (nama file berversi, aman),
  gzip untuk css/js/json/svg.
- Masih mau GitHub Pages (tanpa Docker)? Bisa: jalankan
  `node tools/build.mjs` dulu lalu `git add -f rilis version.json sitemap.xml`
  sebelum push. Tapi jangan campur dua alur tanpa sadar.

## Deploy (alternatif: GitHub/Cloudflare Pages)

Folder ini tetap bisa jadi web root apa adanya (tanpa build command),
asal file generated ikut ter-commit (lihat catatan `-f` di atas).

- **GitHub Pages**: Settings → Pages → Deploy from branch → `main` / root.
- **Cloudflare Pages**: New Project → Upload assets / connect git →
  output = folder ini.

## Cek pembaruan dari aplikasi

Aplikasi mengambil `https://musa.kacangan.net/version.json` saat user
menekan tombol update (Settings → General → Update). Pastikan domain itu
mengarah ke hosting folder ini. Format `version.json` dijaga kompatibel:

```json
{ "version": "1.1.0", "date": "...",
  "page": "https://alfiansetia.github.io/musa-landing/rilis/v1.1.0/",
  "notes": "...", "changes": ["..."], "files": { "x64-setup": "https://..." } }
```

`FALLBACK_RELEASE` di `app.js` hanya untuk preview `file://` (tanpa server)
— sinkronkan manual (`version` + `date`) kalau berubah, tidak kritis.

## Troubleshooting

- `node tools/build.mjs` error `releases.json kosong` → pastikan ada
  minimal 1 entri dan field `site` terisi.
- Tombol tetap redup setelah copy file → cek pola nama (tabel di atas)
  dan pastikan ekstensi benar (`.exe`, bukan `.EXE`? — aman, case-insensitive;
  yang sering salah: `.tar.gz` harus mengandung `.app.tar.gz` atau minimal
  `.tar.gz`).
- Link download 404 di Pages tapi lokal OK → `git status`: pastikan folder
  `downloads/vX.Y.Z/` ikut ter-add (bukan ke-ignore), lalu push.
- Ganti domain → ubah `site` di `releases.json` → `node tools/build.mjs`
  → canonical/OG/sitemap/version.json ikut regenerasi sekaligus.
- Perlu URL canonical custom per rilis? Tidak didukung — kanonis selalu
  `{site}/rilis/vX.Y.Z/`. Kalau butuh, diskusikan dulu sebelum hack manual
  karena file `rilis/` akan tertimpa tiap build.
