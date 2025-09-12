/* ====== bootstrap ====== */
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];

const deckSelect = $("#deckSelect");
const alertBox   = $("#alert");
const surahRoot  = $("#surahRoot");

/* Load manifest and populate deck picker */
async function init() {
  try {
    const res = await fetch("manifest.json?nocache=" + Date.now());
    if (!res.ok) throw new Error("manifest.json not found");
    const manifest = await res.json();

    deckSelect.innerHTML = manifest.map(d => `<option value="${d.json}">${d.name}</option>`).join("");
    deckSelect.addEventListener("change", () => loadDeck(deckSelect.value));
    if (manifest.length) loadDeck(manifest[0].json);
  } catch (e) {
    showAlert("Could not load manifest. Check file path & CORS.");
    console.error(e);
  }
}

function showAlert(msg) {
  alertBox.textContent = msg;
  alertBox.hidden = false;
}
function clearAlert(){ alertBox.hidden = true; }

/* Load a deck JSON and render */
async function loadDeck(jsonPath) {
  clearAlert();
  try {
    const res = await fetch(`${jsonPath}?nocache=${Date.now()}`);
    if (!res.ok) throw new Error(`Failed to load ${jsonPath}`);
    const data = await res.json();

    renderSurah(data);
    // After render, fit the ayah blocks into the first screen
    requestAnimationFrame(() => fitAllAyahBlocks());
    window.addEventListener("resize", debounce(fitAllAyahBlocks, 120));
  } catch (e) {
    showAlert(e.message);
    console.error(e);
  }
}

/* ===== Rendering ===== */
function renderSurah(data){
  surahRoot.innerHTML = "";

  // Surah Meta
  const meta = document.createElement("section");
  meta.className = "surah-meta";
  meta.innerHTML = `
    <h2 class="surah-title-ar" lang="ar" dir="rtl">${data.name_ar || ""}</h2>
    <p class="surah-title-bn">${data.name_bn || ""}</p>
  `;
  surahRoot.appendChild(meta);

  // Verses
  (data.verses || []).forEach(v => {
    const card = document.createElement("article");
    card.className = "verse";

    // HERO (ayah + meaning, centered)
    const hero = document.createElement("div");
    hero.className = "ayah-hero";
    hero.innerHTML = `
      <div class="ayah-block">
        <p class="ayah-ar" lang="ar" dir="rtl">${escapeHTML(v.arabic || "")}</p>
        <p class="ayah-bn" lang="bn" dir="ltr">${escapeHTML(v.bangla || "")}</p>
      </div>
    `;
    card.appendChild(hero);

    // WORD CAROUSEL
    const wordArea = document.createElement("div");
    wordArea.className = "word-area";

    const railWrap = document.createElement("div");
    railWrap.className = "rail-wrap";

    const left = document.createElement("button");
    left.className = "rail-btn rail-left";
    left.setAttribute("aria-label", "Scroll left");
    left.innerHTML = "&larr;";

    const right = document.createElement("button");
    right.className = "rail-btn rail-right";
    right.setAttribute("aria-label", "Scroll right");
    right.innerHTML = "&rarr;";

    const rail = document.createElement("div");
    rail.className = "rail";
    (v.words || []).forEach(w => rail.appendChild(renderWordCard(w)));

    railWrap.appendChild(left);
    railWrap.appendChild(rail);
    railWrap.appendChild(right);
    wordArea.appendChild(railWrap);
    card.appendChild(wordArea);

    // wire arrows
    const step = () => {
      const colWidth = rail.firstElementChild
        ? rail.firstElementChild.getBoundingClientRect().width + 14 /* gap */
        : 300;
      return Math.max(colWidth * 1.2, 280);
    };
    const scrollLeft = () => rail.scrollBy({left: -step(), behavior: "smooth"});
    const scrollRight = () => rail.scrollBy({left: step(), behavior: "smooth"});

    left.addEventListener("click", scrollLeft);
    right.addEventListener("click", scrollRight);

    // disable arrows at ends
    const syncButtons = () => {
      left.disabled  = rail.scrollLeft < 8;
      const max = rail.scrollWidth - rail.clientWidth - 8;
      right.disabled = rail.scrollLeft >= max;
    };
    rail.addEventListener("scroll", throttle(syncButtons, 80));
    requestAnimationFrame(syncButtons);

    surahRoot.appendChild(card);
  });
}

