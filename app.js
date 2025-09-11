const state = {
  manifest: null,
  currentDeck: null,
  data: null
};

const els = {
  deckSelect: document.getElementById('deckSelect'),
  reloadBtn: document.getElementById('reloadBtn'),
  alert: document.getElementById('alert'),
  versesContainer: document.getElementById('versesContainer')
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
    showAlert(`Failed to load manifest.json — ${err.message}`);
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

    renderAllVerses(state.data.verses);
  }catch(err){
    showAlert(`Failed to load ${deck.json} — ${err.message}`);
    console.error(err);
  }
}

function renderAllVerses(verses){
  els.versesContainer.innerHTML = '';
  if(!verses || !Array.isArray(verses)){ 
    showAlert('No verses found in the data.');
    return; 
  }

  verses.forEach(verse => {
    const verseSection = document.createElement('div');
    verseSection.className = 'verse-section';
    
    // Create ayah header (verse + translation)
    const ayahHeader = document.createElement('section');
    ayahHeader.className = 'ayah-header';
    
    const ayahNumber = document.createElement('div');
    ayahNumber.className = 'ayah-number';
    ayahNumber.textContent = `آیت ${verse.ayah_id || ''}`;
    ayahHeader.appendChild(ayahNumber);
    
    const ayahArabic = document.createElement('div');
    ayahArabic.className = 'ayah-ar';
    ayahArabic.textContent = verse.arabic || '';
    ayahHeader.appendChild(ayahArabic);
    
    const ayahBangla = document.createElement('div');
    ayahBangla.className = 'ayah-bn';
    ayahBangla.textContent = verse.bangla || '';
    ayahHeader.appendChild(ayahBangla);
    
    // Create word cards scroller
    const cardsScroller = document.createElement('section');
    cardsScroller.className = 'cards-scroller';
    
    const cards = document.createElement('div');
    cards.className = 'cards';
    
    renderWordsIntoContainer(verse.words || [], cards);
    
    cardsScroller.appendChild(cards);
    
    // Add to verse section
    verseSection.appendChild(ayahHeader);
    verseSection.appendChild(cardsScroller);
    
    // Add to main container
    els.versesContainer.appendChild(verseSection);
  });
}

function chip(text){
  const span = document.createElement('span');
  span.className = 'chip';
  span.textContent = text;
  return span;
}

function renderWordsIntoContainer(words, container){
  container.innerHTML = '';
  if(!Array.isArray(words)) return;

  words.forEach(w=>{
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
    container.appendChild(card);
  });
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
