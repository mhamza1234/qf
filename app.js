/* Qur'an Word Explorer
   - Rightmost-first row (row-reverse) with leftward scrolling
   - Warm dark theme
   - Centered ayah + Bangla translation
   - Cards with clear main/derived separation
   - Variable-height tiles
*/

const sel = (q, el = document) => el.querySelector(q);
const create = (tag, cls) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  return el;
};

const state = {
  manifest: null,
  active: null,   // active manifest entry
  data: null      // loaded surah data
};

const loadStatus = sel('#loadStatus');
const content = sel('#content');
const surahSelect = sel('#surahSelect');

/** Parse ayah number and surah number from "67:5" */
function parseAyahId(ayahId){
  const [s, a] = String(ayahId).split(':');
  return { surahNum: Number(s), ayahNum: Number(a) };
}

/** Fetch JSON helper with nice error text */
async function fetchJSON(path){
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
  return res.json();
}

/** Initialize */
document.addEventListener('DOMContentLoaded', async () => {
  try{
    loadStatus.textContent = 'Loading manifest…';
    // Manifest MUST be in site root as "manifest.json"
    state.manifest = await fetchJSON('manifest.json');

    // Populate dropdown
    surahSelect.innerHTML = state.manifest.map((m, i) =>
      `<option value="${i}">${m.name}</option>`
    ).join('');

    // choose first
    state.active = state.manifest[0];
    surahSelect.value = "0";

    // Load first surah
    await loadActive();
  }catch(err){
    console.error(err);
    loadStatus.textContent = 'Could not load manifest. Check file path & hosting.';
  }
});

surahSelect.addEventListener('change', async (e) => {
  const idx = Number(e.target.value);
  state.active = state.manifest[idx];
  await loadActive();
});

async function loadActive(){
  try{
    loadStatus.textContent = 'Loading surah…';
    state.data = await fetchJSON(state.active.json);
    renderSurah(state.data, state.active);
    loadStatus.textContent = '';
  }catch(err){
    console.error(err);
    loadStatus.textContent = 'Could not load surah data. Check JSON path.';
  }
}

/** Render entire surah */
function renderSurah(data, meta){
  content.innerHTML = '';

  // Title area
  const titleAr = create('h2', 'surah-title-ar');
  titleAr.textContent = data.name_ar || '—';

  // Build a human sub-title from first ayah id (no need for surah number in JSON)
  const firstAyah = data?.verses?.[0]?.ayah_id || '';
  const { surahNum } = parseAyahId(firstAyah);

  const sub = create('div', 'surah-title-sub');
  sub.textContent = `${meta.name} • Surah ${surahNum}`;

  content.append(titleAr, sub);

  // Verses
  (data.verses || []).forEach(verse => {
    content.append(renderAyah(verse));
  });
}

/** Render one ayah block */
function renderAyah(verse){
  const { ayahNum } = parseAyahId(verse.ayah_id || '');

  const wrap = create('section', 'ayah');

  const header = create('div', 'ayah-header');
  const num = create('div', 'ayah-number');
  num.textContent = `Ayah ${isNaN(ayahNum) ? '?' : ayahNum}`;

  const ar = create('p', 'ayah-ar');
  ar.textContent = verse.arabic || '';

  const bn = create('p', 'ayah-bn');
  bn.textContent = verse.bangla || '';

  header.append(num, ar, bn);
  wrap.append(header);

  // Cards row (RTL visual flow)
  const row = create('div', 'cards-row');
  (verse.words || []).forEach(word => {
    row.append(renderWordCard(word));
  });

  wrap.append(row);

  // After it’s in the DOM, move scroll to far right (so first word shows)
  requestAnimationFrame(() => initAyahRowScrolling(row));

  return wrap;
}

/** Render one word card (main + derived group inside) */
function renderWordCard(w){
  const card = create('article', 'word-card');

  // MAIN block
  const main = create('div', 'main-block');

  const mainAr = create('div', 'main-ar');
  mainAr.setAttribute('lang', 'ar');
  mainAr.setAttribute('dir', 'rtl');
  mainAr.textContent = w.ar || '';

  const mainBn = create('div', 'main-bn');
  mainBn.textContent = w.bn || '';

  const metaLine = create('div', 'meta');
  // Transliteration
  if (w.tr) {
    const b1 = create('span', 'badge');
    b1.textContent = w.tr;
    metaLine.append(b1);
  }
  // Root
  if (w.root) {
    const b2 = create('span', 'badge');
    b2.textContent = w.root;
    metaLine.append(b2);
  }
  // Pattern
  if (w.pattern) {
    const b3 = create('span', 'badge');
    b3.textContent = w.pattern;
    metaLine.append(b3);
  }

  main.append(mainAr, mainBn, metaLine);
  card.append(main);

  // Divider
  const hasDerived = Array.isArray(w.derived) && w.derived.length > 0;
  if (hasDerived){
    card.append(create('div', 'divider'));

    // Derived block
    const dWrap = create('div', 'derived-wrap');
    const dTitle = create('div', 'derived-title');
    dTitle.textContent = 'Related forms';
    dWrap.append(dTitle);

    w.derived.forEach(d => {
      const item = create('div', 'derived-item');

      const dAr = create('div', 'derived-ar');
      dAr.setAttribute('lang', 'ar');
      dAr.setAttribute('dir', 'rtl');
      dAr.textContent = d.ar || '';

      const dLine = create('div', 'derived-line');
      // bn (meaning), tr, pattern — compact, no labels (consistent order)
      const parts = [];
      if (d.bn) parts.push(d.bn);
      if (d.tr) parts.push(d.tr);
      if (d.pattern) parts.push(d.pattern);
      dLine.textContent = parts.join(' • ');

      item.append(dAr, dLine);
      dWrap.append(item);
    });

    card.append(dWrap);
  }

  return card;
}

/** Put the row’s scroll position to the right end (for row-reverse lanes) */
function initAyahRowScrolling(rowEl){
  // First try
  rowEl.scrollLeft = rowEl.scrollWidth;

  // If first paint ignores it, try next frame
  requestAnimationFrame(() => {
    rowEl.scrollLeft = rowEl.scrollWidth;
  });
}
