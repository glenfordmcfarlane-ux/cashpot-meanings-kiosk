// ===============================
// CASH POT MEANINGS – KIOSK APP
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

// Pad number to 2 digits (01, 02, etc.)
function pad2(n) {
  return String(n).padStart(2, "0");
}

// Show selected view
function showView(view) {
  gridView.classList.remove("view--active");
  cardView.classList.remove("view--active");
  view.classList.add("view--active");
}

// Build card image path
function cardUrl(n) {
  const num = pad2(n);
  return `${config.cardsPath}/${num}.${config.cardExtension}`;
}

// Open a card
function openCard(n) {
  current = n;

  counterNum.textContent = pad2(current);
  cardImage.src = cardUrl(current);
  cardImage.alt = `Meaning card ${pad2(current)}`;

  showView(cardView);

  // Update URL (so reload keeps same card)
  const url = new URL(window.location.href);
  url.searchParams.set("card", String(current));
  history.replaceState({}, "", url);
}

// Return to grid
function openGrid() {
  showView(gridView);

  const url = new URL(window.location.href);
  url.searchParams.delete("card");
  history.replaceState({}, "", url);
}

// Next card
function nextCard() {
  const n = current >= config.total ? 1 : current + 1;
  openCard(n);
}

// Previous card
function prevCard() {
  const n = current <= 1 ? config.total : current - 1;
  openCard(n);
}

// ===============================
// SWIPE SUPPORT (TOUCH SCREENS)
// ===============================

let touchStartX = null;

cardView.addEventListener("touchstart", (e) => {
  touchStartX = e.changedTouches[0].screenX;
}, { passive: true });

cardView.addEventListener("touchend", (e) => {
  if (touchStartX == null) return;

  const endX = e.changedTouches[0].screenX;
  const dx = endX - touchStartX;
  touchStartX = null;

  if (Math.abs(dx) < 60) return; // ignore small swipes

  if (dx < 0) nextCard();
  else prevCard();
}, { passive: true });

// ===============================
// BUTTON EVENTS
// ===============================

btnBack.addEventListener("click", openGrid);
btnNext.addEventListener("click", nextCard);
btnPrev.addEventListener("click", prevCard);

// ===============================
// INITIALIZATION
// ===============================

async function init() {
  try {
    const res = await fetch("data/meanings.json", { cache: "no-store" });
    config = await res.json();
  } catch (err) {
    console.error("Failed to load meanings.json", err);
    return;
  }

  // Build Grid Buttons (B1–B36)
  for (let i = 1; i <= config.total; i++) {
    const button = document.createElement("button");
    button.className = "gridbtn";
    button.type = "button";
    button.addEventListener("click", () => openCard(i));

    const img = document.createElement("img");
    img.className = "gridbtn__img";
    img.alt = `Open meaning ${i}`;
    img.src = `${config.buttonsPath}/${config.buttonPrefix}${i}.${config.buttonExtension}`;

    button.appendChild(img);
    grid.appendChild(button);
  }

  // Check if URL contains ?card=#
  const url = new URL(window.location.href);
  const cardParam = url.searchParams.get("card");

  if (cardParam) {
    const n = parseInt(cardParam, 10);
    if (!isNaN(n) && n >= 1 && n <= config.total) {
      openCard(n);
      return;
    }
  }

  openGrid();
}

// Start app
init();
