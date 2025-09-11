/* Qur’an Word Explorer: loads a manifest + a selected surah JSON in your schema,
   then renders “all verses” with per-word panels.
*/

const $ = (id) => document.getElementById(id);

const sel = $("surahSelect");
const btnReload = $("reloadBtn");
const statusEl = $("status");
const errorBanner = $("errorBanner");
const container = $("surah-container");

let manifest = [];
let currentFile = null;

init();

function init(){
  attachEvents();
  loadManifest();
}

function attachEvents(){
  sel.addEventListener("change", () => {
    const filename = sel.value;
    if(!filename) return;
    loadSurah(filename);
  });
  btnReload.addEventListener("click", () => {
    if(currentFile) loadSurah(currentFile, /*nocache*/ true);
  });
}

async function loadManifest(){
  try{
    clearError();
    status("Loading manifest…");
    const res = await fetch("data/manifest.json", {cache:"no-store"});
    if(!res.ok) throw new Error(`Failed to fetch manifest (${res.status})`);
    manifest = await res.json();
    // Populate dropdown
    sel.innerHTML = manifest.map(m => 
      `<option value="${m.filename}">${m.display || m.name_bn || m.name_ar || m.id}</option>`
    ).join("");
    if(manifest.length){
      currentFile = manifest[0].filename;
      sel.value = currentFile;
      await loadSurah(currentFile);
    }else{
      sel.innerHTML = `<option disabled selected>No decks in manifest</option>`;
    }
  }catch(err){
    showError(err.message || String(err));
  }finally{
    status("");
  }
}

async function loadSurah(filename, nocache=false){
  try{
    clearError();
    status(`Loading ${filename}…`);
    currentFile = filename;
    const url = `data/${filename}${nocache ? `?v=${Date.now()}` : ""}`;
    const res = await fetch(url, {cache:"no-store"});
    if(!res.ok) throw new Error(`Failed to fetch ${url} (${res.status})`);
    const data = await res.json();

    // Support either { … } or [ { … } ]
    const surahObj = Array.isArray(data) ? data[0] : data;

    renderSurah(surahObj);
  }catch(err){
    showError(err.message || String(err));
  }finally{
    status("");
  }
}

function renderSurah(surah){
  container.innerHTML = "";

  if(!surah || !Array.isArray(surah.verses)){
    showError("Loaded deck but found no 'verses'. Check your JSON keys.");
    return;
  }

  // Heading
  const head = document.createElement("div");
  head.className = "surah-heading";
  head.innerHTML = `<h2>${esc(surah.name_bengali || "—")} <span class="muted">(${esc(surah.name_arabic || "—")})</span></h2>`;
  container.appendChild(head);

  // Each verse
  surah.verses.forEach(verse => {
    const pane = document.createElement("div");
    pane.className = "verse-container";

    const h3 = document.createElement("h3");
    h3.innerHTML = `আয়াত ${esc(verse.verse_number)}:
      <div class="arabic-text">${esc(verse.verse_arabic || "")}</div>`;
    pane.appendChild(h3);

    (verse.words || []).forEach(word => {
      const row = document.createElement("div");
      row.className = "word-details-container";

      // LEFT: word card
      const left = document.createElement("div");
      left.className = "word-card";
      left.innerHTML = `
        <p>
          <span class="arabic-text-bold">${esc(word.arabic || "—")}</span>
          ${word.transliteration ? ` (${esc(word.transliteration)})` : ""}:
          ${esc(word.meaning || "—")}
        </p>
        <div class="kv">
          ${word.form ? `<div><b>রূপ (Form):</b> ${esc(word.form)}</div>` : ""}
        </div>
      `;

      // RIGHT: related + root
      const right = document.createElement("div");
      right.className = "related-info";

      let rightHTML = `<h4>মূল ও সম্পর্কিত শব্দসমূহ</h4>`;

      if(word.root || word.root_meaning){
        rightHTML += `
          <p>
            ${word.root ? `<strong>মূল:</strong> ${esc(word.root)}` : ""}
            ${word.root_meaning ? ` <span>(${esc(word.root_meaning)})</span>` : ""}
          </p>
        `;
      }else{
        rightHTML += `<p class="muted">মূল তথ্য নেই</p>`;
      }

      const rel = Array.isArray(word.related_words) ? word.related_words : [];
      if(rel.length){
        rightHTML += `<ul>`;
        rel.forEach(r=>{
          rightHTML += `
            <li>
              <span class="arabic-text">${esc(r.arabic || "")}</span> : ${esc(r.meaning || "")}
            </li>`;
        });
        rightHTML += `</ul>`;
      }

      right.innerHTML = rightHTML;

      row.appendChild(left);
      row.appendChild(right);
      pane.appendChild(row);
    });

    container.appendChild(pane);
  });
}

function esc(s){
  return String(s)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;");
}

function showError(msg){
  errorBanner.textContent = msg;
  errorBanner.classList.remove("hidden");
}
function clearError(){
  errorBanner.textContent = "";
  errorBanner.classList.add("hidden");
}
function status(t){ statusEl.textContent = t || ""; }
