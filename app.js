/* ===== Utilities ===== */

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};

const fetchJson = (path) => fetch(path, { cache: "no-store" }).then(r => {
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${path}`);
  return r.json();
});

/* ===== State ===== */

let decks = [];
let currentDeck = null;

/* ===== Bootstrap ===== */

document.addEventListener('DOMContentLoaded', async () => {
  const root = $('#root');
  root.innerHTML = $('#spinnerTpl').innerHTML;

  try {
    decks = await fetchJson('data/manifest.json');
    populateDeckSelect(decks);
    const first = decks[0];
    if (first) {
      $('#deckSelect').value = first.id;
      await loadDeck(first);
    } else {
      root.textContent = 'No decks found in data/manifest.json';
    }
  } catch (e) {
    console.error(e);
    root.innerHTML = `<div class="spinner-wrap" style="color:#a33">Could not load manifest. Check file path & hosting.</div>`;
  }

  $('#deckSelect').addEventListener('change', async (e) => {
    const deck = decks.find(d => d.id === e.target.value);
    if (deck) await loadDeck(deck);
  });

  $('#reloadBtn').addEventListener('click', async () => {
    if (currentDeck) await loadDeck(currentDeck);
  });
});

/* ===== UI wiring ===== */

function populateDeckSelect(list){
  const sel = $('#deckSelect');
  sel.innerHTML = '';
  list.forEach(d => {
    const opt = el('option', null, d.name);
    opt.value = d.id;
    sel.appendChild(opt);
  });
}

async function loadDeck(deck){
  currentDeck = deck;
  const root = $('#root');
  root.innerHTML = $('#spinnerTpl').innerHTML;

  try{
    const data = await fetchJson(deck.json); // expects { verses: [...] }
    renderSurah(root, deck, data);
  }catch(e){
    console.error(e);
    root.innerHTML = `<div class="spinner-wrap" style="color:#a33">Could not load ${deck.json}. Check path & JSON validity.</div>`;
  }
}

/* ===== Rendering ===== */

function renderSurah(root, deck, data){
  const frag = document.createDocumentFragment();

  (data.verses || []).forEach(v => {
    frag.appendChild(renderVerse(v));
  });

  root.innerHTML = '';
  root.appendChild(frag);
}

function renderVerse(verse){
  const ayahNo = (verse.ayah_id || '').split(':')[1] || '';

  const sec = el('section', 'verse');

  const head = el('header', 'verse-head');
  head.innerHTML = `
    <span class="ayah-badge" aria-label="Ayah">${ayahNo}</span>
    <p class="ayah-arabic clamp" dir="rtl" lang="ar">${safe(verse.arabic)}</p>
    <p class="ayah-bangla clamp" dir="ltr" lang="bn">${safe(verse.bangla)}</p>
  `;
  sec.appendChild(head);

  const lane = el('div', 'word-lane');
  (verse.words || []).forEach(w => lane.appendChild(renderWordCard(w)));
  sec.appendChild(lane);

  return sec;
}

function renderWordCard(w){
  const hasDerived = Array.isArray(w.derived) && w.derived.length > 0;

  const card = el('article', `word-card ${!hasDerived ? 'word-card--no-derived' : ''}`);

  // MAIN
  const main = el('div', 'word-card__main');
  main.appendChild(el('div','word-card__arabic', safe(w.ar)));
  main.appendChild(el('div','word-mean', safe(w.bn)));

  const chips = el('div','chips');
  if (w.tr) chips.appendChild(chip(safe(w.tr)));
  if (w.root) chips.appendChild(chip(safe(w.root), 'ar'));
  if (w.pattern) chips.appendChild(chip(safe(w.pattern), 'ar'));
  main.appendChild(chips);

  card.appendChild(main);

  // DERIVED
  if (hasDerived){
    const derivedWrap = el('div','word-card__derived');
    w.derived.forEach(d => {
      const row = el('div','derived-row');
      if (d.ar) row.appendChild(chip(safe(d.ar), 'ar'));
      if (d.bn) row.appendChild(chip(safe(d.bn)));
      if (d.tr) row.appendChild(chip(safe(d.tr)));
      if (d.pattern) row.appendChild(chip(safe(d.pattern), 'ar'));
      derivedWrap.appendChild(row);
    });
    card.appendChild(derivedWrap);
  }

  return card;
}

function chip(text, extra){
  const c = el('span', `chip ${extra ? extra : ''}`, text);
  return c;
}

function safe(s){
  return (s == null) ? '' : String(s);
}
