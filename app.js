/* ========= Config ========= */
const MANIFEST_PATH = "manifest.json"; // root
const STRIP_STEP = 600;                // px per arrow click

/* ========= State ========= */
let manifest = [];
let currentIdx = 0;
let data = null;
let ayahIndex = 0;

/* ========= DOM ========= */
const surahSelect = document.getElementById("surahSelect");
const surahTitleAr = document.getElementById("surahTitleAr");
const surahTitleBn = document.getElementById("surahTitleBn");

const ayahNumber = document.getElementById("ayahNumber");
const ayahArabic = document.getElementById("ayahArabic");
const ayahBangla = document.getElementById("ayahBangla");
const wordStrip = document.getElementById("wordStrip");

const prevAyahBtn = document.getElementById("prevAyah");
const nextAyahBtn = document.getElementById("nextAyah");

const stripLeftBtn  = document.getElementById("stripLeft");   // visually left (→)
const stripRightBtn = document.getElementById("stripRight");  // visually right (←)

/* ========= RTL scroll type detection ========= */
/* Some browsers use:
   - 'default'  : scrollLeft decreases when moving visually right
   - 'negative' : scrollLeft is negative at right edge
   - 'reverse'  : scrollLeft increases when moving visually right
*/
function detectRtlScrollType() {
  const el = document.createElement('div');
  el.style.width = '100px';
  el.style.height = '1px';
  el.style.overflow = 'scroll';
  el.style.direction = 'rtl';
  el.style.visibility = 'hidden';

  const inner = document.createElement('div');
  inner.style.width = '200px';
  inner.style.height = '1px';
  el.appendChild(inner);
  document.body.appendChild(el);

  const start = el.scrollLeft;
  el.scrollLeft = 1;
  const moved = el.scrollLeft;

  let type = 'default';
  if (start === 0 && moved === 0) type = 'negative';
  else if (start > 0) type = 'reverse';
  else type = 'default';

  document.body.removeChild(el);
  return type;
}
const rtlScrollType = detectRtlScrollType();

/* Convert a visual delta to the correct logical scrollLeft change */
function visualDeltaToLogical(delta) {
  switch (rtlScrollType) {
    case 'negative': return -delta;
    case 'reverse':  return  delta;
    default:         return -delta;
  }
}

function scrollToRightEdge(strip) {
  // position to the visual rightmost (first word)
  if (rtlScrollType === 'negative') {
    strip.scrollLeft = -strip.scrollWidth;
  } else if (rtlScrollType === 'reverse') {
    strip.scrollLeft = 0;
  } else {
    strip.scrollLeft = strip.scrollWidth;
  }
}

function scrollByVisual(strip, delta) {
  strip.scrollLeft += visualDeltaToLogical(delta);
}

/* ========= Load manifest & data ========= */
async function loadManifest() {
  const res = await fetch(MANIFEST_PATH, { cache: 'no-store' });
  if (!res.ok) throw new Error("Could not load manifest. Check file path & hosting.");
  manifest = await res.json();
  fillSurahSelect();
}

function fillSurahSelect() {
  surahSelect.innerHTML = manifest.map((m, i) =>
    `<option value="${i}">${m.name}</option>`).join('');
  surahSelect.value = currentIdx;
}

