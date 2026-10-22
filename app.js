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
})();
