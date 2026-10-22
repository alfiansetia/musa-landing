// Manual download config — EDIT SAAT RILIS BARU.
// Repo kode private, jadi landing TIDAK fetch GitHub API (selalu 404 buat
// visitor). Semua URL di bawah adalah link download publik yang kamu kelola
// (R2 / hosting file / repo publik artifacts). Ganti per rilis, commit, deploy.
var MUSA_RELEASE = {
  version: "v1.0.0",
  date: "22 Oktober 2026",
  notes: "Rilis pertama: pill + stats + Now Playing + timer + keep awake + quick actions + tray/hotkey + Settings.",
  files: {
    // Ganti "#" dengan URL publik file masing-masing saat hosting sudah ada.
    "x64-setup": "#",
    "x86-setup": "#",
    "dmg": "#",
    "app-targz": "#",
    "deb": "#",
    "appimage": "#"
  }
};

(function () {
  var rel = MUSA_RELEASE;

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
  if (meta) meta.textContent = "Terbaru: " + rel.version + " · " + rel.date + " · link aktif setelah file diupload ke hosting publik.";

  var lv = document.getElementById("latest-ver");
  if (lv) lv.textContent = rel.version;
  var ld = document.getElementById("latest-date");
  if (ld) ld.textContent = "Dipublish " + rel.date;
  var ln = document.getElementById("latest-notes");
  if (ln) ln.textContent = rel.notes;

  // OS detection: point the hero CTA + highlight at the visitor's OS.
  // Mobile (Android/iOS) has no build — say so instead of guessing.
  var OS_LABEL = { windows: "Windows", macos: "macOS", linux: "Linux" };
  var OS_ASSET = { windows: "x64-setup", macos: "dmg", linux: "deb" };

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

  var os = detectOS();
  var hint = document.getElementById("os-hint");
  var cta2 = document.getElementById("cta-primary");

  if (os === "android" || os === "ios") {
    if (hint) hint.textContent = "Kamu buka dari HP — Musa hanya untuk desktop. Buka halaman ini dari PC/Mac/Linux untuk download.";
    if (cta2) { cta2.textContent = "Lihat pilihan download"; cta2.href = "#download"; }
  } else if (OS_LABEL[os]) {
    var key = OS_ASSET[os];
    var url = rel.files[key];
    if (cta2) {
      cta2.textContent = "Download untuk " + OS_LABEL[os];
      cta2.href = url && url !== "#" ? url : "#download";
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
})();
