/* ------------------------------
   Config & helpers
------------------------------ */
const MANIFEST_URL = './manifest.json';
const qs = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => [...r.querySelectorAll(s)];

const withNoStore = (url) => {
  // Honor existing query; add a cache-buster to be safe on GH Pages
  const u = new URL(url, location.href);
  u.searchParams.set('nocache', Date.now().toString());
  return u.toString();
};

function showFatalMessage(msg) {
  const host = qs('#content') || document.body;
  const box = document.createElement('div');
  box.style.padding = '12px';
  box.style.margin = '16px auto';
  box.style.maxWidth = '820px';
  box.style.border = '1px solid #f3c2c2';
  box.style.background = '#fff4f4';
  box.style.color = '#9b1c1c';
  box.textContent = msg;
  host.prepend(box);
}

/* ------------------------------
   Load manifest & data
------------------------------ */
async function loadManifest() {
  const res = await fetch(withNoStore(MANIFEST_URL), { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} loading manifest`);
  return res.json();
}

async function loadData(pathFromManifest) {
  const res = await fetch(withNoStore(pathFromManifest), { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} loading ${pathFromManifest}`);
  return res.json();
}

/* ------------------------------
   Rendering
------------------------------ */
function renderMeta(metaEl, data) {
  metaEl.innerHTML = `
    <h2 lang="ar" dir="rtl">${data.name_ar ?? ''}</h2>
    <h3 lang="bn" dir="ltr">${data.name_bn ?? ''}</h3>
  `;
}

function renderSurah(contentEl, data) {
  contentEl.innerHTML = ''; // clear

  const verseTpl = qs('#verseTpl');
  const wordTpl  = qs('#wordCardTpl');

  (data.verses || []).forEach(v => {
    const node = verseTpl.content.cloneNode(true);
    const ar = qs('.ayah-ar', node);
    const bn = qs('.ayah-bn', node);
    const list = qs('.words', node);

    ar.textContent = v.arabic || '';
    bn.textContent = v.bangla || '';

    (v.words || []).forEach(w => {
      const wNode = wordTpl.content.cloneNode(true);

      qs('.w-ar', wNode).textContent = w.ar || '';
      qs('.w-bn', wNode).textContent = w.bn || '';
      qs('.w-tr', wNode).textContent = w.tr ? w.tr : '';

      const root = w.root ? `\u200E${w.root}\u200E` : ''; // keep neutral direction
      const pattern = w.pattern || '';

      qs('.w-root', wNode).textContent = root;
      qs('.w-pattern', wNode).textContent = pattern;

      // Derived list
      const dWrap = qs('.derived', wNode);
      dWrap.innerHTML = '';
      if (Array.isArray(w.derived) && w.derived.length) {
        w.derived.forEach(d => {
          const row = document.createElement('span');
          row.innerHTML = `
            <span class="d-ar" lang="ar" dir="rtl">${d.ar ?? ''}</span>
            <span class="d-right">
              <span class="d-bn" lang="bn" dir="ltr">${d.bn ?? ''}</span>
              <span class="pill">${d.tr ? d.tr : ''}</span>
              <span class="pill">${d.pattern ?? ''}</span>
            </span>
          `;
          dWrap.appendChild(row);
        });
      } else {
        // if none, hide the divider space
        dWrap.style.display = 'none';
      }

      list.appendChild(wNode);
    });

    contentEl.appendChild(node);
  });
}

/* ------------------------------
   Init
------------------------------ */
async function init() {
  const metaEl = qs('#meta');
  const contentEl = qs('#content');
  const selectEl = qs('#surahSelect');
  const reloadBtn = qs('#reloadBtn');

  try {
    const manifest = await loadManifest();

    // Populate selector
    selectEl.innerHTML = manifest.map(m => `
      <option value="${m.id}">${m.name}</option>
    `).join('');

    // Load first by default
    const first = manifest[0];
    if (!first) throw new Error('Manifest is empty.');
    await loadAndRender(first);

    // Change handler
    selectEl.addEventListener('change', async (e) => {
      const id = e.target.value;
      const sel = manifest.find(x => x.id === id);
      if (sel) await loadAndRender(sel);
    });

    // Reload (cache-bypass)
    reloadBtn.addEventListener('click', async () => {
      const id = selectEl.value;
      const sel = manifest.find(x => x.id === id) || manifest[0];
      await loadAndRender(sel, /*force*/ true);
    });

    async function loadAndRender(entry, force = false) {
      const data = await loadData(entry.json + (force ? `?r=${Date.now()}` : ''));
      renderMeta(metaEl, data);
      renderSurah(contentEl, data);
    }

  } catch (err) {
    console.error(err);
    showFatalMessage('Could not load manifest. Ensure <code>manifest.json</code> is at the site root and paths inside it are correct.');
  }
}

document.addEventListener('DOMContentLoaded', init);
