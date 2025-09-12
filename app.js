/* Config */
const MANIFEST_URL = 'manifest.json';

/* DOM */
const $surahHeader = document.getElementById('surahHeader');
const $verses = document.getElementById('verses');
const $surahSelect = document.getElementById('surahSelect');

/* Bootstrap */
init();

async function init(){
  try{
    const manifest = await fetchJSON(MANIFEST_URL);
    populateSelect(manifest);

    // Auto-load first option
    if (manifest.length){
      await loadSurahById(manifest[0].id, manifest);
    }

    // Handle changes
    $surahSelect.addEventListener('change', async (e)=>{
      await loadSurahById(e.target.value, manifest);
      // scroll to top on change
      window.scrollTo({top:0, behavior:'smooth'});
    });

  }catch(err){
    console.error('Failed to initialize:', err);
    $surahHeader.innerHTML = renderError(
      'Could not load manifest. Check file path & hosting.'
    );
  }
}

/* Helpers */
async function fetchJSON(path){
  const url = `${path}?v=${Date.now()}`;
  const res = await fetch(url, {cache:'no-store'});
  if(!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
  return await res.json();
}

function populateSelect(manifest){
  $surahSelect.innerHTML = manifest.map(m =>
    `<option value="${escapeHtml(m.id)}">${escapeHtml(m.name)}</option>`
  ).join('');
}

async function loadSurahById(id, manifest){
  const entry = manifest.find(m => m.id === id);
  if(!entry){
    $surahHeader.innerHTML = renderError('Surah not found in manifest.');
    $verses.innerHTML = '';
    return;
  }

  try{
    const data = await fetchJSON(entry.json);
    renderSurahHeader(data, entry);
    renderVerses(data);
  }catch(err){
    console.error('Surah load error:', err);
    $surahHeader.innerHTML = renderError('Could not load surah data.');
    $verses.innerHTML = '';
  }
}

function renderSurahHeader(data, entry){
  const nameAr = data.name_ar || '—';
  const nameBn = entry.name || data.name_bn || '';
  $surahHeader.innerHTML = `
    <h2 class="surah-title-ar" lang="ar" dir="rtl">${escapeHtml(nameAr)}</h2>
    <p class="surah-title-en">${escapeHtml(nameBn)}</p>
  `;
}

function renderVerses(data){
  const verses = Array.isArray(data.verses) ? data.verses : [];
  $verses.innerHTML = verses.map(v => renderVerse(v)).join('');
}

function renderVerse(v){
  // Ayah number from ayah_id (e.g., "67:12" -> "12")
  let ayahNum = '';
  if (typeof v.ayah_id === 'string' && v.ayah_id.includes(':')){
    ayahNum = v.ayah_id.split(':')[1] || '';
  }

  const arabic = v.arabic || '';
  const bangla = v.bangla || '';

  // Word cards row
  const words = Array.isArray(v.words) ? v.words : [];
  const cards = words.map(w => renderWordCard(w)).join('');

  return `
    <article class="verse" data-ayah="${escapeAttr(v.ayah_id || '')}">
      <div class="ayah-badge">Ayah ${escapeHtml(ayahNum || '')}</div>
      <div class="ayah-ar" lang="ar" dir="rtl">${escapeHtml(arabic)}</div>
      <div class="ayah-bn" lang="bn" dir="ltr">${escapeHtml(bangla)}</div>

      <div class="word-row">
        ${cards}
      </div>
    </article>
  `;
}

/* Word card */
function renderWordCard(w){
  const ar = w.ar || '';
  const bn = w.bn || '';
  const tr = w.tr || '';
  const root = w.root || '';
  const pattern = w.pattern || '';

  // derived: [{ ar, bn, tr, pattern }]
  const derived = Array.isArray(w.derived) ? w.derived : [];

  const rootPill = root ? `<span class="meta-pill mono">${escapeHtml(root)}</span>` : '';
  const patternPill = pattern ? `<span class="meta-pill">${escapeHtml(pattern)}</span>` : '';

  const derivedHtml = derived.length
    ? `
      <div class="derived-wrap">
        <span class="badge-derived">Derived</span>
        ${derived.map(d => `
          <div class="derived-item">
            <div class="derived-ar" lang="ar" dir="rtl">${escapeHtml(d.ar || '')}</div>
            <div class="derived-bn" lang="bn">${escapeHtml(d.bn || '')}</div>
            ${d.tr ? `<div class="derived-tr">${escapeHtml(d.tr)}</div>` : ''}
            ${d.pattern ? `<div class="derived-pattern">${escapeHtml(d.pattern)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `
    : `
      <div class="derived-wrap">
        <span class="badge-derived">Derived</span>
        <div class="derived-item">
          <div class="derived-bn" style="color:var(--text-muted)">—</div>
        </div>
      </div>
    `;

  return `
    <div class="word-card">
      <div class="word-main">
        <span class="badge-main">Main</span>
        <div class="word-ar" lang="ar" dir="rtl">${escapeHtml(ar)}</div>
        <div class="word-bn" lang="bn">${escapeHtml(bn)}</div>
        ${tr ? `<div class="word-tr">${escapeHtml(tr)}</div>` : ''}
        <div class="word-meta">
          ${rootPill}
          ${patternPill}
        </div>
      </div>

      ${derivedHtml}
    </div>
  `;
}

/* Utilities */
function escapeHtml(s){
  return String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');
}
function escapeAttr(s){ return escapeHtml(s).replaceAll('"','&quot;'); }
