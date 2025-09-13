// --- Minimal loader + state ---
const state = {
  dir: 'ltr',           // 'ltr' | 'rtl'
  manifest: null,       // loaded manifest
  current: null         // loaded surah data
};

// Utility
const $ = (q,root=document)=>root.querySelector(q);
const $$ = (q,root=document)=>Array.from(root.querySelectorAll(q));
const debounce = (fn,ms=150)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}};

// Init
document.addEventListener('DOMContentLoaded', async ()=>{
  // direction toggle
  $('#dirBtn').addEventListener('click', ()=>{
    state.dir = state.dir === 'ltr' ? 'rtl' : 'ltr';
    document.body.classList.toggle('rtl', state.dir==='rtl');
    document.body.classList.toggle('ltr', state.dir==='ltr');
    $('#dirBtn').textContent = state.dir.toUpperCase();
    // re-render current ayah with correct word order
    if(state.current) renderAyah(state.current.verses[0]);
  });

  // load manifest
  try{
    const m = await fetch('manifest.json').then(r=>r.json());
    state.manifest = m;
    const sel = $('#surahPicker');
    m.forEach(item=>{
      const opt = document.createElement('option');
      opt.value = item.json;
      opt.textContent = item.name;
      sel.appendChild(opt);
    });
    // default pick first
    await loadSurah(sel.value);
    sel.addEventListener('change', ()=>loadSurah(sel.value));
  }catch(e){
    console.error('Manifest error', e);
    alert('Could not load manifest. Check file path & hosting.');
  }
});

async function loadSurah(path){
  const data = await fetch(path).then(r=>r.json());
  state.current = data;

  $('#surahTitleAr').textContent = data.name_ar || 'سورة';
  $('#surahTitleBn').textContent = data.name_bn || '';

  // Render first ayah (keep your own ayah navigation if you have it)
  renderAyah(data.verses[0]);
}

// --- Rendering ---
function renderAyah(ayah){
  // Ayah number and lit
  const ayahNo = ayah.ayah_id.split(':')[1];
  $('#ayahNumber').textContent = `Ayah ${ayahNo}`;
  $('#ayahArabic').textContent = ayah.arabic;
  $('#ayahBangla').textContent = ayah.bangla;

  const row = $('#cardsRow');

  // ✅ Word-level RTL: reverse order when RTL
  const isRTL = document.body.classList.contains('rtl');
  const words = isRTL ? [...ayah.words].reverse() : ayah.words;

  row.innerHTML = words.map(buildCard).join('');

  // Wire the derived toggles
  $$('.derived-toggle', row).forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const wrap = btn.nextElementSibling;
      const open = wrap.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true':'false');
      btn.querySelector('.plus').textContent = open ? '–' : '+';
      // simple auto-max-height for transition
      if(open){
        // estimate height
        wrap.style.maxHeight = wrap.scrollHeight + 'px';
      }else{
        wrap.style.maxHeight = '0px';
      }
    });
  });

  alignToStart();
  $('#prevBtn').onclick = ()=> scrollOne(-1);
  $('#nextBtn').onclick = ()=> scrollOne(1);
  updateNavButtons();
  row.addEventListener('scroll', debounce(updateNavButtons, 80));
}

function buildCard(w){
  const chips = [
    w.tr ? `<span class="chip-pill">${escapeHtml(w.tr)}</span>` : '',
    w.root ? `<span class="chip-pill badge-ar">${escapeHtml(w.root)}</span>` : '',
    w.pattern ? `<span class="chip-pill badge-ar">${escapeHtml(w.pattern)}</span>` : ''
  ].join('');

  // Derived (up to 4, 2×2)
  const derived = (w.derived && w.derived.length)
    ? w.derived.slice(0,4).map(d=>`
        <div class="der">
          <div class="ar">${escapeHtml(d.ar||'')}</div>
          <div class="bn">${escapeHtml(d.bn||'')}</div>
          ${d.pattern?`<div class="pat badge-ar">${escapeHtml(d.pattern)}</div>`:''}
        </div>
      `).join('')
    : `<div class="der"><div class="bn">—</div></div>`;

  return `
    <article class="card">
      <div class="label">MAIN</div>
      <div class="main-txt">${escapeHtml(w.ar||'')}</div>
      ${w.bn ? `<div class="bn">${escapeHtml(w.bn)}</div>` : ''}

      <div class="row-chips">${chips}</div>

      <div class="derived-header">
        <span class="label">DERIVED</span>
        <button class="toggle derived-toggle" aria-expanded="false">
          <span>Derived</span>
          <span class="plus">+</span>
        </button>
      </div>

      <div class="derived-wrap" aria-hidden="true">
        <div class="der-grid">
          ${derived}
        </div>
      </div>
    </article>
  `;
}

// --- Carousel helpers ---
function alignToStart(){
  const isRTL = document.body.classList.contains('rtl');
  const row = $('#cardsRow');
  // jump to right edge in RTL (so first word is visible)
  if(isRTL){
    row.scrollLeft = row.scrollWidth;
  }else{
    row.scrollLeft = 0;
  }
}

function scrollOne(dir){
  const row = $('#cardsRow');
  const step = row.clientWidth * 0.9;

  const isRTL = document.body.classList.contains('rtl');
  // For RTL we invert the sign so clicking "next" still moves to the next logical word.
  const delta = isRTL ? -dir * step : dir * step;

  row.scrollBy({left: delta, behavior:'smooth'});
}

function updateNavButtons(){
  const row = $('#cardsRow');
  const atStart = Math.abs(row.scrollLeft) < 6;
  const atEnd = Math.abs(row.scrollWidth - row.clientWidth - row.scrollLeft) < 6;

  // In RTL we start at right edge (which is "end" in scroll metrics)
  const isRTL = document.body.classList.contains('rtl');
  if(isRTL){
    $('#prevBtn').disabled = atEnd;
    $('#nextBtn').disabled = atStart;
  }else{
    $('#prevBtn').disabled = atStart;
    $('#nextBtn').disabled = atEnd;
  }
}

function escapeHtml(s){return (s??'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]))}
