// Global variables
let currentSurahData = null;
let currentLine = 0;
let surahManifest = {};

// DOM elements
const elements = {
  surahSelect: null,
  surahTitle: null,
  currentAyat: null,
  currentMeaning: null,
  wordsContainer: null,
  progressBar: null,
  lineCounter: null,
  prevBtn: null,
  nextBtn: null,
  loadingIndicator: null,
  errorMessage: null,
  currentLineContainer: null,
  lineInfoContainer: null,
  progressContainer: null,
  controlsContainer: null
};

// Initialize DOM elements
const initializeElements = () => {
  elements.surahSelect = document.getElementById('surahSelect');
  elements.surahTitle = document.getElementById('surahTitle');
  elements.currentAyat = document.getElementById('currentAyat');
  elements.currentMeaning = document.getElementById('currentMeaning');
  elements.wordsContainer = document.getElementById('wordsContainer');
  elements.progressBar = document.getElementById('progressBar');
  elements.lineCounter = document.getElementById('lineCounter');
  elements.prevBtn = document.getElementById('prevBtn');
  elements.nextBtn = document.getElementById('nextBtn');
  elements.loadingIndicator = document.getElementById('loadingIndicator');
  elements.errorMessage = document.getElementById('errorMessage');
  elements.currentLineContainer = document.getElementById('currentLineContainer');
  elements.lineInfoContainer = document.getElementById('lineInfoContainer');
  elements.progressContainer = document.getElementById('progressContainer');
  elements.controlsContainer = document.getElementById('controlsContainer');
};

// Show/hide UI sections
const showSection = (element) => {
  if (element) element.style.display = 'block';
};

const hideSection = (element) => {
  if (element) element.style.display = 'none';
};

const showSurahInterface = () => {
  showSection(elements.currentLineContainer);
  showSection(elements.lineInfoContainer);
  showSection(elements.progressContainer);
  showSection(elements.controlsContainer);
  hideSection(elements.loadingIndicator);
  hideSection(elements.errorMessage);
};

const showLoading = () => {
  showSection(elements.loadingIndicator);
  hideSection(elements.currentLineContainer);
  hideSection(elements.lineInfoContainer);
  hideSection(elements.progressContainer);
  hideSection(elements.controlsContainer);
  hideSection(elements.errorMessage);
  elements.wordsContainer.innerHTML = '';
};

const showError = () => {
  showSection(elements.errorMessage);
  hideSection(elements.loadingIndicator);
  hideSection(elements.currentLineContainer);
  hideSection(elements.lineInfoContainer);
  hideSection(elements.progressContainer);
  hideSection(elements.controlsContainer);
  elements.wordsContainer.innerHTML = '';
};

// Load manifest file
const loadManifest = async () => {
  try {
    const response = await fetch('manifest.json');
    if (!response.ok) throw new Error('Failed to load manifest');
    surahManifest = await response.json();
    populateSurahSelector();
  } catch (error) {
    console.error('Error loading manifest:', error);
    // Fallback to hardcoded data for demo
    surahManifest = {
      surahs: [
        {
          id: "67",
          name: "Al-Mulk",
          arabicName: "الملك",
          banglaName: "সার্বভৌমত্ব",
          dataFile: "surah-67-mulk.json"
        }
      ]
    };
    populateSurahSelector();
  }
};

// Populate surah selector dropdown
const populateSurahSelector = () => {
  elements.surahSelect.innerHTML = '<option value="">Select a Surah</option>';
  
  if (surahManifest.surahs) {
    surahManifest.surahs.forEach(surah => {
      const option = document.createElement('option');
      option.value = surah.id;
      option.textContent = `${surah.id}. ${surah.name} (${surah.arabicName})`;
      elements.surahSelect.appendChild(option);
    });
  }
};

