// ------------------------------
// Config
// ------------------------------
const MANIFEST_URL = 'manifest.json'; // manifest at site root

// ------------------------------
// Boot
// ------------------------------
(async function boot() {
  const status = setStatus();
  try {
    const manifest = await loadManifest();

    validateManifest(manifest);

    // Populate deck dropdown
    const select = document.getElementById('deckSelect');
    select.innerHTML = manifest.map(d => `<option value="${d.json}">${d.name}</option>`).join('');

    select.addEventListener('change', async e => {
      await loadAndRenderDeck(e.target.value, status);
    });

    // Load first deck by default
    await loadAndRenderDeck(manifest[0].json, status);
  } catch (err) {
    console.error(err);
    status.textContent = `Error: ${err.message}`;
    status.classList.add('error');
  }
})();

// ------------------------------
// Data Loaders
// ------------------------------
async function loadManifest() {
  const url = `${MANIFEST_URL}?v=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load manifest (${res.status})`);
  return res.json();
}

async function loadDeck(path) {
  const url = `${path}?v=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load deck JSON (${res.status}): ${path}`);
  return res.json();
}

// ------------------------------
// Renderers
// ------------------------------
async function loadAndRenderDeck(deckPath, statusEl) {
  try {
    statusEl.textContent = 'Loading…';
    const deck = await loadDeck(deckPath);
    statusEl.textContent = '';

    renderSurahHeader(deck);
    renderVerses(deck);
  } catch (e) {
    console.error(e);
    statusEl.textContent = `Error: ${e.message}`;
    statusEl.classList.add('error');
  }
}

function renderSurahHeader(deck) {
  const el = document.getElementById('surahHeader');
  const nameAr = deck.name_ar || '';
  const nameBn = deck.name_bn || '';

  el.innerHTML = `
    <h2 class="surah-title-ar" lang="ar" dir="rtl">${escapeHtml(nameAr)}</h2>
    <p class="surah-title-bn" lang="bn" dir="ltr">${escapeHtml(nameBn)}</p>
  `;
}

function renderVerses(deck) {
  const mount = document.getElementById('verses');
  const verses = Array.isArray(deck.verses) ? deck.verses : [];

  mount.innerHTML = verses.map(v => renderVerseBlock(v)).join('');
}

function renderVerseBlock(v) {
  const ayahNum = extractAyahNumber(v.ayah_id);
  const arabic = v.arabic || '';
  const bangla = v.bangla || '';
  const words = Array.isArray(v.words) ? v.words : [];

  const cards = words.map(w => renderWordCard(w)).join('');

  return `
    <article class="verse" data-ayah="${ayahNum}">
      <div class="verse-head">
        <div class="ayah-meta">
          <span class="badge">Ayah ${ayahNum}</span>
        </div>
        <p class="ayah-ar" lang="ar" dir="rtl">${escapeHtml(arabic)}</p>
        <p class="ayah-bn" lang="bn" dir="ltr">${escapeHtml(bangla)}</p>
      </div>
      <div class="word-row">
        <div class="scroller">
          ${cards}
        </div>
      </div>
    </article>
  `;
}

function renderWordCard(w) {
  // Main word
  const ar = w.ar || '';
  const bn = w.bn || '';
  const tr = w.tr || '';
  const root = w.root || '';
  const pattern = w.pattern || '';

  // Derived words (array of {ar, bn, tr?, pattern?})
  const derived = Array.isArray(w.derived) ? w.derived : [];

  const derivedHtml = derived.map(d => `
    <div class="der-item">
      <div class="der-top">
        <p class="der-ar" lang="ar" dir="rtl">${escapeHtml(d.ar || '')}</p>
        <p class="der-bn" lang="bn" dir="ltr">${escapeHtml(d.bn || '')}</p>
      </div>
      <div class="der-meta">
        ${d.tr ? `<span class="der-pill">${escapeHtml(d.tr)}</span>` : ''}
        ${d.pattern ? `<span class="der-pill">${escapeHtml(d.pattern)}</span>` : ''}
      </div>
    </div>
  `).join('');

  return `
    <div class="card">
      <div class="card-main">
        <p class="word-ar" lang="ar" dir="rtl">${escapeHtml(ar)}</p>
        <p class="word-bn" lang="bn" dir="ltr">${escapeHtml(bn)}</p>
        <div class="word-metadata">
          ${tr ? `<span class="meta-pill">${escapeHtml(tr)}</span>` : ''}
          ${root ? `<span class="meta-pill">${escapeHtml(root)}</span>` : ''}
          ${pattern ? `<span class="meta-pill">${escapeHtml(pattern)}</span>` : ''}
        </div>
      </div>
      ${derived.length ? `<div class="derived">${derivedHtml}</div>` : ''}
    </div>
  `;
}

// ------------------------------
// Helpers
// ------------------------------
function extractAyahNumber(ayahId) {
  // expects formats like "67:1", "67:10"
  if (!ayahId) return '';
  const parts = String(ayahId).split(':');
  return parts.length > 1 ? parts[1] : '';
}

function validateManifest(mf) {
  if (!Array.isArray(mf)) throw new Error('Manifest must be an array.');
  mf.forEach((d, i) => {
    if (!d || typeof d !== 'object') throw new Error(`Manifest item ${i} invalid.`);
    if (!d.json) throw new Error(`Manifest item ${i} missing "json" path.`);
    if (!d.name) throw new Error(`Manifest item ${i} missing "name".`);
  });
}

function setStatus(){
  const el = document.getElementById('status');
  el.classList.remove('error');
  el.textContent = '';
  return el;
}

function escapeHtml(s){
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');
}
