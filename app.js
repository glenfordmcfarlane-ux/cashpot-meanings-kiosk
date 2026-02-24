// ===============================
// CASH POT MEANINGS – KIOSK APP
// (Enhanced: swipe + animations + edge glow + bounds lock + preloading + cleanup)
// ===============================

const gridView = document.getElementById("gridView");
const cardView = document.getElementById("cardView");

const grid = document.getElementById("grid");
const cardImage = document.getElementById("cardImage");
const counterNum = document.getElementById("counterNum");

const btnBack = document.getElementById("btnBack");
const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");

let config = null;
let current = 1;

// ✅ ADDED: global cache-bust version (change this when you replace images)
const ASSET_VER = 2;

// -------------------------------
// Inject minimal CSS for animations + edge glow feedback
// -------------------------------
(function injectKioskFxCSS() {
  // ✅ prevent duplicate injection if script is reloaded
  if (document.getElementById("kfx-style")) return;

  const css = `
  /* ---- Card transition animations ---- */
  .cardStage{ position: relative; } /* ensure overlays anchor safely */
  .cardImage{
    will-change: transform, opacity;
    transform: translateZ(0);
  }
  .kfx-slide-in-left  { animation: kfxSlideInLeft  220ms ease-out both; }
  .kfx-slide-in-right { animation: kfxSlideInRight 220ms ease-out both; }
  .kfx-tap            { transform: scale(0.99); opacity: .98; }

  @keyframes kfxSlideInLeft {
    from { transform: translateX(22px); opacity: .55; }
    to   { transform: translateX(0);    opacity: 1;   }
  }
  @keyframes kfxSlideInRight {
    from { transform: translateX(-22px); opacity: .55; }
    to   { transform: translateX(0);     opacity: 1;   }
  }

  /* ---- Edge glow overlays (swipe hints / bounds feedback) ---- */
  .kfx-edge{
    position: absolute;
    top: 0; bottom: 0;
    width: 18%;
    pointer-events: none;
    opacity: 0;
    transition: opacity 120ms ease;
    z-index: 5;
  }
  .kfx-edge--left{
    left: 0;
    background: radial-gradient(closest-side at 0% 50%, rgba(242,195,0,.55), rgba(242,195,0,0));
  }
  .kfx-edge--right{
    right: 0;
    background: radial-gradient(closest-side at 100% 50%, rgba(242,195,0,.55), rgba(242,195,0,0));
  }
  .kfx-edge--show{ opacity: 1; }

  /* ---- Disabled nav buttons look ---- */
  .navbtn[disabled]{
    opacity: .35;
    transform: none !important;
    pointer-events: none;
  }
  `;

  const style = document.createElement("style");
  style.id = "kfx-style";
  style.textContent = css;
  document.head.appendChild(style);
})();

// -------------------------------
// Edge glow overlays
// -------------------------------
let edgeLeft = null;
let edgeRight = null;

function ensureEdgeGlows() {
  const stage = document.querySelector(".cardStage");
  if (!stage) return;

  const cs = window.getComputedStyle(stage);
  if (cs.position === "static") stage.style.position = "relative";

  if (!edgeLeft) {
    edgeLeft = document.createElement("div");
    edgeLeft.className = "kfx-edge kfx-edge--left";
    stage.appendChild(edgeLeft);
  }
  if (!edgeRight) {
    edgeRight = document.createElement("div");
    edgeRight.className = "kfx-edge kfx-edge--right";
    stage.appendChild(edgeRight);
  }
}

function showEdge(which, on) {
  ensureEdgeGlows();
  if (!edgeLeft || !edgeRight) return;
  const el = which === "left" ? edgeLeft : edgeRight;
  el.classList.toggle("kfx-edge--show", !!on);
}

function pulseEdge(which) {
  showEdge(which, true);
  try { if (navigator.vibrate) navigator.vibrate(15); } catch (_) {}
  setTimeout(() => showEdge(which, false), 160);
}

// -------------------------------
// Helpers
// -------------------------------
function pad2(n) {
  return String(n).padStart(2, "0");
}

