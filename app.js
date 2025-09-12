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

    // populate dropdown
    els.deckSelect.innerHTML = '';
    state.manifest.forEach(d=>{
      const opt = document.createElement('option');
      opt.value = d.id; opt.textContent = d.name;
      els.deckSelect.appendChild(opt);
    });

    // pick first deck by default
    state.currentDeck = state.manifest[0]?.id || null;
    if (state.currentDeck) els.deckSelect.value = state.currentDeck;
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
    
    // Ayah header (Arabic + Bangla, centered)
    const ayahHeader = document.createElement('section');
    ayahHeader.className = 'ayah-header';
    
    const ayahNumber = document.createElement('div');
    ayahNumber.className = 'ayah-number';
    ayahNumber.textContent = `آية ${verse.ayah_id || ''}`;
    ayahHeader.appendChild(ayahNumber);
    
    const ayahArabic = document.createElement('div');
    ayahArabic.className = 'ayah-ar';
    ayahArabic.textContent = verse.arabic || '';
    ayahHeader.appendChild(ayahArabic);
    
    const ayahBangla = document.createElement('div');
    ayahBangla.className = 'ayah-bn';
    ayahBangla.textContent = verse.bangla || '';
    ayahHeader.appendChild(ayahBangla);
    
    // Word cards scroller
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

function line(cls, text){
  const div = document.createElement('div');
  div.className = cls;
  div.textContent = text || '';
  return div;
}

function renderWordsIntoContainer(words, container){
  container.innerHTML = '';
  if(!Array.isArray(words)) return;

  words.forEach(w=>{
    const card = document.createElement('div');
    card.className = 'card';

    // Top box (main word) — values only: ar, bn, root, pattern
    const main = document.createElement('div');
    main.className = 'main';

    main.appendChild(line('word-ar', w.ar || ''));
    main.appendChild(line('word-bn', w.bn || ''));
    if (w.root)   main.appendChild(line('word-line', w.root));
    if (w.pattern)main.appendChild(line('word-line', w.pattern));

    card.appendChild(main);

    // Bottom box (derived words list) — each item: word, meaning, pattern
    const derivedBox = document.createElement('div');
    derivedBox.className = 'derived';

    (w.derived || []).forEach(d=>{
      const item = document.createElement('div');
      item.className = 'derived-item';

      const rowTop = document.createElement('div');
      rowTop.className = 'derived-row';

      rowTop.appendChild(line('derived-ar', d.ar || ''));
      rowTop.appendChild(line('derived-bn', d.bn || ''));

      item.appendChild(rowTop);

      if (d.pattern){
        const meta = document.createElement('div');
        meta.className = 'derived-meta';
        meta.textContent = d.pattern;
        item.appendChild(meta);
      }

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
    // already reported
  }
})();
