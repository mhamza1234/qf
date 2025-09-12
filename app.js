/* Qur’an Word Explorer – data-driven UI */

// ===== Utilities =====
const $ = sel => document.querySelector(sel);
const statusEl = $('#status');
const mount = $('#surahMount');
const selectEl = $('#surahSelect');

function setStatus(msg) {
  statusEl.textContent = msg || '';
}

function showError(msg) {
  statusEl.textContent = msg;
  statusEl.style.color = '#b42318';
}

function ayahNumFromId(ayah_id) {
  const parts = String(ayah_id).split(':');
  return parts.length > 1 ? parts[1] : ayah_id;
}

function surahNumFromFirstAyah(verses=[]) {
  if (!verses.length) return '';
  const id = String(verses[0].ayah_id || '');
  const p = id.split(':');
  return p.length > 1 ? p[0] : '';
}

// ===== Manifest load =====
async function loadManifest() {
  setStatus('Loading manifest…');
  const res = await fetch('./manifest.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const manifest = await res.json();
  if (!Array.isArray(manifest) || manifest.length === 0) {
    throw new Error('Manifest is empty or not an array.');
  }
  return manifest;
}

function populateSurahSelect(manifest) {
  selectEl.innerHTML = '';
  manifest.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.json; // URL to the JSON file
    opt.textContent = item.name || item.id;
    opt.dataset.mode = item.mode || 'full';
    selectEl.appendChild(opt);
  });
}

async function loadSelectedSurah() {
  const url = selectEl.value;
  if (!url) return;
  setStatus('Loading surah…');
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderSurah(data);
    setStatus('');
  } catch (e) {
    showError(`Could not load surah: ${e.message}`);
    mount.innerHTML = '';
  }
}

// ===== Rendering =====
function renderSurah(data) {
  // data shape:
  // { name_ar, name_bn, verses: [ { ayah_id, arabic, bangla, words:[{ar,bn,tr,root,pattern,derived:[]}, ...] } ] }
  if (!data || !Array.isArray(data.verses)) {
    mount.innerHTML = '';
    showError('Invalid surah JSON.');
    return;
  }

  const surahNum = surahNumFromFirstAyah(data.verses) || (data.surah || '');

  const html = data.verses.map(ayah => {
    const ayahNo = ayahNumFromId(ayah.ayah_id);
    const cards = (ayah.words || []).map(renderWordCard).join('');
    return `
      <section class="ayah-block" data-ayah="${ayah.ayah_id}">
        <header class="ayah-header">
          <div class="ayah-number">(${surahNum}:${ayahNo})</div>
          <p class="ayah-ar" lang="ar" dir="rtl">${ayah.arabic || ''}</p>
          <p class="ayah-bn" lang="bn" dir="ltr">${ayah.bangla || ''}</p>
        </header>
        <div class="word-carousel">
          ${cards}
        </div>
      </section>
    `;
  }).join('');

  mount.innerHTML = html;
}

function renderWordCard(word) {
  const derivedRows = (word.derived || []).map(d => `
    <div class="derived-row">
      <span class="drv-ar" lang="ar" dir="rtl">${d.ar}</span>
      <span class="drv-tr">${d.tr || ''}</span>
      <span class="drv-bn" lang="bn">${d.bn || ''}</span>
      <span class="chip chip-pattern">${d.pattern || ''}</span>
    </div>
  `).join('');

  return `
    <article class="word-card">
      <div class="main-word">
        <div class="main-ar" lang="ar" dir="rtl">${word.ar || ''}</div>
        <div class="main-bn" lang="bn">${word.bn || ''}</div>
        <div class="meta">
          ${word.tr ? `<span class="meta-tr">${word.tr}</span>` : ''}
          ${word.root ? `<span class="chip chip-root">${word.root}</span>` : ''}
          ${word.pattern ? `<span class="chip chip-pattern">${word.pattern}</span>` : ''}
        </div>
      </div>
      ${derivedRows ? `<div class="divider"></div><div class="derived">${derivedRows}</div>` : ''}
    </article>
  `;
}

// ===== Boot =====
(async function boot(){
  try {
    const manifest = await loadManifest();
    populateSurahSelect(manifest);
    selectEl.addEventListener('change', loadSelectedSurah);
    await loadSelectedSurah();
  } catch (e) {
    showError(`Could not load manifest. Check file path & hosting. (${e.message})`);
  }
})();
