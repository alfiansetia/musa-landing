// Generator halaman rilis statis — tanpa dependensi (Node >= 18).
//
// Cara pakai:
//   node tools/build.mjs                  -> rebuild rilis/ + version.json + sitemap.xml
//   node tools/build.mjs --new 1.1.0       -> scaffold rilis baru (copy dari versi terbaru)
//   node tools/build.mjs --base https://example.com -> override domain canonical
//
// Sumber kebenaran: releases.json (array, terbaru boleh di atas/bawah — otomatis sort semver).
// File build: taruh di downloads/vX.Y.Z/ -> otomatis terdeteksi + checksum SHA-256 dihitung.
//   Atau isi URL eksternal (R2/dll) langsung di releases.json -> dipakai apa adanya.

import { createHash } from "node:crypto";
import { readdirSync, existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RELEASES_JSON = join(ROOT, "releases.json");
const DOWNLOADS_DIR = join(ROOT, "downloads");
const RILIS_DIR = join(ROOT, "rilis");

// Key file -> label & pola nama file untuk auto-detect di downloads/
const ASSETS = [
  { key: "x64-setup", label: "Windows x64", sub: "Windows 11 · NSIS per-user", patterns: [/x64.*\.exe$/i] },
  { key: "x86-setup", label: "Windows x86", sub: "Windows 11 · NSIS per-user", patterns: [/x86.*\.exe$/i, /ia32.*\.exe$/i] },
  { key: "dmg", label: "macOS DMG", sub: "Apple Silicon (ARM64)", patterns: [/\.dmg$/i] },
  { key: "app-targz", label: ".app.tar.gz", sub: "Apple Silicon, arsip .app", patterns: [/\.app\.tar\.gz$/i, /\.tar\.gz$/i] },
  { key: "deb", label: "Linux .deb", sub: "Ubuntu x64", patterns: [/\.deb$/i] },
  { key: "appimage", label: "AppImage", sub: "Ubuntu x64, portable", patterns: [/\.appimage$/i] },
];

function args() {
  const out = {};
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === "--new") out.new = process.argv[++i];
    else if (a === "--base") out.base = process.argv[++i]?.replace(/\/+$/, "");
    else if (a.startsWith("--base=")) out.base = a.slice(7).replace(/\/+$/, "");
  }
  return out;
}

function loadReleases() {
  const raw = JSON.parse(readFileSync(RELEASES_JSON, "utf8"));
  const site = (args().base || raw.site || "").replace(/\/+$/, "");
  const list = Array.isArray(raw) ? raw : raw.releases;
  if (!Array.isArray(list) || list.length === 0) throw new Error("releases.json kosong — isi dulu 1 rilis.");
  const norm = list.map((r) => ({
    version: String(r.version).replace(/^v/i, ""),
    date: r.date || "",
    notes: r.notes || "",
    unsigned: Boolean(r.unsigned),
    support: r.support || "",
    changes: Array.isArray(r.changes) ? r.changes : [],
    files: { ...(r.files || {}) },
    checksums: { ...(r.checksums || {}) },
  }));
  norm.sort((a, b) => cmpSemver(b.version, a.version)); // terbaru dulu
  return { site, list: norm, rawIsArray: Array.isArray(raw) };
}

function cmpSemver(a, b) {
  const pa = a.split(".").map(Number), pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

function sha256(file) {
  const h = createHash("sha256");
  h.update(readFileSync(file));
  return h.digest("hex");
}

function fmtSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 ** 2) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 ** 2).toFixed(1) + " MB";
}