function showView(view) {
  gridView.classList.remove("view--active");
  cardView.classList.remove("view--active");
  view.classList.add("view--active");

  if (view === cardView) ensureEdgeGlows();
}

// ✅ CHANGED: add cache-bust query to card images too
function cardUrl(n) {
  const num = pad2(n);
  return `${config.cardsPath}/${num}.${config.cardExtension}?v=${ASSET_VER}`;
}

// Enable/disable prev/next
function updateNavDisabled() {
  if (!config) return;

  const atFirst = current <= 1;
  const atLast = current >= config.total;

  btnPrev.disabled = atFirst;
  btnNext.disabled = atLast;

  btnPrev.setAttribute("aria-disabled", atFirst ? "true" : "false");
  btnNext.setAttribute("aria-disabled", atLast ? "true" : "false");
}

function animateCard(direction) {
  cardImage.classList.remove("kfx-slide-in-left", "kfx-slide-in-right");
  cardImage.offsetHeight;
  if (direction === "next") cardImage.classList.add("kfx-slide-in-left");
  if (direction === "prev") cardImage.classList.add("kfx-slide-in-right");
}

// -------------------------------
// Preload helpers
// -------------------------------
const preloadCache = new Map(); // url -> Image

function preload(url) {
  if (!url || preloadCache.has(url)) return;
  const img = new Image();
  img.decoding = "async";
  img.loading = "eager";
  img.src = url;
  preloadCache.set(url, img);
}

function trimPreloadCache(maxKeep = 10) {
  if (preloadCache.size <= maxKeep) return;
  const keys = Array.from(preloadCache.keys());
  const removeCount = preloadCache.size - maxKeep;
  for (let i = 0; i < removeCount; i++) preloadCache.delete(keys[i]);
}

function preloadNeighbors() {
  if (!config) return;
  const next = current < config.total ? current + 1 : null;
  const prev = current > 1 ? current - 1 : null;

  if (prev) preload(cardUrl(prev));
  if (next) preload(cardUrl(next));

  trimPreloadCache(10);
}

// -------------------------------
// Card / Grid actions
// -------------------------------
async function setCardImage(url) {
  // ✅ ADDED: decode to reduce “flash” on some panels
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    if (img.decode) await img.decode();
  } catch (_) {
    // ignore decode failures; fallback to normal set
  }
  cardImage.src = url;
}

function openCard(n, direction = null) {
  current = n;
  counterNum.textContent = pad2(current);

  const url = cardUrl(current);
  setCardImage(url);

  cardImage.alt = `MEANING CARD ${pad2(current)}`;

  showView(cardView);
  updateNavDisabled();

  if (direction) animateCard(direction);

  preloadNeighbors();

  const loc = new URL(window.location.href);
  loc.searchParams.set("card", String(current));
  history.replaceState({}, "", loc);
}

function openGrid() {
  showView(gridView);

  showEdge("left", false);
  showEdge("right", false);
  cardImage.classList.remove("kfx-tap", "kfx-slide-in-left", "kfx-slide-in-right");

  const loc = new URL(window.location.href);
  loc.searchParams.delete("card");
  history.replaceState({}, "", loc);
}

function nextCard(source = "button") {
  if (!config) return;
  if (current >= config.total) {
    if (source === "swipe") pulseEdge("right");
    updateNavDisabled();
    return;
  }
  openCard(current + 1, "next");
}

function prevCard(source = "button") {
  if (!config) return;
  if (current <= 1) {
    if (source === "swipe") pulseEdge("left");
    updateNavDisabled();
    return;
  }
  openCard(current - 1, "prev");
}