async function loadSurah(idx) {
  currentIdx = idx;
  const item = manifest[idx];
  const res = await fetch(item.json, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to load surah JSON");
  data = await res.json();
  ayahIndex = 0;
  renderSurahHeader(item, data);
  renderAyah();
}

/* ========= Renderers ========= */
function renderSurahHeader(manifestItem, surahData) {
  // Pull surah number from first ayah_id if needed
  const firstAyah = surahData.verses?.[0]?.ayah_id || "";
  const surahNum = firstAyah.split(":")[0] || manifestItem.id || "";
  surahTitleAr.textContent = surahData.name_ar || `سورة ${surahNum}`;
  surahTitleBn.textContent = surahData.name_bn || manifestItem.name || "";
}

function renderAyah() {
  const verses = data.verses || [];
  const v = verses[ayahIndex];
  if (!v) return;

  // Ayah number from ayah_id (e.g., "67:3" → 3)
  const parts = (v.ayah_id || "").split(":");
  const numberOnly = parts[1] || "";
  ayahNumber.textContent = `Ayah ${numberOnly}`;

  ayahArabic.textContent = v.arabic || "";
  ayahBangla.textContent = v.bangla || "";

  // Words
  wordStrip.innerHTML = "";
  (v.words || []).forEach((w, idx) => {
    const tile = buildWordTile(w, idx);
    wordStrip.appendChild(tile);
  });

  // IMPORTANT: after content is in the DOM, jump to right edge so first word is on the right
  requestAnimationFrame(() => scrollToRightEdge(wordStrip));
}

function buildWordTile(w, idx) {
  const tile = document.createElement('div');
  tile.className = 'word-tile';
  tile.setAttribute('tabindex', '0');
  tile.setAttribute('role', 'group');
  tile.setAttribute('aria-label', `Word ${idx+1}`);

  // main (top) box
  const main = document.createElement('div');
  main.className = 'word-main';

  const ar = document.createElement('p');
  ar.className = 'word-ar';
  ar.setAttribute('lang', 'ar');
  ar.setAttribute('dir', 'rtl');
  ar.textContent = w.ar || "";
  main.appendChild(ar);

  const bn = document.createElement('p');
  bn.className = 'word-bn';
  bn.textContent = w.bn || "";
  main.appendChild(bn);

  const meta = document.createElement('div');
  meta.className = 'word-meta';
  if (w.tr) {
    const b = document.createElement('span');
    b.className = 'badge';
    b.textContent = w.tr;
    meta.appendChild(b);
  }
  if (w.root) {
    const b = document.createElement('span');
    b.className = 'badge';
    b.textContent = w.root;
    meta.appendChild(b);
  }
  if (w.pattern) {
    const b = document.createElement('span');
    b.className = 'badge';
    b.textContent = w.pattern;
    meta.appendChild(b);
  }
  main.appendChild(meta);
  tile.appendChild(main);

  // derived (collapsed by default)
  const derived = Array.isArray(w.derived) ? w.derived.slice(0, 4) : []; // show up to 4

  const dh = document.createElement('div');
  dh.className = 'derived-header';
  const ttl = document.createElement('div');
  ttl.className = 'derived-title';
  ttl.textContent = 'Derived';
  const btn = document.createElement('button');
  btn.className = 'expand-btn';
  btn.setAttribute('aria-expanded', 'false');
  btn.textContent = '+';
  dh.appendChild(ttl); dh.appendChild(btn);
  tile.appendChild(dh);

  const grid = document.createElement('div');
  grid.className = 'derived-grid';
  grid.hidden = true;

  derived.forEach(d => {
    const card = document.createElement('div');
    card.className = 'derived-card';

    const dar = document.createElement('p');
    dar.className = 'derived-ar';
    dar.setAttribute('lang','ar'); dar.setAttribute('dir','rtl');
    dar.textContent = d.ar || "";
    card.appendChild(dar);

    const dbn = document.createElement('p');
    dbn.className = 'derived-bn';
    dbn.textContent = d.bn || "";
    card.appendChild(dbn);

    const dmeta = document.createElement('div');
    dmeta.className = 'derived-meta';
    const parts = [];
    if (d.tr) parts.push(d.tr);
    if (d.pattern) parts.push(d.pattern);
    dmeta.textContent = parts.join(' • ');
    card.appendChild(dmeta);

    grid.appendChild(card);
  });
  tile.appendChild(grid);

  // toggle
  function toggle() {
    const isOpen = grid.hidden === false;
    grid.hidden = isOpen;
    btn.textContent = isOpen ? '+' : '−';
    btn.setAttribute('aria-expanded', String(!isOpen));
  }
  btn.addEventListener('click', toggle);
  dh.addEventListener('click', (e) => {
    if (e.target !== btn) toggle();
  });

  return tile;
}

/* ========= Events ========= */
surahSelect.addEventListener('change', (e) => loadSurah(Number(e.target.value)));

prevAyahBtn.addEventListener('click', () => {
  if (!data?.verses) return;
  ayahIndex = Math.max(0, ayahIndex - 1);
  renderAyah();
});
nextAyahBtn.addEventListener('click', () => {
  if (!data?.verses) return;
  ayahIndex = Math.min(data.verses.length - 1, ayahIndex + 1);
  renderAyah();
});

// Visual scroll buttons (remember: container is RTL)
stripLeftBtn.addEventListener('click', () => scrollByVisual(wordStrip, +STRIP_STEP));  // visually left
stripRightBtn.addEventListener('click', () => scrollByVisual(wordStrip, -STRIP_STEP)); // visually right

// Keyboard support on strip (ArrowLeft/Right visual)
wordStrip.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') { e.preventDefault(); scrollByVisual(wordStrip, +STRIP_STEP); }
  if (e.key === 'ArrowRight'){ e.preventDefault(); scrollByVisual(wordStrip, -STRIP_STEP); }
});

/* ========= Init ========= */
(async function init(){
  try{
    await loadManifest();
    await loadSurah(0);
  }catch(err){
    console.error(err);
    alert(err.message);
  }
})();