// Scan downloads/vX.Y.Z/ -> { key: { hrefRel, file, sha, size } }
function scanLocal(version) {
  const dir = join(DOWNLOADS_DIR, "v" + version);
  const found = {};
  if (!existsSync(dir)) return { dir, found, files: [] };
  const files = readdirSync(dir).filter((f) => {
    const p = join(dir, f);
    try { return statSync(p).isFile() && !f.startsWith(".") && f.toLowerCase() !== "sha256sums.txt"; }
    catch { return false; }
  });
  for (const f of files) {
    const asset = ASSETS.find((a) => a.patterns.some((re) => re.test(f)));
    if (asset && !found[asset.key]) {
      const abs = join(dir, f);
      found[asset.key] = {
        hrefRel: `../../downloads/v${version}/${encodeURIComponent(f)}`,
        file: f,
        sha: sha256(abs),
        size: fmtSize(statSync(abs).size),
      };
    }
  }
  return { dir, found, files };
}

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function assetHref(files, local, key, version, site) {
  // Prioritas: URL eksplisit di releases.json (kecuali "#") -> local scan -> "#"
  const v = files[key];
  if (v && v !== "#") return { href: v, external: /^https?:\/\//i.test(v), file: basename(v.split("?")[0]) || key };
  if (local[key]) return { href: local[key].hrefRel, external: false, file: local[key].file, sha: local[key].sha, size: local[key].size };
  return { href: "#", external: false, file: "", pending: true };
}

function absoluteUrl(site, href, version, file) {
  if (href !== "#") return href;
  if (file) return `${site}/downloads/v${version}/${encodeURIComponent(file)}`;
  return href;
}

function downloadCards(release, site, local) {
  const v = release.version;
  return ASSETS.map((a) => {
    const v2 = assetHref(release.files, local, a.key, v, site);
    const cls = v2.href === "#" ? "btn btn-small is-pending" : "btn btn-small";
    const extra = v2.size ? ` <span class="meta">· ${esc(v2.size)}</span>` : "";
    return `          <article class="card">
            <h3>${esc(a.label)}</h3>
            <p class="os">${esc(a.sub)}${extra}</p>
            <a class="${cls}" href="${esc(v2.href)}"${v2.external ? ' rel="noopener"' : ""}>Download ${esc(a.label)}</a>
          </article>`;
  }).join("\n");
}

function checksumBlock(release, local) {
  const v = release.version;
  const sums = release.checksums || {};
  const lines = ASSETS.map((a) => {
    const r = assetHref(release.files, local, a.key, v, "");
    if (!r.file) return null;
    const sha = r.sha || sums[r.file];
    if (sha) return `${sha}  ${r.file}`;
    if (r.href !== "#") return `<sha256>  ${r.file}  (sha belum diisi di releases.json)`;
    return null;
  }).filter(Boolean);
  if (lines.length === 0) {
    return `<pre class="code">&lt;sha256&gt;  Musa_${v}_x64-setup.exe\n&lt;sha256&gt;  Musa_${v}_x86-setup.exe\n&lt;sha256&gt;  Musa_${v}_aarch64.dmg\n&lt;sha256&gt;  musa_${v}_amd64.deb\n&lt;sha256&gt;  Musa_${v}_amd64.AppImage</pre>
      <p class="meta">Checksum terisi otomatis setelah file ditaruh di <code>downloads/v${v}/</code> lalu <code>node tools/build.mjs</code>.</p>`;
  }
  return `<pre class="code">${esc(lines.join("\n"))}</pre>`;
}

function jsonLd(site, release, local) {
  const v = release.version;
  const urls = ASSETS.map((a) => assetHref(release.files, local, a.key, v, site).href).filter((h) => h !== "#")
    .map((h) => (/^https?:\/\//.test(h) ? h : site + "/" + h.replace(/^..\/..\//, "")));
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Musa",
    applicationCategory: "UtilitiesApplication",
    operatingSystem: ["Windows 11", "macOS", "Linux"],
    softwareVersion: v,
    datePublished: release.date,
    description: release.notes,
    downloadUrl: urls.length ? urls : `${site}/rilis/v${v}/`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "IDR" },
  };
}

function pageShell({ title, desc, canonical, site, jsonLdObj, body, depth }) {
  // depth: 0 = root (index.html), 2 = rilis/vX/index.html -> prefix aset "../.."
  const pre = depth === 2 ? "../../" : depth === 1 ? "../" : "";
  const absAsset = (p) => site ? `${site}/${p}` : pre + p;
  const ld = jsonLdObj ? `\n  <script type="application/ld+json">\n  ${JSON.stringify(jsonLdObj)}\n  </script>` : "";
  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}" />
  <link rel="canonical" href="${esc(canonical)}" />
  <meta name="theme-color" content="#0a0a0c" />
  <meta name="robots" content="index, follow" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Musa" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:url" content="${esc(canonical)}" />
  <meta property="og:image" content="${esc(absAsset("assets/og-image.svg"))}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(desc)}" />
  <meta name="twitter:image" content="${esc(absAsset("assets/og-image.svg"))}" />
  <link rel="icon" type="image/svg+xml" href="${pre}assets/favicon.svg" />
  <link rel="apple-touch-icon" href="${pre}assets/apple-touch-icon.svg" />
  <link rel="manifest" href="${pre}site.webmanifest" />
  <link rel="stylesheet" href="${pre}styles.css" />${ld}
</head>
<body>
${body}
</body>
</html>
`;
}

function nav(pre) {
  return `  <header class="nav">
    <div class="wrap nav-inner">
      <a class="brand" href="${pre}index.html"><img src="${pre}assets/logo.svg" alt="Logo Musa" width="30" height="30" />Musa</a>
      <nav class="nav-links">
        <a href="${pre}index.html#fitur">Fitur</a>
        <a href="${pre}index.html#download">Download</a>
        <a href="${pre}index.html#faq">FAQ</a>
        <a href="${pre}rilis/">Rilis</a>
      </nav>
      <a class="btn btn-small" href="${pre}index.html#download">Download</a>
    </div>
  </header>`;
}

function foot(pre) {
  return `  <footer>
    <div class="wrap foot">
      <span>Musa · proprietary — all rights reserved · terinspirasi dari <a href="https://rama2555.github.io/nusa/" rel="noopener">Nusa</a></span>
      <span><a href="${pre}index.html">Beranda</a> · <a href="${pre}rilis/">Rilis</a> · <a href="${pre}privasi/">Privasi</a></span>
    </div>
  </footer>`;
}

function versionPage(site, release, local, prev, next) {
  const v = release.version;
  const canonical = `${site}/rilis/v${v}/`;
  const changes = release.changes.map((c) => `        <li>${esc(c)}</li>`).join("\n");
  const pager = [prev ? `<a href="../v${prev}/">← v${prev}</a>` : "", next ? `<a href="../v${next}/">v${next} →</a>` : ""]
    .filter(Boolean).join(" · ");
  const supportLine = (() => {
    const s = release.support || "";
    if (!s) return "";
    const href = s.includes("://") || s.startsWith("mailto:") ? s : (s.includes("@") ? "mailto:" + s : s);
    const text = s.startsWith("mailto:") ? s.slice(7) : s;
    return `<br />Lapor bug / butuh bantuan: <a href="${esc(href)}">${esc(text)}</a>.`;
  })();
  const unsignedBox = release.unsigned
    ? `    <p class="warn"><strong>Beta test build (unsigned).</strong> Build ini belum ditandatangani dan belum dinotarisasi — peringatan Windows SmartScreen / macOS Gatekeeper itu normal. File aman selama diunduh dari halaman resmi ini. Cocokkan SHA-256 file dengan tabel checksum di bawah.<br />Windows (.exe NSIS): layar biru “Windows protected your PC” → <em>More info</em> → <em>Run anyway</em>.<br />macOS (.dmg/.app): klik kanan app → <em>Open</em> → <em>Open</em>; atau System Settings → Privacy &amp; Security → <em>Open Anyway</em>; alternatif Terminal: <code>xattr -cr /Applications/Musa.app</code>.${supportLine}</p>\n`
    : "";
  const body = `${nav("../../")}
  <main class="wrap section">
    <p class="meta"><a href="../../index.html">Beranda</a> › <a href="../">Rilis</a> › v${esc(v)}</p>
    <h1>Musa v${esc(v)}</h1>
    <p class="section-sub">Dipublish ${esc(release.date)} · ${esc(release.notes)}</p>
${unsignedBox}    <div class="cards" id="dl-cards">
${downloadCards(release, site, local)}
    </div>

    <h2>Yang berubah</h2>
    <ul class="notes-list">
${changes}
    </ul>

    <h2>Catatan install</h2>
    <ul class="notes-list">
      <li>Windows: NSIS per-user, tanpa admin. WebView2 sudah bawaan Windows 11.</li>
      <li>macOS: seret ke Applications. Build unsigned → klik kanan → Open pada buka pertama.</li>
      <li>Linux: Now Playing / Mixer / quick actions / keep-awake adalah stub (UI hide/disable).</li>
      <li>Update manual: install versi baru di atas versi lama, setting JSON terbawa.</li>
    </ul>

    <h2>Checksum (SHA-256)</h2>
    ${checksumBlock(release, local)}

    <p class="meta" style="margin-top:28px">${pager ? pager + " · " : ""}<a href="../">Semua rilis</a></p>
  </main>
${foot("../../")}`;
  return pageShell({
    title: `Download Musa v${v} — Windows, macOS, Linux`,
    desc: `Download Musa v${v} (${release.date}): ${release.notes}`.slice(0, 160),
    canonical,
    site,
    jsonLdObj: jsonLd(site, release, local),
    body,
    depth: 2,
  });
}

function archivePage(site, items) {
  const canonical = `${site}/rilis/`;
  const latest = items[0].release;
  const latestLocal = items[0].local;
  const rows = items.map(({ release, local }) => {
    const v = release.version;
    const outs = ASSETS.map((a) => assetHref(release.files, local, a.key, v, site))
      .filter((r) => r.href !== "#").length;
    return `        <tr>
          <td><a href="./v${esc(v)}/">v${esc(v)}</a></td>
          <td>${esc(release.date)}</td>
          <td>${esc(release.notes)}</td>
          <td>${outs ? outs + " file" : "—"}</td>
        </tr>`;
  }).join("\n");
  const cards = downloadCards(latest, site, latestLocal);
  const body = `${nav("../")}
  <main class="wrap section">
    <h1>Rilis</h1>
    <p class="section-sub">Arsip resmi Musa. Repo kode private, jadi halaman ini + halaman per versi adalah rujukan unduhannya.</p>
    <h2>Terbaru: v${esc(latest.version)}</h2>
    <div class="cards" id="dl-cards">
${cards}
    </div>
    <p class="meta">Dipublish ${esc(latest.date)} · <a href="./v${esc(latest.version)}/">Catatan + checksum v${esc(latest.version)} →</a></p>

    <h2>Catatan install</h2>
    <ul class="notes-list">
      <li>Windows: NSIS per-user, tanpa admin. WebView2 sudah bawaan Windows 11.</li>
      <li>macOS: seret ke Applications. Build unsigned → klik kanan → Open pada buka pertama.</li>
      <li>Linux: Now Playing / Mixer / quick actions / keep-awake adalah stub (UI hide/disable).</li>
      <li>Update manual: install versi baru di atas versi lama, setting JSON terbawa.</li>
    </ul>

    <h2>Arsip</h2>
    <table class="table">
      <thead><tr><th>Versi</th><th>Tanggal</th><th>Catatan</th><th>File</th></tr></thead>
      <tbody>
${rows}
      </tbody>
    </table>
    <p class="meta">Arsip tidak pernah dihapus — tiap rilis tambah 1 halaman + 1 baris.</p>
  </main>
${foot("../")}`;
  return pageShell({
    title: "Rilis — Musa (Download Windows, macOS, Linux)",
    desc: `Riwayat rilis Musa: versi terbaru v${latest.version}, catatan install, checksum SHA-256, dan arsip versi lama.`,
    canonical,
    site,
    jsonLdObj: null,
    body,
    depth: 1,
  });
}

// ---- main ----
const { site, list } = loadReleases();
const { new: newVer } = args();

if (newVer) {
  const v = String(newVer).replace(/^v/i, "");
  if (list.some((r) => r.version === v)) {
    console.error(`Versi ${v} sudah ada di releases.json — batal.`);
    process.exit(1);
  }
  const prev = list[0];
  const entry = {
    version: v,
    date: prev.date,
    notes: `Ringkasan perubahan v${v} (isi manual).`,
    unsigned: true,
    changes: [...(prev.changes || [])],
    files: Object.fromEntries(ASSETS.map((a) => [a.key, "#"])),
    checksums: {},
  };
  const raw = JSON.parse(readFileSync(RELEASES_JSON, "utf8"));
  if (Array.isArray(raw)) raw.push(entry);
  else raw.releases.push(entry);
  writeFileSync(RELEASES_JSON, JSON.stringify(raw, null, 2) + "\n");
  mkdirSync(join(DOWNLOADS_DIR, "v" + v), { recursive: true });
  console.log(`OK: scaffold v${v} ditambah ke releases.json + folder downloads/v${v}/ dibuat.`);
  console.log(`Lanjut: 1) taruh file build ke downloads/v${v}/  2) edit notes/changes/date  3) node tools/build.mjs`);
  process.exit(0);
}

if (!site) throw new Error("Isi dulu field `site` di releases.json (domain canonical).");

mkdirSync(RILIS_DIR, { recursive: true });
mkdirSync(DOWNLOADS_DIR, { recursive: true });

const items = list.map((release) => {
  const s = scanLocal(release.version);
  return { release, local: s.found, dir: s.dir, files: s.files };
});

// Tulis SHA256SUMS.txt per versi yang punya file lokal
for (const { release, local } of items) {
  const keys = Object.keys(local);
  if (!keys.length) continue;
  const dir = join(DOWNLOADS_DIR, "v" + release.version);
  const txt = keys.map((k) => `${local[k].sha}  ${local[k].file}`).join("\n") + "\n";
  writeFileSync(join(dir, "SHA256SUMS.txt"), txt);
}

// Halaman per versi + arsip
items.forEach(({ release, local }, i) => {
  const dir = join(RILIS_DIR, "v" + release.version);
  mkdirSync(dir, { recursive: true });
  const html = versionPage(site, release, local, items[i + 1]?.release.version, items[i - 1]?.release.version);
  writeFileSync(join(dir, "index.html"), html);
});
writeFileSync(join(RILIS_DIR, "index.html"), archivePage(site, items));

// version.json = rilis terbaru (dibaca landing + aplikasi untuk cek update)
const latest = items[0];
const absFiles = {};
for (const a of ASSETS) {
  const r = assetHref(latest.release.files, latest.local, a.key, latest.release.version, site);
  absFiles[a.key] = r.href === "#" ? "#" : (/^https?:\/\//.test(r.href) ? r.href : site + "/" + r.href.replace(/^..\/..\//, ""));
}
writeFileSync(join(ROOT, "version.json"), JSON.stringify({
  version: latest.release.version,
  date: latest.release.date,
  // Dibaca aplikasi (Settings → General → Update) sebagai tautan halaman rilis.
  page: `${site}/rilis/v${latest.release.version}/`,
  notes: latest.release.notes,
  changes: latest.release.changes,
  files: absFiles,
}, null, 2) + "\n");

// sitemap.xml
const urls = [
  { loc: `${site}/`, freq: "weekly", pri: "1.0" },
  { loc: `${site}/rilis/`, freq: "weekly", pri: "0.8" },
  { loc: `${site}/privasi/`, freq: "yearly", pri: "0.3" },
  ...items.map(({ release }) => ({ loc: `${site}/rilis/v${release.version}/`, freq: "monthly", pri: "0.6" })),
];
writeFileSync(join(ROOT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <changefreq>${u.freq}</changefreq>\n    <priority>${u.pri}</priority>\n  </url>`).join("\n") +
  `\n</urlset>\n`);

console.log(`OK: ${items.length} halaman versi + arsip + version.json (v${latest.release.version}) + sitemap.xml`);
for (const { release, local } of items) {
  const n = Object.keys(local).length;
  console.log(`  v${release.version}: ${n ? n + " file lokal terdeteksi" : "belum ada file lokal (semua # / URL eksternal)"}`);
}
