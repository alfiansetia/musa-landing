// Single source of truth: ./version.json (same-origin, no CORS issue).
// EDIT SAAT RILIS BARU cukup di version.json — app.js + release.html
// membaca dari sana. Repo kode private, jadi TIDAK fetch GitHub API.
// FALLBACK di bawah hanya untuk preview file:// (fetch gagal) —
// sinkronkan manual dengan version.json saat rilis.
var FALLBACK_RELEASE = {
  version: "v1.0.0",
  date: "22 Oktober 2026",
  page: "https://musa.kacangan.net/release.html",
  notes: "Rilis pertama: pill + stats + Now Playing + timer + keep awake + quick actions + tray/hotkey + Settings.",
  files: {
    "x64-setup": "#",
    "x86-setup": "#",
    "dmg": "#",
    "app-targz": "#",
    "deb": "#",
    "appimage": "#"
  }
};

(function () {
  function boot(rel) {
    if (!rel || !rel.version) rel = FALLBACK_RELEASE;
    if (!rel.files) rel.files = FALLBACK_RELEASE.files;

    document.querySelectorAll("[data-asset]").forEach(function (el) {
      var url = rel.files[el.getAttribute("data-asset")];
      if (url && url !== "#") el.href = url;
      else el.classList.add("is-pending");
    });

    var badge = document.getElementById("ver-badge");
    if (badge) badge.textContent = rel.version;
    var cta = document.getElementById("cta-primary");
    if (cta && rel.files["x64-setup"] !== "#") cta.href = rel.files["x64-setup"];

    var meta = document.getElementById("dl-meta");
    if (meta) meta.textContent = "Terbaru: " + rel.version + " · " + (rel.date || "") + " · link aktif setelah file diupload ke hosting publik.";

    var lv = document.getElementById("latest-ver");
    if (lv) lv.textContent = rel.version;
    var ld = document.getElementById("latest-date");
    if (ld) ld.textContent = "Dipublish " + (rel.date || "");
    var ln = document.getElementById("latest-notes");
    if (ln) ln.textContent = rel.notes || "";
  }

  function detectOS() {
    var p = "";
    try {
      p = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
    } catch (e) { /* non-browser */ }
    p = String(p).toLowerCase();
    if (/win/.test(p)) return "windows";
    if (/mac/.test(p)) return "macos";
    if (/linux/.test(p)) return "linux";
    var ua = String(navigator.userAgent || "").toLowerCase();
    if (/android/.test(ua)) return "android";
    if (/iphone|ipad|ipod/.test(ua)) return "ios";
    if (ua.indexOf("windows") > -1) return "windows";
    if (ua.indexOf("macintosh") > -1 || ua.indexOf("mac os") > -1) return "macos";
    if (ua.indexOf("linux") > -1 || ua.indexOf("x11") > -1) return "linux";
    return "unknown";
  }

  function applyOS(rel) {
    var OS_LABEL = { windows: "Windows", macos: "macOS", linux: "Linux" };
    var OS_ASSET = { windows: "x64-setup", macos: "dmg", linux: "deb" };
    var os = detectOS();
    var hint = document.getElementById("os-hint");
    var cta = document.getElementById("cta-primary");
    if (os === "android" || os === "ios") {
      if (hint) hint.textContent = "Kamu buka dari HP — Musa hanya untuk desktop. Buka halaman ini dari PC/Mac/Linux untuk download.";
      if (cta) { cta.textContent = "Lihat pilihan download"; cta.href = "#download"; }
    } else if (OS_LABEL[os]) {
      var key = OS_ASSET[os];
      var url = (rel.files || {})[key];
      if (cta) {
        cta.textContent = "Download untuk " + OS_LABEL[os];
        cta.href = url && url !== "#" ? url : "#download";
      }
      if (hint) {
        hint.textContent = url && url !== "#"
          ? "Terdeteksi: " + OS_LABEL[os] + " — tombol di atas langsung ke file yang cocok."
          : "Terdeteksi: " + OS_LABEL[os] + " — scroll ke bawah, kartu " + OS_LABEL[os] + " sudah ditandai.";
      }
      var card = document.querySelector('[data-os-card="' + os + '"]');
      if (card) {
        card.classList.add("is-recommended");
        var badge = document.createElement("p");
        badge.className = "rec-badge";
        badge.textContent = "Cocok untuk perangkatmu";
        card.insertBefore(badge, card.firstChild);
      }
    }
  }

  fetch("version.json", { cache: "no-store" })
    .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
    .then(function (rel) { boot(rel); applyOS(rel); })
    .catch(function () { boot(FALLBACK_RELEASE); applyOS(FALLBACK_RELEASE); });
})();
