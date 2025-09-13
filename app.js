// Load manifest & build surah selector
async function loadManifest() {
  const res = await fetch('manifest.json');
  if (!res.ok) throw new Error('Manifest not found');
  const manifest = await res.json();
  const select = document.getElementById('surahSelect');
  manifest.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.json;
    opt.textContent = `${item.name}`;
    select.appendChild(opt);
  });
  select.addEventListener('change', () => loadSurah(select.value));
  if (manifest.length) loadSurah(manifest[0].json);
}

async function loadSurah(path) {
  const res = await fetch(path);
  const data = await res.json();
  renderSurah(data);
}

function renderSurah(data) {
  const surahTitle = document.getElementById('surahTitle');
  const surahTitleBn = document.getElementById('surahTitleBn');
  const cardsContainer = document.getElementById('wordCardsContainer');

  surahTitle.textContent = `سورة ${data.name_ar}`;
  surahTitleBn.textContent = data.name_bn;

  // show first ayah
  renderAyah(data.verses[0]);

  function renderAyah(ayah) {
    document.getElementById('ayahNumber').textContent = `Ayah ${ayah.ayah_id.split(':')[1]}`;
    document.getElementById('ayahArabic').textContent = ayah.arabic;
    document.getElementById('ayahBangla').textContent = ayah.bangla;

    const row = document.createElement('div');
    row.className = 'cards-row';
    row.innerHTML = ayah.words.map(w => createCardHTML(w)).join('');
    cardsContainer.innerHTML = '';
    cardsContainer.appendChild(row);
    alignCarouselToStart(row);
  }
}

function createCardHTML(word) {
  const derivedHTML = word.derived && word.derived.length
    ? word.derived.map(d =>
        `<div class="derived-item">
          <span class="ar">${d.ar}</span>
          <span class="bn">${d.bn}</span>
          <span class="pattern">${d.pattern}</span>
        </div>`
      ).join('')
    : `<div class="derived-item"><span class="bn">–</span></div>`;

  return `
    <div class="word-card">
      <div class="card-header"><span>MAIN</span></div>
      <div class="card-main-ar">${word.ar}</div>
      <div class="card-bn">${word.bn}</div>
      <div class="card-meta">
        <span class="meta-chip">${word.tr || ''}</span>
        ${word.root ? `<span class="meta-chip">${word.root}</span>` : ''}
        ${word.pattern ? `<span class="meta-chip">${word.pattern}</span>` : ''}
      </div>
      <div class="card-header"><span>DERIVED</span></div>
      <div class="derived-list">${derivedHTML}</div>
    </div>
  `;
}

/* Align carousel so the rightmost card (first word) is visible */
function alignCarouselToStart(rowEl) {
  const isRTL = document.body.classList.contains('rtl');
  requestAnimationFrame(() => {
    if (isRTL) {
      rowEl.scrollLeft = rowEl.scrollWidth;
      rowEl.scrollLeft = rowEl.scrollWidth * 2;
      rowEl.scrollLeft = 1e9;
    } else {
      rowEl.scrollLeft = 0;
    }
  });
}

// Toggle RTL/LTR
document.getElementById('dirToggle').addEventListener('click', () => {
  document.body.classList.toggle('rtl');
  document.body.dir = document.body.classList.contains('rtl') ? 'rtl' : 'ltr';
  document.getElementById('dirToggle').textContent =
    document.body.classList.contains('rtl') ? 'LTR' : 'RTL';
  const row = document.querySelector('.cards-row');
  if (row) alignCarouselToStart(row);
});

loadManifest();