// Load surah data
const loadSurah = async () => {
  const selectedId = elements.surahSelect.value;
  if (!selectedId) {
    hideSection(elements.currentLineContainer);
    hideSection(elements.lineInfoContainer);
    hideSection(elements.progressContainer);
    hideSection(elements.controlsContainer);
    elements.wordsContainer.innerHTML = '';
    elements.surahTitle.textContent = '';
    return;
  }

  showLoading();
  
  try {
    const selectedSurah = surahManifest.surahs.find(s => s.id === selectedId);
    if (!selectedSurah) throw new Error('Surah not found');

    // Try to load from external file first, fallback to hardcoded data
    let response;
    try {
      response = await fetch(selectedSurah.dataFile);
    } catch (error) {
      // Fallback to hardcoded data for demo
      if (selectedId === "67") {
        currentSurahData = getHardcodedMulkData();
        elements.surahTitle.textContent = `${selectedSurah.name} - ${selectedSurah.arabicName} (${selectedSurah.banglaName})`;
        currentLine = 0;
        showSurahInterface();
        displayCurrentLine();
        displayWords();
        updateProgress();
        updateControls();
        return;
      }
      throw error;
    }
    
    if (!response.ok) throw new Error('Failed to load surah data');
    
    currentSurahData = await response.json();
    elements.surahTitle.textContent = `${selectedSurah.name} - ${selectedSurah.arabicName} (${selectedSurah.banglaName})`;
    
    currentLine = 0;
    showSurahInterface();
    displayCurrentLine();
    displayWords();
    updateProgress();
    updateControls();
    
  } catch (error) {
    console.error('Error loading surah:', error);
    showError();
  }
};

// Display current line (ayat and meaning)
const displayCurrentLine = () => {
  elements.currentAyat.textContent = '';
  elements.currentMeaning.textContent = '';
  
  if (currentSurahData && currentLine < currentSurahData.lines.length) {
    elements.currentAyat.textContent = currentSurahData.lines[currentLine].ar;
    elements.currentMeaning.textContent = currentSurahData.lines[currentLine].bn;
  }
};

// Display words for current line
const displayWords = () => {
  elements.wordsContainer.innerHTML = '';
  
  if (currentSurahData && currentLine < currentSurahData.lines.length) {
    const words = currentSurahData.lines[currentLine].words;
    words.forEach(wordData => {
      const wordTile = document.createElement('div');
      wordTile.className = 'word-tile';
      
      wordTile.innerHTML = `
        <div class="word-main">
          <div class="arabic-word">${wordData.ar}</div>
          <div class="bangla-word">${wordData.bn}</div>
          <div class="root-word">${wordData.root}</div>
          <div class="pattern-word">${wordData.pattern}</div>
        </div>
        <div class="derived-words">
          ${wordData.derived.map(derived => `
            <div class="derived-word">
              <div class="derived-arabic">${derived.word}</div>
              <div class="derived-meaning">${derived.meaning}</div>
              <div class="derived-pattern">${derived.pattern}</div>
            </div>
          `).join('')}
        </div>
      `;
      
      elements.wordsContainer.appendChild(wordTile);
    });
  }
};

// Update progress bar and counter
const updateProgress = () => {
  if (currentSurahData) {
    const progress = ((currentLine + 1) / currentSurahData.lines.length) * 100;
    elements.progressBar.style.width = progress + '%';
    elements.lineCounter.textContent = `Line ${currentLine + 1} of ${currentSurahData.lines.length}`;
  }
};

// Update control button states
const updateControls = () => {
  if (currentSurahData) {
    elements.prevBtn.disabled = currentLine === 0;
    elements.nextBtn.disabled = currentLine >= currentSurahData.lines.length - 1;
  }
};

// Navigation functions
const nextLine = () => {
  if (currentSurahData && currentLine < currentSurahData.lines.length - 1) {
    currentLine++;
    displayCurrentLine();
    displayWords();
    updateProgress();
    updateControls();
  }
};

const previousLine = () => {
  if (currentSurahData && currentLine > 0) {
    currentLine--;
    displayCurrentLine();
    displayWords();
    updateProgress();
    updateControls();
  }
};

