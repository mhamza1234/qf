const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const els = {
  deckSelect: $('#deckSelect'),
  reloadBtn: $('#reloadBtn'),
  errorBox: $('#errorBox'),
  content: $('#content'),
  verseTpl: $('#verseTpl'),
  wordTpl: $('#wordTpl')
};

let manifest = [];
let currentDeck = null;

async function fetchJSON(url){
  const res = await fetch(url, {cache: 'no-store'});
  if(!res.ok) throw new Error(`HTTP ${res.status} loading ${url}`);
  return res.json();
}

function showError(msg){
  els.errorBox.textContent = msg;
  els.errorBox.classList.remove('hidden');
}
function clearError(){ els.errorBox.classList.add('hidden'); }

async function loadManifest(){
  clearError();
  try{
    manifest = await fetchJSON('data/manifest.json');
    if(!Array.isArray(manifest)) throw new Error('manifest.json must be an array');
    els.deckSelect.innerHTML = manifest
      .map(d => `<option value="${d.id}">${d.title}</option>`)
      .join('');
    // pick first deck by default
    currentDeck = manifest[0]?.id || null;
    if(currentDeck) els.deckSelect.value = currentDeck;
  }catch(err){
    showError(err.message);
  }
}

function getDeckById(id){ return manifest.find(d => d.id === id); }

async function renderDeck(id){
  const deck = getDeckById(id);
  if(!deck){ showError('Deck not found in manifest.'); return; }
  clearError();
  els.content.innerHTML = '';

  let data;
  try{
    data = await fetchJSON(deck.src);
  }catch(err){
    showError(err.message);
    return;
  }

  // Data format (simple): { name_bn, name_ar, verses:[ { verse_number, verse_arabic, words:[{arabic, meaning, root, root_meaning, form, related_words:[{arabic, meaning}]} ] } ] }
  const verses = (data?.verses) || [];

  verses.forEach(v => {
    const vNode = els.verseTpl.content.cloneNode(true);
    $('.ayah-title', vNode).textContent = `আয়াত ${v.verse_number}`;
    $('.ayah-ar', vNode).textContent = v.verse_arabic || '';

    const wordsWrap = $('.words', vNode);

    (v.words || []).forEach(w => {
      const wNode = els.wordTpl.content.cloneNode(true);
      $('.word-ar', wNode).textContent = w.arabic || '';
      $('.word-bn', wNode).textContent = w.meaning || '';

      $('.root', wNode).textContent = w.root || '—';
      $('.rootMeaning', wNode).textContent = w.root_meaning || '—';
      $('.form', wNode).textContent = w.form || '—';

      const relatedBox = $('.related', wNode);
      const rel = w.related_words || [];
      if(rel.length){
        relatedBox.innerHTML = `
          <h4>Related / Derivations</h4>
          <ul>
            ${rel.map(r => `<li><span class="ar">${r.arabic}</span> — ${r.meaning || ''}</li>`).join('')}
          </ul>
        `;
      }else{
        relatedBox.innerHTML = '';
      }
      wordsWrap.appendChild(wNode);
    });

    els.content.appendChild(vNode);
  });
}

els.deckSelect.addEventListener('change', async (e) => {
  currentDeck = e.target.value;
  await renderDeck(currentDeck);
});
els.reloadBtn.addEventListener('click', async () => {
  if(currentDeck) await renderDeck(currentDeck);
});

(async function init(){
  await loadManifest();
  if(currentDeck) await renderDeck(currentDeck);
})();
