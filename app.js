// ===== manifest must be at repo root: /manifest.json =====
// Example manifest entry:
// [{ "id":"mulk-full","name":"Al-Mulk (67) — Full","json":"data/mulk_full.json","mode":"full" }]

const els = {
  select: document.getElementById('surahSelect'),
  content: document.getElementById('content'),
  verseTpl: document.getElementById('verse-tpl'),
  wordTpl: document.getElementById('word-card-tpl'),
  derTpl: document.getElementById('derived-item-tpl')
};

init();

async function init(){
  try{
    const manifest = await fetchJSON('manifest.json');   // ROOT
    if(!Array.isArray(manifest) || manifest.length === 0){
      throw new Error('Manifest empty or invalid');
    }
    // Populate dropdown
    els.select.innerHTML = manifest.map(m => `<option value="${m.json}">${escapeHtml(m.name)}</option>`).join('');
    els.select.addEventListener('change', onChangeSurah);

    // Load first by default
    await loadSurah(manifest[0].json);
  }catch(err){
    console.error(err);
    els.content.innerHTML = `<div class="verse"><div class="verse-header"><p class="ayah-bn">Could not load manifest. Check file path & hosting.</p></div></div>`;
  }
}

async function onChangeSurah(e){
  const file = e.target.value;
  await loadSurah(file);
}

async function loadSurah(jsonPath){
  try{
    const data = await fetchJSON(jsonPath);

    // Basic shape: { name_ar, name_bn, verses: [ {ayah_id, arabic, bangla, words: [ {ar,bn,tr,root,pattern,derived[]} ]} ] }
    els.content.innerHTML = '';
    if(!data || !Array.isArray(data.verses)){
      throw new Error('Invalid surah JSON');
    }
    // Render each verse
    data.verses.forEach(v => renderVerse(v));
  }catch(err){
    console.error(err);
    els.content.innerHTML = `<div class="verse"><div class="verse-header"><p class="ayah-bn">Error loading surah JSON: ${escapeHtml(err.message)}</p></div></div>`;
  }
}

function renderVerse(verse){
  const node = els.verseTpl.content.cloneNode(true);
  const badge = node.querySelector('.ayah-number-badge');
  const ar = node.querySelector('.ayah-ar');
  const bn = node.querySelector('.ayah-bn');
  const rail = node.querySelector('.word-rail');

  // Parse ayah number from "67:12" etc.
  const ayahNum = parseAyahNumber(verse.ayah_id);
  badge.textContent = `আয়াত ${ayahNum}`;

  ar.textContent = verse.arabic || '';
  bn.textContent = verse.bangla || '';

  // Build word cards
  (verse.words || []).forEach(w => rail.appendChild(buildWordCard(w)));

  els.content.appendChild(node);
}

function buildWordCard(word){
  const node = els.wordTpl.content.cloneNode(true);
  const wAr = node.querySelector('.w-ar');
  const wBn = node.querySelector('.w-bn');
  const wTr = node.querySelector('.w-tr');
  const chipRoot = node.querySelector('.chip-root');
  const chipPat = node.querySelector('.chip-pattern');
  const derivedWrap = node.querySelector('.derived');
  const derivedList = node.querySelector('.derived-list');

  // Main block
  wAr.textContent = word.ar || '';
  wBn.textContent = word.bn || '';
  wTr.textContent = word.tr || '';

  // Chips
  chipRoot.textContent = word.root ? word.root : '—';
  chipPat.textContent = word.pattern ? word.pattern : '—';

  // Derived
  const derived = Array.isArray(word.derived) ? word.derived : [];
  derivedList.innerHTML = '';
  if(derived.length === 0){
    // Keep the block for alignment, but show a subtle placeholder
    const d = els.derTpl.content.cloneNode(true);
    d.querySelector('.d-ar').textContent = '—';
    d.querySelector('.d-bn').textContent = '—';
    d.querySelector('.d-tr').textContent = '';
    d.querySelector('.chip-pattern').textContent = '—';
    derivedList.appendChild(d);
  }else{
    derived.forEach(item => {
      const d = els.derTpl.content.cloneNode(true);
      d.querySelector('.d-ar').textContent = item.ar || '';
      d.querySelector('.d-bn').textContent = item.bn || '';
      d.querySelector('.d-tr').textContent = item.tr || '';
      d.querySelector('.chip-pattern').textContent = item.pattern || '—';
      derivedList.appendChild(d);
    });
  }

  return node;
}

/* ===== helpers ===== */
async function fetchJSON(path){
  const res = await fetch(path, { cache: 'no-store' });
  if(!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
  return await res.json();
}

function parseAyahNumber(ayah_id){
  // expects "67:1" or "67:01"
  if(!ayah_id || typeof ayah_id !== 'string') return '';
  const parts = ayah_id.split(':');
  return parts[1] ? String(parseInt(parts[1], 10)) : '';
}

function escapeHtml(s){
  return String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');
}
