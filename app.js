// utilities
const $ = (q, el=document) => el.querySelector(q);
const $$ = (q, el=document) => [...el.querySelectorAll(q)];

const deckSelect = $('#deckSelect');
const reloadBtn  = $('#reloadBtn');
const ayahArEl   = $('#ayahAr');
const ayahBnEl   = $('#ayahBn');
const scroller   = $('#cardsScroller');
const tpl        = $('#wordCardTpl');

const PATTERNS_WHITELIST = new Set([
  "فَعَلَ","فَعِلَ","فَعُلَ","أَفْعَلَ","فَعَّلَ","فَاعَلَ","تَفَعَّلَ","تَفَاعَلَ",
  "اِنْفَعَلَ","اِفْتَعَلَ","اِسْتَفْعَلَ","تَفْعِيل","مُفَاعَل","فُعَّال","فَعَلَات"
]);

async function loadManifest(){
  const r = await fetch('data/manifest.json');
  if(!r.ok) throw new Error('manifest load failed');
  return r.json();
}

function fillDecks(decks){
  deckSelect.innerHTML = '';
  decks.forEach(d => {
    const o = document.createElement('option');
    o.value = d.json;
    o.textContent = d.name;
    deckSelect.appendChild(o);
  });
}

async function loadSurah(url){
  const r = await fetch(url);
  if(!r.ok) throw new Error('surah json load failed');
  return r.json();
}

function renderAyah(ayah){
  ayahArEl.textContent = ayah.arabic || '';
  ayahBnEl.textContent = ayah.bn || '';
}

function makeDerivedItem(dw){
  // normalize + filter patterns to our short list
  const patt = (dw.pattern || '').trim();
  const pattOk = PATTERNS_WHITELIST.has(patt) ? patt : '';
  const div = document.createElement('div');
  div.className = 'derived-item';
  div.innerHTML = `
    <div class="ar">${dw.ar || ''}</div>
    <div class="bn">${dw.bn || ''}</div>
    <div class="meta">
      <span>${dw.tr || ''}</span>
      ${pattOk ? `<span>${pattOk}</span>` : ''}
    </div>`;
  return div;
}

function makeWordCard(w){
  const node = tpl.content.firstElementChild.cloneNode(true);
  node.querySelector('[data-field="ar"]').textContent = w.ar || '';
  node.querySelector('[data-field="bn"]').textContent = w.bn || '';
  node.querySelector('[data-field="tr"]').textContent = w.tr || '';
  node.querySelector('[data-field="root"]').textContent = w.root || '';
  node.querySelector('[data-field="pattern"]').textContent =
    PATTERNS_WHITELIST.has((w.pattern||'').trim()) ? w.pattern : '';

  const list = node.querySelector('[data-field="derived"]');
  (w.derived || [])
    .filter(dw => dw.ar !== w.ar) // do not repeat the main word
    .forEach(dw => list.appendChild(makeDerivedItem(dw)));
  return node;
}

function renderWords(words){
  scroller.innerHTML = '';
  words.forEach(w => scroller.appendChild(makeWordCard(w)));
}

async function boot(){
  try{
    const decks = await loadManifest();
    fillDecks(decks);

    const firstJson = deckSelect.value || (decks[0] && decks[0].json);
    if(firstJson){
      const data = await loadSurah(firstJson);
      const firstAyah = data?.surah?.verses?.[0];
      if(firstAyah){
        renderAyah(firstAyah);
        renderWords(firstAyah.words || []);
      }
    }
  }catch(e){
    console.error(e);
    alert('Load error: ' + e.message);
  }
}

deckSelect.addEventListener('change', async () => {
  const data = await loadSurah(deckSelect.value);
  const firstAyah = data?.surah?.verses?.[0];
  if(firstAyah){
    renderAyah(firstAyah);
    renderWords(firstAyah.words || []);
  }
});

reloadBtn.addEventListener('click', boot);

boot();