// ===============================
// SWIPE SUPPORT
// ===============================
(function enableCardSwipe() {
  const SWIPE_MIN_X = 70;
  const SWIPE_MAX_Y = 90;

  let sx = 0;
  let sy = 0;
  let tracking = false;

  let rafPending = false;
  let lastDx = 0;

  function isCardActive() {
    return cardView.classList.contains("view--active");
  }

  function applyEdgeFromDx(dx) {
    if (dx < -30) {
      showEdge("right", true);
      showEdge("left", false);
    } else if (dx > 30) {
      showEdge("left", true);
      showEdge("right", false);
    } else {
      showEdge("left", false);
      showEdge("right", false);
    }
  }

  const stageBind = () => {
    const stage = document.querySelector(".cardStage");
    if (!stage) return;

    ensureEdgeGlows();

    stage.addEventListener("touchstart", (e) => {
      if (!isCardActive()) return;
      if (!e.touches || e.touches.length !== 1) return;

      tracking = true;
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;

      cardImage.classList.add("kfx-tap");
    }, { passive: true });

    stage.addEventListener("touchmove", (e) => {
      if (!tracking || !isCardActive()) return;
      const t = e.touches && e.touches[0];
      if (!t) return;

      const dx = t.clientX - sx;
      const dy = t.clientY - sy;

      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) {
        e.preventDefault();
      }

      lastDx = dx;

      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(() => {
          rafPending = false;
          applyEdgeFromDx(lastDx);
        });
      }
    }, { passive: false });

    stage.addEventListener("touchend", (e) => {
      if (!tracking || !isCardActive()) return;
      tracking = false;

      cardImage.classList.remove("kfx-tap");
      showEdge("left", false);
      showEdge("right", false);

      const t = e.changedTouches && e.changedTouches[0];
      if (!t) return;

      const dx = t.clientX - sx;
      const dy = t.clientY - sy;

      if (Math.abs(dy) > SWIPE_MAX_Y) return;

      if (dx <= -SWIPE_MIN_X) return void nextCard("swipe");
      if (dx >=  SWIPE_MIN_X) return void prevCard("swipe");
    }, { passive: true });

    stage.addEventListener("touchcancel", () => {
      tracking = false;
      cardImage.classList.remove("kfx-tap");
      showEdge("left", false);
      showEdge("right", false);
    }, { passive: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", stageBind);
  } else {
    stageBind();
  }
})();

// ===============================
// BUTTON EVENTS
// ===============================
btnBack.addEventListener("click", openGrid);
btnNext.addEventListener("click", () => nextCard("button"));
btnPrev.addEventListener("click", () => prevCard("button"));

window.addEventListener("keydown", (e) => {
  if (!config) return;
  if (!cardView.classList.contains("view--active")) return;

  if (e.key === "ArrowRight") nextCard("key");
  if (e.key === "ArrowLeft") prevCard("key");
  if (e.key === "Escape") openGrid();
});

// ===============================
// INITIALIZATION
// ===============================
async function init() {
  try {
    const res = await fetch("data/meanings.json", { cache: "no-store" });
    config = await res.json();
  } catch (err) {
    console.error("FAILED TO LOAD MEANINGS.JSON", err);
    return;
  }

  if (!config || !config.total || !config.cardsPath) {
    console.error("MEANINGS.JSON MISSING REQUIRED FIELDS:", config);
    return;
  }

  cardImage.addEventListener("error", () => {
    console.error("CARD IMAGE FAILED TO LOAD:", cardImage.src);
    try { if (navigator.vibrate) navigator.vibrate(20); } catch (_) {}
  });

  for (let i = 1; i <= config.total; i++) {
    const button = document.createElement("button");
    button.className = "gridbtn";
    button.type = "button";
    button.addEventListener("click", () => openCard(i));

    const img = document.createElement("img");
    img.className = "gridbtn__img";
    img.alt = `OPEN MEANING ${i}`;
    img.decoding = "async";
    img.loading = "eager";

    // ✅ keep your button cache-bust, but tie to ASSET_VER
    img.src = `${config.buttonsPath}/${config.buttonPrefix}${i}.${config.buttonExtension}?v=${ASSET_VER}`;

    button.appendChild(img);
    grid.appendChild(button);
  }

  // ✅ initial preload uses cache-busted cardUrl()
  preload(cardUrl(1));
  preload(cardUrl(2));
  trimPreloadCache(10);

  const loc = new URL(window.location.href);
  const cardParam = loc.searchParams.get("card");

  if (cardParam) {
    const n = parseInt(cardParam, 10);
    if (!isNaN(n) && n >= 1 && n <= config.total) {
      openCard(n);
      return;
    }
  }

  openGrid();
}

init();
