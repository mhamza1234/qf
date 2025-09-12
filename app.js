/* app.js — robust auto-loader + tolerant renderer */

const MANIFEST_URL = 'data/manifest.json';

const els = {
  select: document.getElementById('deckSelect'),
  reload: document.getElementById('reloadBtn'),
  verseWrap: document.getElementById('verses'),
  banner: document.getElementById('banner'),
  tip: document.getElementById('tip'),
};

let manifest = null;

document.addEventListener('DOMContentLoaded', () => {
  init().catch(showFatal);
});

async function init() {
  showTip('Tip: স্ক্রল করে কার্ড দেখুন • কার্ড ট্যাপ/এন্টার করলে বিস্তারিত টগল হবে');

  manifest = await loadManifest(MANIFEST_URL);

  // Populate dropdown
  els.select.innerHTML = '';
  manifest.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = item.name;
    els.select.appendChild(opt);
  });

  // Wire events
  els.reload.addEventListener('click', () => safeLoadDeck(els.select.value));
  els.select.addEventListener('change', () => safeLoadDeck(els.select.value));

  // ✅ Auto-load the initially selected deck
  if (els.select.value) {
    await safeLoadDeck(els.select.value);
  }
}

async function safeLoadDeck(id) {
  try {
    clearBanner();
    const deck = manifest.find(d => d.id === id);
    if (!deck) throw new Error(`Deck not found: ${id}`);

    const res = await fetch(deck.json, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to fetch ${deck.json} (${res.status})`);
    const data = await res.json();

    renderSurah(data, deck.mode || 'full');
  } catch (err) {
    showFatal(err);
  }
}

async function loadManifest(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch manifest (${res.status})`);
  // Validate basic shape
  const m = await res.json();
  if (!Array.isArray(m)) throw new Error('Manifest must be an array.');
  m.forEach((row, i) => {
    if (!row.id || !row.name || !row.json) {
      throw new Error(`Manifest row ${i} missing required fields (id/name/json).`);
    }
  });
  return m;
}

/* ----------------- Rendering ----------------- */

function renderSurah(surah, mode) {
  // Clear old
  els.verseWrap.innerHTML = '';

  (surah.verses || []).forEach(verse => {
    const article = document.createElement('article');
    article.className = 'verse';
    article.setAttribute('data-ayah-id', verse.ayah_id || '');

    // top: Arabic line
    const topBar = document.createElement('div');
    topBar.className = 'ayah-head';
    topBar.innerHTML = `
      <div class="ayah-ar" lang="ar" dir="rtl">${escapeHTML(verse.arabic || '')}</div>
      <div class="ayah-bn" lang="bn" dir="ltr">${escapeHTML(verse.bangla || '')}</div>
    `;
    article.appendChild(topBar);

    // rail: word cards
    const rail = document.createElement('div');
    rail.className = 'word-rail';
    rail.setAttribute('role', 'region');
    rail.setAttribute('aria-label', `আয়াত ${verse.ayah_id || ''} শব্দ তালিকা`);

    (verse.words || []).forEach(w => {
      rail.appendChild(buildWordCard(w));
    });

    article.appendChild(rail);
    els.verseWrap.appendChild(article);
  });
}

/* Build one word card (resilient to missing fields) */
function buildWordCard(w) {
  const card = document.createElement('div');
  card.className = 'word-card';
  card.tabIndex = 0;

  const ar = safe(w.ar);
  const bn = safe(w.bn);
  const tr = safe(w.tr);
  const root = safe(w.root);
  const pattern = safe(w.pattern);

  card.innerHTML = `
    <div class="word-main">
      <div class="w-ar" lang="ar" dir="rtl">${escapeHTML(ar)}</div>
      <div class="w-bn" lang="bn">${escapeHTML(bn)}</div>
      <div class="w-meta">
        ${tr ? `<span class="chip">${escapeHTML(tr)}</span>` : ''}
        ${root ? `<span class="chip">${escapeHTML(root)}</span>` : ''}
        ${pattern ? `<span class="chip">${escapeHTML(pattern)}</span>` : ''}
      </div>
    </div>
    ${Array.isArray(w.derived) && w.derived.length ? `
      <div class="derived">
        ${w.derived.map(d => `
          <div class="drow">
            <span class="d-ar" lang="ar" dir="rtl">${escapeHTML(safe(d.ar))}</span>
            <span class="d-bn" lang="bn">${escapeHTML(safe(d.bn))}</span>
            <span class="d-tr">${escapeHTML(safe(d.tr))}</span>
            <span class="d-pt">${escapeHTML(safe(d.pattern))}</span>
          </div>
        `).join('')}
      </div>` : ''
    }
  `;

  // Toggle derived on click/Enter
  card.addEventListener('click', () => toggleDerived(card));
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDerived(card); }
  });

  return card;
}

function toggleDerived(card) {
  card.classList.toggle('expanded');
}

/* ----------------- Utilities ----------------- */

function safe(v) { return (v === undefined || v === null) ? '' : String(v); }

function escapeHTML(s) {
  return s.replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function showFatal(err) {
  console.error(err);
  els.banner.hidden = false;
  els.banner.textContent = (err && err.message) ? err.message : 'Unknown error';
}

function clearBanner() {
  els.banner.hidden = true;
  els.banner.textContent = '';
}

function showTip(msg) {
  if (els.tip) els.tip.textContent = msg;
}
