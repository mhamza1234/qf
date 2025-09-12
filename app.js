/* ========= Qur’an Word Explorer =========
   - Loads data/manifest.json (list of decks)
   - Renders selected deck: Arabic ayah + Bangla below
   - Each ayah has a horizontally scrollable row of compact word-cards
   - Card top row: [Arabic word]  [Bangla meaning chip]
   - Below: compact chips (translit • root • pattern)
   - Derived section: one row per related item:
       (Arabic)  (Bangla)  [translit chip] [pattern chip]
   - No visible labels; a11y labels are screen-reader only.
*/

const els = {
  app: document.getElementById('app'),
  deck: document.getElementById('deck'),
  reloadBtn: document.getElementById('reloadBtn'),
};

let manifest = [];
let currentDeck = null;

// ---------- init ----------
document.addEventListener('DOMContentLoaded', async () => {
  await loadManifest();
  await loadInitialDeck();
  els.deck.addEventListener('change', handleChangeDeck);
  els.reloadBtn.addEventListener('click', () => currentDeck && renderDeck(currentDeck));
});

async function loadManifest(){
  const res = await fetch('data/manifest.json', {cache:'no-store'});
  if(!res.ok) throw new Error('manifest.json not found');
  manifest = await res.json();

  // fill dropdown
  els.deck.innerHTML = '';
  manifest.forEach((m,i) => {
    const op = document.createElement('option');
    op.value = m.id;
    op.textContent = m.name;
    els.deck.appendChild(op);
  });
}

async function loadInitialDeck(){
  const first = manifest[0];
  if(!first) return;
  await loadDeckById(first.id);
}

async function handleChangeDeck(){
  await loadDeckById(els.deck.value);
}

async function loadDeckById(id){
  const meta = manifest.find(m => m.id === id);
  if(!meta) return;

  const res = await fetch(meta.json, {cache:'no-store'});
  if(!res.ok) throw new Error(`JSON not found: ${meta.json}`);
  const data = await res.json();
  currentDeck = {meta, data};
  renderDeck(currentDeck);
}

// ---------- render ----------
function renderDeck({meta, data}){
  const parts = [];

  data.verses.forEach(v => {
    parts.push(renderVerse(v));
  });

  els.app.innerHTML = parts.join('');
  // set select to current
  els.deck.value = meta.id;
}

function renderVerse(v){
  // header: Arabic ayah + Bangla ayah
  const ar = escapeHtml(v.arabic);
  const bn = escapeHtml(v.bangla);

  // word cards row
  const cards = (v.words || []).map(renderWordCard).join('');

  return `
    <article class="verse" data-ayah-id="${escapeAttr(v.ayah_id || '')}">
      <p class="ayah-ar" lang="ar" dir="rtl">${ar}</p>
      <p class="ayah-bn" lang="bn" dir="ltr">${bn}</p>

      <div class="word-strip" role="list" aria-label="শব্দসমূহ">
        ${cards}
      </div>
    </article>
  `;
}

function renderWordCard(w){
  // Top row: Arabic word on left (rtl) + Bangla chip on right
  const ar = spanAr(w.ar);
  const bn = `<span class="meaning" lang="bn">${escapeHtml(w.bn || '')}</span>`;

  // Middle line as compact chips (no visible labels)
  const chipTr = w.tr ? chip(w.tr) : '';
  const chipRoot = w.root ? chip(w.root) : '';
  const chipPattern = w.pattern ? chip(w.pattern) : '';

  // Derived block (each row compact)
  const derived = Array.isArray(w.derived) && w.derived.length
    ? `
      <div class="derived" role="list">
        ${w.derived.map(d => `
          <div class="der-item" role="listitem">
            <div class="der-row-top">
              <span class="der-ar" lang="ar" dir="rtl">${escapeHtml(d.ar || '')}</span>
              <span class="der-mean" lang="bn">${escapeHtml(d.bn || '')}</span>
            </div>
            <div class="der-chips">
              ${d.tr ? chip(d.tr) : ''}${d.pattern ? chip(d.pattern) : ''}
            </div>
          </div>`).join('')}
      </div>`
    : '';

  // a11y: allow keyboard users to focus the card and read contents
  return `
    <section class="word-card" tabindex="0" role="group" aria-label="${escapeAttr((w.ar||'') + ' — ' + (w.bn||''))}">
      <div class="card-head">
        <div class="arabic" lang="ar" dir="rtl">${ar}</div>
        ${bn}
      </div>
      <div class="meta">
        ${chipTr}${chipRoot}${chipPattern}
      </div>
      ${derived}
    </section>
  `;
}

// ---------- helpers ----------
function chip(text){ return `<span class="chip">${escapeHtml(text)}</span>`; }
function spanAr(s){ return `<span lang="ar" dir="rtl">${escapeHtml(s || '')}</span>`; }
function escapeHtml(s){ return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function escapeAttr(s){ return escapeHtml(s).replace(/"/g,'&quot;'); }
