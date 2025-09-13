// ---------- Config ----------
const MANIFEST_URL = './manifest.json';     // root
const WORD_STRIP_SELECTOR = '#wordRow';

// ---------- State ----------
let manifest = [];
let currentDeck = null;          // selected surah manifest entry
let surahData = null;            // object { surah, name_ar, name_bn, verses: [...] }
let currentAyahIndex = 0;

// ---------- Boot ----------
document.addEventListener('DOMContentLoaded', async () => {
  await loadManifest();
  await initSurahSelect();
  bindUI();
  await loadSelectedSurah();
});

// ---------- Loaders ----------
async function loadManifest(){
  try{
    const res = await fetch(MANIFEST_URL, { cache:'no-store' });
    if(!res.ok) throw new Error('Manifest fetch failed');
    manifest = await res.json();
  }catch(err){
    console.error(err);
    alert('Could not load manifest. Check file path & hosting.');
  }
}

async function initSurahSelect(){
  const sel = document.getElementById('surahSelect');
  sel.innerHTML = '';

  manifest.forEach((m,i)=>{
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = m.name;
    sel.appendChild(opt);
  });

  sel.addEventListener('change', async (e)=>{
    currentDeck = manifest[parseInt(e.target.value,10)];
    currentAyahIndex = 0;
    await loadSelectedSurah();
  });

  // default to first deck
  if(manifest.length){
    sel.value = 0;
    currentDeck = manifest[0];
  }
}

async function loadSelectedSurah(){
  if(!currentDeck) return;
  try{
    const res = await fetch(currentDeck.json, { cache:'no-store' });
    if(!res.ok) throw new Error('JSON fetch failed');
    surahData = await res.json();
    renderAyah(currentAyahIndex);
  }catch(err){
    console.error(err);
    alert('Could not load surah JSON. Check "json" path in manifest.');
  }
}

// ---------- UI Bindings ----------
function bindUI(){
  document.getElementById('dirToggle').addEventListener('click', ()=>{
    const isRTL = document.body.classList.toggle('rtl');
    document.getElementById('dirToggle').textContent = isRTL ? 'RTL' : 'LTR';
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    positionWordStripForDirection();
  });

  document.getElementById('btnNext').addEventListener('click', ()=> scrollByStep('next'));
  document.getElementById('btnPrev').addEventListener('click', ()=> scrollByStep('prev'));

  // Expand/collapse Derived (event delegation on the strip)
  document.querySelector(WORD_STRIP_SELECTOR).addEventListener('click', (e)=>{
    const btn = e.target.closest('.derived-toggle');
    if(!btn) return;

    const panel = btn.closest('.word-card').querySelector('.derived-grid');
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    btn.querySelector('.plus').textContent = expanded ? '+' : '−';

    if(expanded){
      panel.hidden = true;
    }else{
      panel.hidden = false;
    }
  });
}

// ---------- Render ----------
function renderAyah(idx){
  if(!surahData || !surahData.verses || !surahData.verses[idx]) return;

  const ay = surahData.verses[idx];

  // Surah header
  document.getElementById('ayahChip').textContent = 'Ayah ' + (idx+1);
  document.getElementById('surahTitleAr').textContent = surahData.name_ar || 'سورة';
  document.getElementById('surahTitleBn').textContent = surahData.name_bn || '';
  document.getElementById('ayahArabic').textContent = ay.arabic || '';
  document.getElementById('ayahBangla').textContent = ay.bangla || '';

  // Word strip
  const row = document.querySelector(WORD_STRIP_SELECTOR);
  row.innerHTML = (ay.words || []).map(renderWordCard).join('');

  // after cards in DOM, adjust scroll start for direction
  positionWordStripForDirection();
}

function renderWordCard(w){
  const derivedTiles = (w.derived && w.derived.length)
    ? w.derived.slice(0,4).map(d => `
        <div class="derived-tile">
          <p class="derived-ar" lang="ar" dir="rtl">${d.ar || '—'}</p>
          <div class="derived-meta">
            <span>${escapeHtml(d.bn || '—')}</span>
            <span>${d.tr ? escapeHtml(d.tr) : ''}</span>
            <span>${d.pattern ? escapeHtml(d.pattern) : ''}</span>
          </div>
        </div>
      `).join('')
    : `<div class="derived-tile"><p class="derived-ar" lang="ar" dir="rtl">—</p></div>`;

  const chips = [
    w.tr ? `<span class="chip">${escapeHtml(w.tr)}</span>` : '',
    w.root ? `<span class="chip">${escapeHtml(w.root)}</span>` : '',
    w.pattern ? `<span class="chip">${escapeHtml(w.pattern)}</span>` : ''
  ].join('');

  return `
    <article class="word-card">
      <div class="card-head">MAIN</div>
      <h3 class="word-ar" lang="ar" dir="rtl">${w.ar || ''}</h3>
      <p class="word-bn">${escapeHtml(w.bn || '')}</p>
      <div class="chips">${chips}</div>

      <div class="derived-row">
        <span class="derived-label">DERIVED</span>
        <button class="derived-toggle" type="button" aria-expanded="false">
          Derived <span class="plus">+</span>
        </button>
      </div>

      <div class="derived-grid" hidden>
        ${derivedTiles}
      </div>
    </article>
  `;
}

// ---------- Helpers ----------
function escapeHtml(s){
  return String(s || '').replace(/[&<>"']/g, m =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])
  );
}

function positionWordStripForDirection(){
  const strip = document.querySelector(WORD_STRIP_SELECTOR);
  if(!strip) return;
  requestAnimationFrame(()=>{
    if(document.body.classList.contains('rtl')){
      strip.scrollLeft = strip.scrollWidth;
    }else{
      strip.scrollLeft = 0;
    }
  });
}

function scrollByStep(which){
  const strip = document.querySelector(WORD_STRIP_SELECTOR);
  if(!strip) return;
  const step = Math.round(strip.clientWidth * 0.85);
  const isRTL = document.body.classList.contains('rtl');

  let delta;
  if(which === 'next'){
    delta = isRTL ? -step : step;
  }else{
    delta = isRTL ? step : -step;
  }
  strip.scrollBy({ left: delta, behavior:'smooth' });
}
