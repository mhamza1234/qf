// ---- Load manifest and first surah ----
async function loadManifest(){
  const res = await fetch('manifest.json');
  if(!res.ok) throw new Error('Manifest not found');
  const manifest = await res.json();

  const sel = document.getElementById('surahSelect');
  sel.innerHTML = '';
  manifest.forEach(m=>{
    const opt = document.createElement('option');
    opt.value = m.json;
    opt.textContent = m.name;
    sel.appendChild(opt);
  });
  sel.onchange = ()=> loadSurah(sel.value);
  if(manifest.length) loadSurah(manifest[0].json);
}

async function loadSurah(path){
  const res = await fetch(path);
  const data = await res.json();
  renderSurah(data);
}

// ---- Render one surah (first ayah shown) ----
function renderSurah(data){
  document.getElementById('surahTitle').textContent = `سورة ${data.name_ar}`;
  document.getElementById('surahTitleBn').textContent = data.name_bn;

  const firstAyah = data.verses[0];
  renderAyah(firstAyah);
}

// ---- Build ayah header and word cards ----
function renderAyah(ayah){
  const ayahNo = ayah.ayah_id.split(':')[1];
  document.getElementById('ayahNumber').textContent = `Ayah ${ayahNo}`;
  document.getElementById('ayahArabic').textContent = ayah.arabic;
  document.getElementById('ayahBangla').textContent = ayah.bangla;

  const row = document.getElementById('cardsRow');
  row.innerHTML = ayah.words.map(buildCard).join('');

  // wire derived toggles
  row.querySelectorAll('.derived-toggle').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const wrap = btn.nextElementSibling;
      const open = wrap.classList.toggle('open');
      btn.querySelector('.plus').textContent = open ? '–' : '+';
    });
  });

  // align carousel start (RTL: jump to extreme right)
  alignToStart();

  // nav buttons
  document.getElementById('prevBtn').onclick = ()=> scrollOne(-1);
  document.getElementById('nextBtn').onclick = ()=> scrollOne(1);
  updateNavButtons();
  row.addEventListener('scroll', debounce(updateNavButtons, 100));
}

// ---- Card HTML ----
function buildCard(w){
  const derived = (w.derived && w.derived.length)
    ? w.derived.map(d=>`
        <div class="derived-item">
          <span class="ar">${d.ar}</span>
          <span class="bn">${d.bn}</span>
          <span class="pattern">${d.pattern||''}</span>
        </div>`).join('')
    : `<div class="derived-item"><span class="bn">—</span></div>`;

  return `
  <article class="word-card" role="listitem">
    <div class="card-header">MAIN</div>

    <div class="main-panel">
      <div class="card-main-ar">${w.ar}</div>
      <div class="card-bn">${w.bn||''}</div>
      <div class="card-meta">
        ${w.tr ? `<span class="meta-chip">${w.tr}</span>` : ''}
        ${w.root ? `<span class="meta-chip">${w.root}</span>` : ''}
        ${w.pattern ? `<span class="meta-chip">${w.pattern}</span>` : ''}
      </div>
    </div>

    <button class="derived-toggle" type="button" aria-expanded="false">
      <span class="plus">+</span> Derived
    </button>
    <div class="derived-wrap" hidden>
      <div class="derived-list">${derived}</div>
    </div>
  </article>`;
}

// ---- Carousel helpers ----
function alignToStart(){
  const row = document.getElementById('cardsRow');
  const rtl = document.body.classList.contains('rtl');
  requestAnimationFrame(()=>{
    if(rtl){
      row.scrollLeft = row.scrollWidth;
      row.scrollLeft = 1e9; // ensure rightmost lock
    }else{
      row.scrollLeft = 0;
    }
  });
}
function scrollOne(dir){
  const row = document.getElementById('cardsRow');
  const card = row.querySelector('.word-card');
  if(!card) return;
  const step = card.getBoundingClientRect().width + 16; // width + gap
  const rtl = document.body.classList.contains('rtl');
  const delta = rtl ? -dir*step : dir*step; // RTL: invert
  row.scrollBy({left: delta, behavior:'smooth'});
}
function updateNavButtons(){
  const row = document.getElementById('cardsRow');
  const max = row.scrollWidth - row.clientWidth - 2;
  const atStart = Math.abs(row.scrollLeft) <= 2;
  const atEnd = Math.abs(row.scrollLeft) >= max;

  const rtl = document.body.classList.contains('rtl');
  // In RTL browsers, scrollLeft can be negative or large positive; normalize:
  const sl = normalizeScrollLeft(row, rtl);
  const atStartRTL = sl <= 2;
  const atEndRTL = sl >= max;

  const prev = document.getElementById('prevBtn');
  const next = document.getElementById('nextBtn');
  if(rtl){
    // at "start" means rightmost -> disable prev
    prev.disabled = atStartRTL;
    next.disabled = atEndRTL;
  }else{
    prev.disabled = atStart;
    next.disabled = atEnd;
  }
}
function normalizeScrollLeft(el, rtl){
  // cross-browser RTL scrollLeft normalization
  const sl = el.scrollLeft;
  if(!rtl) return sl;
  // Safari/Chrome return positive growing to left; Firefox returns negative.
  // Convert to 0..max where 0 is rightmost.
  const max = el.scrollWidth - el.clientWidth;
  if(sl < 0) return -sl;        // Firefox
  return max - sl;              // Chrome/Safari
}
function debounce(fn, t=100){
  let id; return (...a)=>{ clearTimeout(id); id=setTimeout(()=>fn(...a),t); };
}

// ---- RTL / LTR toggle ----
document.getElementById('dirToggle').addEventListener('click', ()=>{
  const body = document.body;
  body.classList.toggle('rtl');
  const isRTL = body.classList.contains('rtl');
  body.dir = isRTL ? 'rtl' : 'ltr';
  document.getElementById('dirToggle').textContent = isRTL ? 'LTR' : 'RTL';
  alignToStart();
});

// open/close animation hook: toggle [hidden] for a11y
document.addEventListener('click', e=>{
  if(!e.target.closest('.derived-toggle')) return;
  const btn = e.target.closest('.derived-toggle');
  const wrap = btn.nextElementSibling;
  const isOpen = wrap.classList.toggle('open');
  btn.setAttribute('aria-expanded', String(isOpen));
  btn.querySelector('.plus').textContent = isOpen ? '–' : '+';
  if(isOpen) wrap.removeAttribute('hidden'); else wrap.setAttribute('hidden','');
});

loadManifest();
