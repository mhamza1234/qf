// UI mirroring + rendering
const els = {
  surahSelect: document.getElementById('surahSelect'),
  surahArabic: document.getElementById('surahArabic'),
  surahBangla: document.getElementById('surahBangla'),
  verses: document.getElementById('verses'),
  dirToggle: document.getElementById('dirToggle'),
};

let manifest = [];
let allRoots = {};

init();

async function init(){
  // Restore UI direction preference (default: RTL since Arabic is primary)
  const savedDir = localStorage.getItem('uiDir');
  const rtl = savedDir ? savedDir === 'rtl' : true;
  applyUiDir(rtl);

  // Load manifest + roots
  try{
    manifest = await fetchJSON('./manifest.json');
  }catch(e){
    alert('Could not load manifest. Check file path & hosting.');
    throw e;
  }

  try{
    allRoots = await fetchJSON('./data/all_roots.json');
  }catch{
    allRoots = {};
  }

  // Populate dropdown
  els.surahSelect.innerHTML = manifest.map((m,i)=>
    `<option value="${i}">${m.name}</option>`).join('');

  // Load first
  if (manifest.length){
    els.surahSelect.value = '0';
    loadSurahByIndex(0);
  }

  els.surahSelect.addEventListener('change', e=>{
    loadSurahByIndex(Number(e.target.value));
    window.scrollTo({top:0, behavior:'smooth'});
  });

  els.dirToggle.addEventListener('click', ()=>{
    const nowRtl = !document.body.classList.contains('rtl');
    applyUiDir(nowRtl);
    localStorage.setItem('uiDir', nowRtl ? 'rtl' : 'ltr');
  });
}

function applyUiDir(isRtl){
  document.body.classList.toggle('rtl', isRtl);
  document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
  els.dirToggle.textContent = isRtl ? 'LTR' : 'RTL';
  els.dirToggle.setAttribute('aria-label', isRtl ? 'Switch to LTR interface' : 'Switch to RTL interface');
}

async function loadSurahByIndex(idx){
  const item = manifest[idx];
  if(!item) return;
  const data = await fetchJSON(item.json);
  renderSurah(data);
}

function renderSurah(data){
  els.surahArabic.textContent = data.name_ar || '—';
  els.surahBangla.textContent = data.name_bn || '';

  els.verses.innerHTML = (data.verses || []).map(v => renderVerse(v)).join('');
}

function renderVerse(v){
  const ayahNum = getAyahNumber(v.ayah_id);
  const cards = (v.words || []).map(w => renderWordCard(mergeDerived(w))).join('');

  return `
    <article class="verse" data-ayah-id="${v.ayah_id}">
      <div class="verse-head">
        <span class="ayah-tag">Ayah ${ayahNum}</span>
        <p class="ayah-line" lang="ar" dir="rtl">${v.arabic || ''}</p>
        <p class="ayah-bn" dir="ltr">${v.bangla || ''}</p>
      </div>
      <div class="words-rail" dir="rtl">
        ${cards}
      </div>
    </article>
  `;
}

function mergeDerived(w){
  const out = {...w};
  const given = Array.isArray(out.derived) ? out.derived.slice() : [];
  if (out.root && allRoots[out.root]){
    const seen = new Set(given.map(d=>d.ar));
    allRoots[out.root].forEach(arForm=>{
      if(!seen.has(arForm)){
        given.push({ ar: arForm, bn:'', tr:'', pattern:'' });
      }
    });
  }
  out.derived = given;
  return out;
}

function renderWordCard(w){
  const meta = [
    w.root ? `<span class="badge">${w.root}</span>` : '',
    w.pattern ? `<span class="badge">${w.pattern}</span>` : ''
  ].join('');

  const derived = (w.derived || []).map(d=>`
      <div class="derived-item">
        <p class="d-ar" lang="ar" dir="rtl">${escapeHTML(d.ar || '')}</p>
        ${d.bn ? `<p class="d-bn">${escapeHTML(d.bn)}</p>` : ''}
        ${d.tr ? `<p class="d-tr">${escapeHTML(d.tr)}</p>` : ''}
        ${d.pattern ? `<p class="d-pat">${escapeHTML(d.pattern)}</p>` : ''}
      </div>
  `).join('');

  return `
    <div class="word-card" dir="ltr">
      <div class="word-main">
        <p class="w-ar" lang="ar" dir="rtl">${escapeHTML(w.ar || '')}</p>
        ${w.bn ? `<p class="w-bn">${escapeHTML(w.bn)}</p>` : ''}
        ${w.tr ? `<p class="w-tr">${escapeHTML(w.tr)}</p>` : ''}
        ${meta ? `<div class="word-meta">${meta}</div>` : ''}
      </div>
      ${derived ? `<div class="derived">${derived}</div>` : ''}
    </div>
  `;
}

function getAyahNumber(ayahId){
  if(!ayahId) return '';
  const p = String(ayahId).split(':');
  return p[1] || '';
}

async function fetchJSON(url){
  const res = await fetch(url, {cache:'no-store'});
  if(!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

function escapeHTML(s){
  return String(s || '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