// Hardcoded data for demo (fallback)
const getHardcodedMulkData = () => {
  return {
    lines: [
      {
        ar: "تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ",
        bn: "মহিমান্বিত তিনি যার হাতে সার্বভৌমত্ব এবং তিনি সব কিছুর উপর ক্ষমতাবান।",
        words: [
          {
            ar: "تَبَارَكَ",
            bn: "বরকতময়",
            tr: "tabāraka",
            root: "ب-ر-ك",
            pattern: "تَفَاعَلَ",
            derived: [
              { word: "بَرَكَة", meaning: "বরকত", pattern: "فَعَلَة" },
              { word: "مُبَارَك", meaning: "বরকতময়", pattern: "مُفَاعَل" },
              { word: "بَارَكَ", meaning: "বরকত দেওয়া", pattern: "فَاعَلَ" }
            ]
          },
          {
            ar: "الَّذِي",
            bn: "যিনি",
            tr: "alladhī",
            root: "ا-ل-ل",
            pattern: "الَّذِي",
            derived: [
              { word: "الَّتِي", meaning: "যে (স্ত্রীলিঙ্গ)", pattern: "الَّتِي" },
              { word: "الَّذِينَ", meaning: "যারা (পুরুষ বহুবচন)", pattern: "الَّذِينَ" }
            ]
          },
          {
            ar: "بِيَدِهِ",
            bn: "তাঁর হাতে",
            tr: "biyadihi",
            root: "ي-د-ي",
            pattern: "بِفَعَلِهِ",
            derived: [
              { word: "يَد", meaning: "হাত", pattern: "فَعَل" },
              { word: "أَيْدِي", meaning: "হাত সমূহ", pattern: "أَفْعِل" }
            ]
          },
          {
            ar: "الْمُلْكُ",
            bn: "সার্বভৌমত্ব",
            tr: "almulku",
            root: "م-ل-ك",
            pattern: "الْفُعْلُ",
            derived: [
              { word: "مَلِك", meaning: "রাজা", pattern: "فَعِل" },
              { word: "مَالِك", meaning: "মালিক", pattern: "فَاعِل" },
              { word: "مَمْلَكَة", meaning: "রাজ্য", pattern: "مَفْعَلَة" }
            ]
          },
          {
            ar: "وَهُوَ",
            bn: "এবং তিনি",
            tr: "wahuwa",
            root: "هـ-و-و",
            pattern: "وَفُعَل",
            derived: [
              { word: "هِي", meaning: "সে (স্ত্রীলিঙ্গ)", pattern: "فِعَل" },
              { word: "هُم", meaning: "তারা", pattern: "فُعَل" }
            ]
          },
          {
            ar: "عَلَىٰ",
            bn: "উপর",
            tr: "ʿalā",
            root: "ع-ل-و",
            pattern: "فَعَل",
            derived: [
              { word: "عُلُوّ", meaning: "উচ্চতা", pattern: "فُعُول" },
              { word: "أَعْلَى", meaning: "সর্বোচ্চ", pattern: "أَفْعَل" }
            ]
          },
          {
            ar: "كُلِّ",
            bn: "সকল",
            tr: "kulli",
            root: "ك-ل-ل",
            pattern: "فُعَل",
            derived: [
              { word: "كُلّ", meaning: "সব", pattern: "فُعَل" },
              { word: "كُلِّيَّة", meaning: "সামগ্রিকতা", pattern: "فُعَلِّيَّة" }
            ]
          },
          {
            ar: "شَيْءٍ",
            bn: "জিনিস",
            tr: "shay'in",
            root: "ش-ي-ء",
            pattern: "فَعْل",
            derived: [
              { word: "أَشْيَاء", meaning: "জিনিসপত্র", pattern: "أَفْعَال" },
              { word: "شَيْئِيَّة", meaning: "বস্তুত্ব", pattern: "فَعْلِيَّة" }
            ]
          },
          {
            ar: "قَدِيرٌ",
            bn: "ক্ষমতাবান",
            tr: "qadīrun",
            root: "ق-د-ر",
            pattern: "فَعِيل",
            derived: [
              { word: "قُدْرَة", meaning: "ক্ষমতা", pattern: "فُعْلَة" },
              { word: "قَادِر", meaning: "সক্ষম", pattern: "فَاعِل" },
              { word: "مَقْدُور", meaning: "নির্ধারিত", pattern: "مَفْعُول" }
            ]
          }
        ]
      },
      {
        ar: "الَّذِي خَلَقَ الْمَوْتَ وَالْحَيَاةَ لِيَبْلُوَكُمْ أَيُّكُمْ أَحْسَنُ عَمَلًا",
        bn: "যিনি সৃষ্টি করেছেন মৃত্যু ও জীবন তোমাদের পরীক্ষা করার জন্য যে কে তোমাদের মধ্যে সর্বোত্তম কর্ম করে।",
        words: [
          {
            ar: "الَّذِي",
            bn: "যিনি",
            tr: "alladhī",
            root: "ا-ل-ل",
            pattern: "الَّذِي",
            derived: [
              { word: "الَّتِي", meaning: "যে (স্ত্রীলিঙ্গ)", pattern: "الَّتِي" },
              { word: "الَّذِينَ", meaning: "যারা (পুরুষ বহুবচন)", pattern: "الَّذِينَ" }
            ]
          },
          {
            ar: "خَلَقَ",
            bn: "সৃষ্টি করেছেন",
            tr: "khalaqa",
            root: "خ-ل-ق",
            pattern: "فَعَلَ",
            derived: [
              { word: "خَلْق", meaning: "সৃষ্টি", pattern: "فَعْل" },
              { word: "خَالِق", meaning: "স্রষ্টা", pattern: "فَاعِل" },
              { word: "مَخْلُوق", meaning: "সৃষ্ট", pattern: "مَفْعُول" }
            ]
          },
          {
            ar: "الْمَوْتَ",
            bn: "মৃত্যু",
            tr: "almawta",
            root: "م-و-ت",
            pattern: "الْفَعْل",
            derived: [
              { word: "مَيِّت", meaning: "মৃত", pattern: "فَيِّل" },
              { word: "مُمِيت", meaning: "মৃত্যুদাতা", pattern: "مُفْعِل" }
            ]
          },
          {
            ar: "وَالْحَيَاةَ",
            bn: "এবং জীবন",
            tr: "walhayāta",
            root: "ح-ي-ي",
            pattern: "وَالْفَعَالَة",
            derived: [
              { word: "حَيّ", meaning: "জীবিত", pattern: "فَعّ" },
              { word: "مُحْيِي", meaning: "জীবনদাতা", pattern: "مُفْعِل" }
            ]
          },
          {
            ar: "لِيَبْلُوَكُمْ",
            bn: "তোমাদের পরীক্ষা করার জন্য",
            tr: "liyabluwakum",
            root: "ب-ل-و",
            pattern: "لِيَفْعُلَكُمْ",
            derived: [
              { word: "بَلَاء", meaning: "পরীক্ষা", pattern: "فَعَال" },
              { word: "ابْتِلَاء", meaning: "পরীক্ষা", pattern: "افْتِعَال" }
            ]
          },
          {
            ar: "أَيُّكُمْ",
            bn: "তোমাদের কে",
            tr: "ayyukum",
            root: "أ-ي-ي",
            pattern: "أَفُّعُمْ",
            derived: [
              { word: "أَيّ", meaning: "কোন", pattern: "أَفّ" }
            ]
          },
          {
            ar: "أَحْسَنُ",
            bn: "সর্বোত্তম",
            tr: "ahsanu",
            root: "ح-س-ن",
            pattern: "أَفْعَل",
            derived: [
              { word: "حُسْن", meaning: "সৌন্দর্য", pattern: "فُعْل" },
              { word: "حَسَن", meaning: "সুন্দর", pattern: "فَعَل" },
              { word: "إِحْسَان", meaning: "উত্তম কাজ", pattern: "إِفْعَال" }
            ]
          },
          {
            ar: "عَمَلًا",
            bn: "কর্ম",
            tr: "ʿamalan",
            root: "ع-م-ل",
            pattern: "فَعَل",
            derived: [
              { word: "عَامِل", meaning: "কর্মী", pattern: "فَاعِل" },
              { word: "مَعْمُول", meaning: "কৃত কাজ", pattern: "مَفْعُول" }
            ]
          }
        ]
      }
    ]
  };
};

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  initializeElements();
  loadManifest();
  
  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (currentSurahData) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        nextLine();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        previousLine();
      }
    }
  });
});
