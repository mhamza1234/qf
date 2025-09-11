/* ============================================================
   Qur’an Word Explorer
   - Renders: Surah → Verse → Horizontal Word Cards
   - Card top (main): Arabic, Bangla meaning, Transliteration, Root, Pattern
   - Card bottom (derived items): Arabic, Bangla, Transliteration, Pattern
   - No labels; fixed order per line; compact & scrollable
   - Filters duplicate derived == main word
   - Only shows pattern when in our shortlist
   ============================================================ */

/* --------- Pattern shortlist (display only if in this set) --------- */
const PATTERN_WHITELIST = new Set([
  // Nouns/adjectives (templates)
  "فَعْل", "فَعَل", "فِعْل", "فِعال", "فَعيل", "مِفْعال", "مُفْعِل", "مُفْعَل",
  "مَفْعَل", "مَفْعُول", "فَعَّال", "فَعول",

  // Verbs (basic)
  "فَعَلَ", "فَعِلَ", "فَعُلَ",

  // Augmented (common)
  "فَعَّلَ", "فاعَلَ", "أَفْعَلَ", "تَفَعَّلَ", "تَفاعَلَ", "اِنْفَعَلَ",
  "اِفْتَعَلَ", "اِسْتَفْعَلَ"
]);

/* --------- Simple utility renderers --------- */
const el = (tag, className, html) => {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (html != null) n.innerHTML = html;
  return n;
};

// Prefer content if present; else use "—"
const showOrDash = (s) => (s && String(s).trim().length ? s : "—");

// show pattern only if in whitelist; else dash
const showPattern = (p) => (p && PATTERN_WHITELIST.has(p) ? p : "—");

// strip duplicates of derived that equal the main form
const notSameWord = (main, d) => (d && d.ar && main && main.ar ? d.ar !== main.ar : true);

/* --------- Data loading ---------
   This viewer will try to load:
     /data/manifest.json   -> list of decks
     /data/<file>.json     -> surah data
   To make it work offline (file://) or without a server,
   there’s a minimal fallback dataset defined here.
----------------------------------------------------------------- */
const FALLBACK_MANIFEST = [
  { id: "mulk_full", name: "Al-Mulk (67) — Full", file: "mulk_full.json" }
];

const FALLBACK_SURA = {
  surah: 67,
  name_ar: "سورة الملك",
  name_bn: "আল-মুলক",
  verses: [
    {
      ayah_id: "67:1",
      arabic: "تَبَارَكَ الَّذِي بِيَدِهِ ٱلْمُلْكُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ",
      bangla: "বরকতময় তিনি—যাঁর হাতে সব কর্তৃত্ব; তিনি সবকিছুর উপর সর্বশক্তিমান।",
      words: [
        {
          ar: "تَبَارَكَ",
          bn: "বরকতময়",
          tr: "tabāraka",
          root: "ب-ر-ك",
          pattern: "تَفاعَلَ",
          derived: [
            { ar: "مُبارَك", bn: "বরকতময়", tr: "mubārak", pattern: "مُفْعَل" },
            { ar: "بَرَكات", bn: "বরকতসমূহ", tr: "barakāt", pattern: "فَعَلات" }
          ]
        },
        {
          ar: "ٱلَّذِي",
          bn: "যিনি",
          tr: "alladhī",
          root: "—",
          pattern: "—",
          derived: []
        },
        {
          ar: "بِيَدِهِ",
          bn: "তার হাতে",
          tr: "bi-yadihi",
          root: "ي-د",
          pattern: "—",
          derived: [
            { ar: "يَد", bn: "হাত", tr: "yad", pattern: "فَعْل" }
          ]
        }
      ]
    }
  ]
};

/* Try to fetch JSON; if fails, use fallback */
async function safeFetchJSON(url, fallback) {
  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch {
    return fallback;
  }
}

/* --------- Rendering --------- */
function renderApp(surahData) {
  const app = document.getElementById("app");
  app.innerHTML = "";

  // For each verse: sticky-like header + word strip
  surahData.verses.forEach((v) => {
    const verse = el("section", "verse");

    // top ayah area
    const ayah = el("div", "ayah");
    const ar = el("div", "arabic", v.arabic);
    const bn = el("div", "bangla", v.bangla || "");
    ayah.append(ar, bn);

    // word strip (horizontal)
    const strip = el("div", "word-strip");

    v.words.forEach((w) => {
      const card = el("article", "word-card");

      // main box (no labels; fixed order)
      const main = el("div", "box main-word");
      const wAr = el("div", "w-ar", showOrDash(w.ar));
      const line1 = el("div", "line");
      line1.append(el("div", "bn", showOrDash(w.bn)), el("div", "tr", showOrDash(w.tr)));

      const line2 = el("div", "line");
      line2.append(el("div", "root", showOrDash(w.root)), el("div", "pat", showPattern(w.pattern)));

      main.append(wAr, line1, line2);

      // derived box
      const derived = el("div", "box derived");
      const derivedList = (Array.isArray(w.derived) ? w.derived : []).filter(d => notSameWord(w, d));

      if (!derivedList.length) {
        // keep compact; empty derived still gets a small placeholder divider so heights are consistent
        derived.append(el("div", "der-item", el("div", "der-row", "—")));
      } else {
        derivedList.forEach((d) => {
          const item = el("div", "der-item");
          item.append(
            el("div", "der-ar", showOrDash(d.ar)),
            (() => {
              const r = el("div", "der-row");
              r.append(
                el("div", "bn", showOrDash(d.bn)),
                el("div", "tr", showOrDash(d.tr))
              );
              return r;
            })(),
            (() => {
              const r = el("div", "der-row");
              // keep root out of derived (by your spec), only the pattern line
              r.append(
                el("div", "pat", showPattern(d.pattern))
              );
              return r;
            })()
          );
          derived.append(item);
        });
      }

      card.append(main, derived);
      strip.append(card);
    });

    verse.append(ayah, strip);
    app.append(verse);
  });
}

/* --------- boot --------- */
(async function init(){
  const select = document.getElementById("surahSelect");
  const reloadBtn = document.getElementById("reloadBtn");

  // Load manifest
  const manifest = await safeFetchJSON("./data/manifest.json", FALLBACK_MANIFEST);

  // populate dropdown
  select.innerHTML = "";
  manifest.forEach((m, i) => {
    const opt = document.createElement("option");
    opt.value = m.file || m.id;
    opt.textContent = m.name || m.id;
    if (i === 0) opt.selected = true;
    select.appendChild(opt);
  });

  async function loadSelected() {
    const chosen = select.value;
    const file = chosen.endsWith(".json") ? chosen : `${chosen}.json`;
    const data = await safeFetchJSON(`./data/${file}`, FALLBACK_SURA);
    renderApp(data);
  }

  reloadBtn.addEventListener("click", loadSelected);
  select.addEventListener("change", loadSelected);

  // first load
  await loadSelected();
})();
