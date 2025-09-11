const state = {
  manifest: null,
  currentDeck: null,
  data: null
};

const els = {
  deckSelect: document.getElementById('deckSelect'),
  reloadBtn: document.getElementById('reloadBtn'),
  alert: document.getElementById('alert'),
  ayahHeader: document.getElementById('ayahHeader'),
  ayahArabic: document.getElementById('ayahArabic'),
  ayahBangla: document.getElementById('ayahBangla'),
  scroller: document.getElementById('cardsScroller'),
  cards: document.getElementById('cards')
};

function showAlert(msg){
  els.alert.textContent = msg;
  els.alert.hidden = false;
}
function hideAlert(){ els.alert.hidden = true; }

async function loadManifest(){
  hideAlert();
  try{
    const res = await fetch('data/manifest.json', { cache: 'no-store' });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    state.manifest = await res.json();

    els.deckSelect.innerHTML = '';
    state.manifest.forEach(d=>{
      const opt = document.createElement('option');
      opt.value = d.id; opt.textContent = d.name;
      els.deckSelect.appendChild(opt);
    });
    state.currentDeck = state.manifest[0]?.id || null;
  }catch(err){
    showAlert(`Failed to load manifest.json – ${err.message}`);
    throw err;
  }
}

async function loadDeck(){
  hideAlert();
  const deck = state.manifest.find(d=>d.id===state.currentDeck);
  if(!deck){ showAlert('No deck selected.'); return; }

  try{
    const res = await fetch(deck.json, { cache: 'no-store' });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    state.data = await res.json();

    renderAyah(state.data.verses[0]);  // first ayah only for now
    renderCards(state.data.verses[0]);
  }catch(err){
    showAlert(`Failed to load ${deck.json} – ${err.message}`);
    console.error(err);
  }
}

function renderAyah(ayah){
  if(!ayah){ els.ayahHeader.hidden = true; return; }
  els.ayahArabic.textContent = ayah.arabic || '';
  els.ayahBangla.textContent = ayah.bangla || '';
  els.ayahHeader.hidden = false;
}

function chip(text){
  const span = document.createElement('span');
  span.className = 'chip';
  span.textContent = text;
  return span;
}

function renderCards(ayah){
  els.cards.innerHTML = '';
  if(!ayah || !Array.isArray(ayah.words)){ els.scroller.hidden = true; return; }

  ayah.words.forEach(w=>{
    const card = document.createElement('div');
    card.className = 'card';

    // Top box (main word)
    const main = document.createElement('div');
    main.className = 'main';

    const ar = document.createElement('div');
    ar.className = 'word-ar';
    ar.textContent = w.ar || '';
    main.appendChild(ar);

    const bn = document.createElement('div');
    bn.className = 'word-bn';
    bn.textContent = w.bn || '';
    main.appendChild(bn);

    const meta = document.createElement('div');
    meta.className = 'word-meta';
    if(w.tr) meta.appendChild(chip(w.tr));
    if(w.root) meta.appendChild(chip(w.root));
    if(w.pattern) meta.appendChild(chip(w.pattern));
    main.appendChild(meta);

    card.appendChild(main);

    // Bottom box (derived)
    const derivedBox = document.createElement('div');
    derivedBox.className = 'derived';

    (w.derived || []).forEach(d=>{
      const item = document.createElement('div');
      item.className = 'derived-item';

      const rowTop = document.createElement('div');
      rowTop.className = 'derived-row';

      const dAr = document.createElement('div');
      dAr.className = 'derived-ar';
      dAr.textContent = d.ar || '';

      const dBn = document.createElement('div');
      dBn.className = 'derived-bn';
      dBn.textContent = d.bn || '';

      rowTop.appendChild(dAr);
      rowTop.appendChild(dBn);

      const rowMeta = document.createElement('div');
      rowMeta.className = 'derived-meta';
      if(d.tr) rowMeta.appendChild(chip(d.tr));
      if(d.pattern) rowMeta.appendChild(chip(d.pattern));

      item.appendChild(rowTop);
      item.appendChild(rowMeta);

      derivedBox.appendChild(item);
    });

    card.appendChild(derivedBox);
    els.cards.appendChild(card);
  });

  els.scroller.hidden = false;
}

els.deckSelect.addEventListener('change', e=>{
  state.currentDeck = e.target.value;
  loadDeck();
});
els.reloadBtn.addEventListener('click', ()=> loadDeck() );

(async function init(){
  try{
    await loadManifest();
    await loadDeck();
  }catch(e){
    // already shown
  }
})();
