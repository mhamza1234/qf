/* Minimal changes:
   - Tiles auto-size via CSS (no fixed card width in JS)
   - Removed "Derived" label & removed all pattern usage
   - Distinct shade for main vs. derived tiles is handled in CSS
   - Keep RTL word order and (+) expand working (2x2 grid)
*/

const MANIFEST_PATH = "manifest.json"; // stays at root per your setup
let manifest = [];
let current = {
  surahKey: null,
  surahData: null,
  ayahIndex: 0
};

const el = (sel) => document.querySelector(sel);
const surahSelect = el('#surahSelect');
const surahTitleAr = el('#surahTitleAr');
const ayahHeader = el('#ayahHeader');
const ayahArabic = el('#ayahArabic');
const ayahBangla = el('#ayahBangla');
const wordStrip = el('#wordStrip');
const prevAyahBtn = el('#prevAyah');
const nextAyahBtn = el('#nextAyah');
const ayahPos = el('#ayahPos');

init();

async function init(){
  try{
    manifest = await fetchJSON(MANIFEST_PATH);
  }catch(e){
    console.error("Could not load manifest", e);
  }
  populateSurahSelect();
  if (manifest.length){
    await loadSurah(manifest[0].id);
  }
  wireNav();
}

function populateSurahSelect(){
  surahSelect.innerHTML = "";
  manifest.forEach(item=>{
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = item.name || item.id;
    surahSelect.appendChild(opt);
  });
  surahSelect.addEventListener('change', async ()=>{
    await loadSurah(surahSelect.value);
  });
}

async function loadSurah(id){
  const item = manifest.find(x=>x.id===id);
  if(!item) return;
  current.surahKey = id;
  current.ayahIndex = 0;
  try{
    current.surahData = await fetchJSON(item.json);
  }catch(e){
    console.error("Failed to load surah json", e);
    return;
  }
  renderAyah();
}

function wireNav(){
  prevAyahBtn.addEventListener('click', ()=>{
    if (!current.surahData) return;
    if (current.ayahIndex>0){ current.ayahIndex--; renderAyah(); }
  });
  nextAyahBtn.addEventListener('click', ()=>{
    if (!current.surahData) return;
    const max = current.surahData.verses.length - 1;
    if (current.ayahIndex<max){ current.ayahIndex++; renderAyah(); }
  });
}

function renderAyah(){
  const data = current.surahData;
  if (!data) return;

  const v = data.verses[current.ayahIndex];
  // Title (Arabic only at top)
  surahTitleAr.textContent = data.name_ar || "";

  // Ayah header with number extracted from ayah_id
  const num = (v.ayah_id && v.ayah_id.split(':')[1]) ? v.ayah_id.split(':')[1] : (current.ayahIndex+1);
  ayahHeader.textContent = `আয়াত ${num}`;

  // Ayah text + Bangla
  ayahArabic.textContent = v.arabic || "";
  ayahBangla.textContent = v.bangla || "";

  // Word tiles (RTL strip; we render in natural order, container handles RTL)
  wordStrip.innerHTML = "";
  (v.words || []).forEach((w, idx)=>{
    const card = buildWordCard(w);
    wordStrip.appendChild(card);
  });

  // Pager pos
  ayahPos.textContent = `${current.ayahIndex+1} / ${data.verses.length}`;
}

function buildWordCard(w){
  // Main word card (no pattern output)
  const card = document.createElement('article');
  card.className = 'word-card'; // base main tile style (distinct from derived via color)

  const head = document.createElement('div');
  head.className = 'word-head';

  const main = document.createElement('div');
  main.className = 'word-main';

  const ar = document.createElement('div');
  ar.className = 'word-ar';
  ar.setAttribute('lang','ar');
  ar.setAttribute('dir','rtl');
  ar.textContent = w.ar || "";

  const bn = document.createElement('div');
  bn.className = 'word-bn';
  bn.textContent = w.bn || "";

  const tr = document.createElement('div');
  tr.className = 'word-tr';
  tr.textContent = w.tr || "";

  const root = document.createElement('div');
  root.className = 'word-root';
  root.textContent = w.root ? w.root : "";

  main.appendChild(ar);
  if (w.bn) main.appendChild(bn);
  if (w.tr) main.appendChild(tr);
  if (w.root) main.appendChild(root);

  // Expand toggle only if we have derived list
  let toggler = null;
  let wrap = null;
  if (Array.isArray(w.derived) && w.derived.length){
    toggler = document.createElement('button');
    toggler.type = 'button';
    toggler.className = 'expand-btn';
    toggler.setAttribute('aria-label','Show related words');
    toggler.textContent = '+';

    wrap = document.createElement('div');
    wrap.className = 'derived-wrap'; // closed by default

    const grid = document.createElement('div');
    grid.className = 'derived-grid';

    // show up to 4 in a compact 2x2; if more, still fits due to grid auto flow
    w.derived.forEach(d=>{
      const dt = document.createElement('div');
      dt.className = 'derived-tile';

      const dar = document.createElement('div');
      dar.className = 'derived-ar';
      dar.setAttribute('lang','ar'); dar.setAttribute('dir','rtl');
      dar.textContent = d.ar || "";

      const dbn = document.createElement('div');
      dbn.className = 'derived-bn';
      dbn.textContent = d.bn || "";

      const dtr = document.createElement('div');
      dtr.className = 'derived-tr';
      dtr.textContent = d.tr || "";

      dt.appendChild(dar);
      if (d.bn) dt.appendChild(dbn);
      if (d.tr) dt.appendChild(dtr);
      grid.appendChild(dt);
    });

    wrap.appendChild(grid);

    toggler.addEventListener('click', ()=>{
      const open = wrap.classList.toggle('open');
      toggler.textContent = open ? '−' : '+';
      toggler.setAttribute('aria-label', open ? 'Hide related words' : 'Show related words');
    });
  }

  head.appendChild(main);
  if (toggler) head.appendChild(toggler);

  card.appendChild(head);
  if (wrap) card.appendChild(wrap);

  // If this is a derived-only item coming from some list (not in your current data), use .word-card--derived
  // For your current flow, main tiles remain .word-card and derived are inside.

  return card;
}

async function fetchJSON(path){
  const res = await fetch(path, {cache:'no-store'});
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
