/*  App: Qur'an Word Explorer
    - Dark theme + centered verse
    - LTR/RTL full mirroring toggle
    - Derived forms: summary (+N) -> expandable 2×2 grid
    - Variable-height cards
*/

const els = {
  dirToggle: document.getElementById('dirToggle'),
  surahSelect: document.getElementById('surahSelect'),
  surahNameAr: document.getElementById('surahNameAr'),
  surahNameBn: document.getElementById('surahNameBn'),
  ayahBadge: document.getElementById('ayahBadge'),
  ayahArabic: document.getElementById('ayahArabic'),
  ayahBangla: document.getElementById('ayahBangla'),
  cardsRow: document.getElementById('cardsRow'),
  prevAyah: document.getElementById('prevAyah'),
  nextAyah: document.getElementById('nextAyah'),
  ayahCounter: document.getElementById('ayahCounter'),
};

let manifest = [];
let currentDeck = null;     // { id, name, json, mode }
let surah = null;           // loaded JSON: { verses: [...] }
let ayahIndex = 0;          // 0-based

// ---------- bootstrap ----------
init().catch(console.error);

async function init(){
  await loadManifest();
  buildSurahDropdown();
  wireTopbar();
  // load the first deck by default
  if (manifest.length) {
    await selectDeck(manifest[0].id);
  }
}

// Manifest expected at root: /manifest.json
async function loadManifest(){
  try{
    const res = await fetch('manifest.json', {cache: 'no-store'});
    if(!res.ok) throw new Error('manifest fetch failed');
    manifest = await res.json();
  }catch(e){
    console.error('Could not load manifest. Check file path & hosting.', e);
    showToast('Could not load manifest. Check file path & hosting.');
    manifest = [];
  }
}

function buildSurahDropdown(){
  // Clean and repopulate
  els.surahSelect.innerHTML = '';
  manifest.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.name || m.id;
    els.surahSelect.appendChild(opt);
  });
  els.surahSelect.addEventListener('change', async (e)=>{
    await selectDeck(e.target.value);
  });
}

async function selectDeck(id){
  currentDeck = manifest.find(m => m.id === id) || manifest[0];
  if(!currentDeck) return;
  try{
    const res = await fetch(currentDeck.json, {cache: 'no-store'});
    if(!res.ok) throw new Error('surah json fetch failed');
    surah = await res.json();
    ayahIndex = 0;
    renderAyah();
  }catch(e){
    console.error('Failed loading surah json', e);
    showToast('Could not load surah JSON. Check path in manifest.');
  }
}

// ---------- rendering ----------
function renderAyah(){
  if(!surah || !surah.verses || !surah.verses.length) return;

  const v = surah.verses[ayahIndex];

  // Headings
  els.surahNameAr.textContent = surah.name_ar || '';
  els.surahNameBn.textContent = surah.name_bn || '';
  els.ayahBadge.textContent = `Ayah ${ayahIndex + 1}`;

  // Verse lines
  els.ayahArabic.textContent = v.arabic || '';
  els.ayahBangla.textContent = v.bangla || '';

  // Cards
  els.cardsRow.innerHTML = '';
  (v.words || []).forEach(w => {
    els.cardsRow.appendChild(buildWordCard(w));
  });

  // nav
  els.ayahCounter.textContent = `${ayahIndex + 1} / ${surah.verses.length}`;
  toggleNav()
}

function toggleNav(){
  els.prevAyah.disabled = (ayahIndex === 0);
  els.nextAyah.disabled = (ayahIndex >= surah.verses.length - 1);
}

els.prevAyah.addEventListener('click', ()=>{
  if(ayahIndex > 0){ ayahIndex--; renderAyah(); }
});
els.nextAyah.addEventListener('click', ()=>{
  if(ayahIndex < surah.verses.length - 1){ ayahIndex++; renderAyah(); }
});

function buildWordCard(w){
  const card = document.createElement('article');
  card.className = 'word-card';

  // MAIN block
  const mainLbl = el('span','section-label','MAIN');
  const ar = el('h3','word-ar', w.ar || '');
  ar.setAttribute('lang','ar'); ar.setAttribute('dir','rtl');

  const bn = el('p','word-bn', w.bn || '');
  const meta = el('div','meta-row');
  if (w.tr) meta.appendChild(chip(w.tr));
  if (w.root) meta.appendChild(chip(w.root));
  if (w.pattern) meta.appendChild(chip(w.pattern));

  card.append(mainLbl, ar, bn, meta, el('div','hr'));

  // DERIVED block
  const dLbl = el('span','section-label','DERIVED');
  const wrapper = document.createElement('div');
  wrapper.appendChild(dLbl);

  const derived = Array.isArray(w.derived) ? w.derived : [];
  const summary = el('div','derived-summary');
  const firstTwo = derived.slice(0,2);
  firstTwo.forEach(d => summary.appendChild(derivedChip(d)));
  if (derived.length > 2) {
    const more = document.createElement('button');
    more.className = 'more-btn';
    more.textContent = `+${derived.length - 2} more`;
    more.addEventListener('click', ()=>{
      more.remove();
      summary.remove();
      wrapper.appendChild(buildDerivedGrid(derived));
    });
    summary.appendChild(more);
  }
  if (derived.length === 0) {
    const none = document.createElement('span');
    none.className = 'chip';
    none.textContent = '—';
    summary.appendChild(none);
  }
  wrapper.appendChild(summary);
  card.appendChild(wrapper);

  return card;
}

function buildDerivedGrid(list){
  const grid = el('div','derived-grid');
  list.forEach(d => {
    const item = el('div','derived-item');
    const ar = el('div','derived-ar', d.ar || '');
    ar.setAttribute('lang','ar'); ar.setAttribute('dir','rtl');
    const bn = el('div','derived-bn', d.bn || '');
    const line = el('div','derived-line');
    if (d.tr) line.appendChild(chip(d.tr));
    if (d.pattern) line.appendChild(chip(d.pattern));
    if (d.root) line.appendChild(chip(d.root));
    item.append(ar,bn,line);
    grid.appendChild(item);
  });
  return grid;
}

/* helpers */
function el(tag, cls, txt){
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt != null) e.textContent = txt;
  return e;
}
function chip(text){
  const c = document.createElement('span');
  c.className = 'chip';
  c.textContent = text;
  return c;
}
function derivedChip(d){
  const c = document.createElement('span');
  c.className = 'chip';
  c.textContent = d?.ar ? `${d.ar}${d.bn?` — ${d.bn}`:''}` : (d?.bn || '—');
  return c;
}

// ---------- LTR / RTL toggle ----------
function wireTopbar(){
  els.dirToggle.addEventListener('click', ()=>{
    const isRtl = document.body.getAttribute('dir') === 'rtl';
    document.body.setAttribute('dir', isRtl ? 'ltr' : 'rtl');
    els.dirToggle.textContent = isRtl ? 'LTR' : 'RTL';
  });
}

// Toast (console fallback)
function showToast(msg){
  console.log('[Toast]', msg);
}
