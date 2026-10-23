// Sumber kebenaran: ./releases.json -> generate via `node tools/build.mjs`
// (yang menulis ulang version.json + rilis/* + sitemap.xml).
// File ini hanya MEMBACA ./version.json (same-origin, tanpa GitHub API
// karena repo kode private).
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
      // No per-file URL yet → fall back to the release page, never a dead "#".
      if (url && url !== "#") el.href = url;
      else {
        el.href = "release.html";
        el.classList.add("is-pending");
      }
    });

    var badge = document.getElementById("ver-badge");
    if (badge) badge.textContent = rel.version;
    var badgeNav = document.getElementById("ver-badge-nav");
    if (badgeNav) badgeNav.textContent = rel.version;
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

  // Tab preview fitur (hanya ada di index.html).
  (function initTabs() {
    var list = document.querySelector('[role="tablist"]');
    if (!list) return;
    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
    var desc = document.getElementById("feat-desc");
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        var p = document.getElementById(t.getAttribute("aria-controls"));
        if (p) p.hidden = !on;
      });
      if (desc) desc.textContent = tab.getAttribute("data-desc") || "";
      if (focus) tab.focus();
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { select(tab, false); });
      tab.addEventListener("keydown", function (e) {
        var j = null;
        if (e.key === "ArrowRight") j = (i + 1) % tabs.length;
        else if (e.key === "ArrowLeft") j = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === "Home") j = 0;
        else if (e.key === "End") j = tabs.length - 1;
        if (j !== null && j !== undefined) { e.preventDefault(); select(tabs[j], true); }
      });
    });
  })();

  // Tombol kembali ke atas + ring progress + nav ngumpet pas scroll bawah.
  (function initToTop() {
    var btn = document.getElementById("to-top");
    var nav = document.querySelector(".nav");
    if (!btn) return;
    var ring = document.getElementById("to-top-ring");
    var CIRC = 97.4, ticking = false, lastY = 0;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function update() {
      ticking = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var y = window.scrollY || window.pageYOffset;
      var show = y > 600;
      btn.classList.toggle("show", show);
      btn.tabIndex = show ? 0 : -1;
      if (ring && max > 0) {
        var p = Math.min(Math.max(y / max, 0), 1);
        ring.style.strokeDashoffset = String(CIRC * (1 - p));
      }
      if (nav && !reduce) {
        if (y > 200 && y > lastY + 4) nav.classList.add("nav-hidden");
        else if (y < lastY - 4 || y <= 200) nav.classList.remove("nav-hidden");
      }
      lastY = y;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener("resize", update);
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    });
    update();
  })();

  // Reveal antar section (skip kalau reduced-motion / tanpa IO).
  (function initReveal() {
    if (!("IntersectionObserver" in window)) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var targets = Array.prototype.slice.call(document.querySelectorAll(
      ".hero-copy > *, .hero-demo, .strip-inner, " +
      ".section > .kicker, .section > h2, .section > .section-sub, " +
      ".tabs, .stage, .feat-desc, .term, #dl-cards > *, .os-grid > *, #faq details"
    ));
    if (!targets.length) return;
    var byParent = new Map();
    targets.forEach(function (el) {
      el.classList.add("rv");
      var p = el.parentNode;
      if (!byParent.has(p)) byParent.set(p, []);
      byParent.get(p).push(el);
    });
    byParent.forEach(function (group) {
      group.forEach(function (el, i) {
        el.style.transitionDelay = Math.min(i, 5) * 70 + "ms";
      });
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        en.target.classList.toggle("in", en.isIntersecting);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    targets.forEach(function (el) { io.observe(el); });
  })();

  fetch("version.json", { cache: "no-store" })
    .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
    .then(function (rel) { boot(rel); applyOS(rel); })
    .catch(function () { boot(FALLBACK_RELEASE); applyOS(FALLBACK_RELEASE); });
})();