function renderWordCard(w){
  const card = document.createElement("div");
  card.className = "word-card";

  // main block
  const main = document.createElement("div");
  main.className = "main-word";
  main.innerHTML = `
    <div class="ar" lang="ar" dir="rtl">${escapeHTML(w.ar || "")}</div>
    <div class="bn">${escapeHTML(w.bn || "")}</div>
  `;

  // chips
  const chips = document.createElement("div");
  chips.className = "chips";
  if (w.tr) chips.appendChild(chip(w.tr));
  if (w.root) chips.appendChild(chip(w.root));
  if (w.pattern) chips.appendChild(chip(w.pattern));

  card.appendChild(main);
  card.appendChild(chips);

  // derived list
  if (Array.isArray(w.derived) && w.derived.length){
    const list = document.createElement("div");
    list.className = "derived";
    w.derived.forEach(d => {
      const item = document.createElement("div");
      item.className = "derived-item";
      item.innerHTML = `
        <div class="ar" lang="ar" dir="rtl">${escapeHTML(d.ar || "")}</div>
        <div class="derived-meta">
          ${d.bn ? `<span class="chip">${escapeHTML(d.bn)}</span>` : ""}
          ${d.tr ? `<span class="chip">${escapeHTML(d.tr)}</span>` : ""}
          ${d.pattern ? `<span class="chip">${escapeHTML(d.pattern)}</span>` : ""}
        </div>
      `;
      list.appendChild(item);
    });
    card.appendChild(list);
  }

  return card;
}

function chip(text){
  const span = document.createElement("span");
  span.className = "chip";
  span.textContent = text;
  return span;
}

/* ===== Ayah fit (keep hero on first screen) =====
   Strategy:
   - Start from CSS variables (--ayah-ar-size / --ayah-bn-size).
   - If overflow in .ayah-hero, step both down a bit until it fits,
     with safe minimums so it stays readable. */
function fitAllAyahBlocks(){
  $$(".verse .ayah-hero").forEach(fitAyahBlock);
}
function fitAyahBlock(hero){
  const ar = hero.querySelector(".ayah-ar");
  const bn = hero.querySelector(".ayah-bn");
  if (!ar || !bn) return;

  // Reset to base
  setRootFontVars(1);

  // If fits already, done
  if (!overflows(hero)) return;

  // Step down gradually (bounded)
  let scale = 1.0;
  const minScale = 0.74;
  for (let i=0; i<16 && overflows(hero) && scale > minScale; i++){
    scale -= 0.02;
    setRootFontVars(scale);
  }
}
function setRootFontVars(scale){
  // Base sizes approximate the CSS clamp mid-point
  const baseAr = 2.6; // rem
  const baseBn = 1.4; // rem
  document.documentElement.style.setProperty("--ayah-ar-size", `${baseAr*scale}rem`);
  document.documentElement.style.setProperty("--ayah-bn-size", `${baseBn*scale}rem`);
}
function overflows(el){ return el.scrollHeight > el.clientHeight; }

/* ===== Utils ===== */
function escapeHTML(s){
  return String(s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
function debounce(fn, ms){
  let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); };
}
function throttle(fn, ms){
  let last=0, t;
  return (...a)=>{
    const now=Date.now();
    if (now-last>=ms){ last=now; fn(...a); }
    else{
      clearTimeout(t);
      t=setTimeout(()=>{ last=Date.now(); fn(...a); }, ms-(now-last));
    }
  };
}

init();
