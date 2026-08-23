/* ==========================================================================
   Régie Chants — couche de données partagée
   Utilisée par control.js (onglet technicien) et projection.js (plein écran)
   ========================================================================== */

const STORAGE_SONGS_KEY   = "regieChants.songs.v1";
const STORAGE_CURRENT_KEY = "regieChants.current.v1";
const CHANNEL_NAME        = "regie-chants-channel";

/* Jeu de démonstration — deux chants du domaine public, à remplacer par les
   vôtres. Chaque "parole" du tableau correspond à une diapositive projetée. */
const SEED_SONGS = [
  {
    titre: "Amazing Grace",
    paroles: [
      "Amazing grace! How sweet the sound\nThat saved a wretch like me!\nI once was lost, but now am found;\nWas blind, but now I see.",
      "'Twas grace that taught my heart to fear,\nAnd grace my fears relieved;\nHow precious did that grace appear\nThe hour I first believed.",
      "Through many dangers, toils, and snares,\nI have already come;\n'Tis grace hath brought me safe thus far,\nAnd grace will lead me home."
    ]
  },
  {
    titre: "Il est né le divin enfant",
    paroles: [
      "Il est né le divin enfant,\nJouez hautbois, résonnez musettes.\nIl est né le divin enfant,\nChantons tous son avènement.",
      "Depuis plus de quatre mille ans,\nNous le promettaient les prophètes,\nDepuis plus de quatre mille ans,\nNous attendions cet heureux temps.",
      "Une étable est son logement,\nUn peu de paille est sa couchette,\nUne étable est son logement\nPour un Dieu quel abaissement !"
    ]
  }
];

/** Charge la liste des chants depuis localStorage, l'initialise si absente. */
function loadSongs() {
  try {
    const raw = localStorage.getItem(STORAGE_SONGS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_SONGS_KEY, JSON.stringify(SEED_SONGS));
      return structuredClone(SEED_SONGS);
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Lecture des chants impossible :", e);
    return [];
  }
}

/** Persiste la liste des chants dans localStorage. */
function saveSongs(songs) {
  try {
    localStorage.setItem(STORAGE_SONGS_KEY, JSON.stringify(songs));
    return true;
  } catch (e) {
    console.error("Écriture des chants impossible :", e);
    return false;
  }
}

/** Lit le dernier état projeté (pour qu'une projection ouverte plus tard
 *  ou rafraîchie retrouve immédiatement l'affichage en cours). */
function loadCurrent() {
  try {
    const raw = localStorage.getItem(STORAGE_CURRENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveCurrent(state) {
  try {
    localStorage.setItem(STORAGE_CURRENT_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Écriture de l'état courant impossible :", e);
  }
}

/* Les 66 livres bibliques, dans l'ordre standard, avec leur identifiant
 * numérique tel qu'utilisé par l'API bolls.life et leur nombre de chapitres
 * (utilisé pour la fenêtre d'ajout d'un chant à partir d'un passage). */
const BIBLE_BOOKS = [
  { id: 1,  name: "Genèse",                 chapters: 50 },
  { id: 2,  name: "Exode",                  chapters: 40 },
  { id: 3,  name: "Lévitique",              chapters: 27 },
  { id: 4,  name: "Nombres",                chapters: 36 },
  { id: 5,  name: "Deutéronome",            chapters: 34 },
  { id: 6,  name: "Josué",                  chapters: 24 },
  { id: 7,  name: "Juges",                  chapters: 21 },
  { id: 8,  name: "Ruth",                   chapters: 4  },
  { id: 9,  name: "1 Samuel",               chapters: 31 },
  { id: 10, name: "2 Samuel",               chapters: 24 },
  { id: 11, name: "1 Rois",                 chapters: 22 },
  { id: 12, name: "2 Rois",                 chapters: 25 },
  { id: 13, name: "1 Chroniques",           chapters: 29 },
  { id: 14, name: "2 Chroniques",           chapters: 36 },
  { id: 15, name: "Esdras",                 chapters: 10 },
  { id: 16, name: "Néhémie",                chapters: 13 },
  { id: 17, name: "Esther",                 chapters: 10 },
  { id: 18, name: "Job",                    chapters: 42 },
  { id: 19, name: "Psaumes",                chapters: 150 },
  { id: 20, name: "Proverbes",              chapters: 31 },
  { id: 21, name: "Ecclésiaste",            chapters: 12 },
  { id: 22, name: "Cantique des cantiques", chapters: 8  },
  { id: 23, name: "Ésaïe",                  chapters: 66 },
  { id: 24, name: "Jérémie",                chapters: 52 },
  { id: 25, name: "Lamentations",           chapters: 5  },
  { id: 26, name: "Ézéchiel",               chapters: 48 },
  { id: 27, name: "Daniel",                 chapters: 12 },
  { id: 28, name: "Osée",                   chapters: 14 },
  { id: 29, name: "Joël",                   chapters: 3  },
  { id: 30, name: "Amos",                   chapters: 9  },
  { id: 31, name: "Abdias",                 chapters: 1  },
  { id: 32, name: "Jonas",                  chapters: 4  },
  { id: 33, name: "Michée",                 chapters: 7  },
  { id: 34, name: "Nahum",                  chapters: 3  },
  { id: 35, name: "Habacuc",                chapters: 3  },
  { id: 36, name: "Sophonie",               chapters: 3  },
  { id: 37, name: "Aggée",                  chapters: 2  },
  { id: 38, name: "Zacharie",               chapters: 14 },
  { id: 39, name: "Malachie",               chapters: 4  },
  { id: 40, name: "Matthieu",               chapters: 28 },
  { id: 41, name: "Marc",                   chapters: 16 },
  { id: 42, name: "Luc",                    chapters: 24 },
  { id: 43, name: "Jean",                   chapters: 21 },
  { id: 44, name: "Actes",                  chapters: 28 },
  { id: 45, name: "Romains",                chapters: 16 },
  { id: 46, name: "1 Corinthiens",          chapters: 16 },
  { id: 47, name: "2 Corinthiens",          chapters: 13 },
  { id: 48, name: "Galates",                chapters: 6  },
  { id: 49, name: "Éphésiens",              chapters: 6  },
  { id: 50, name: "Philippiens",            chapters: 4  },
  { id: 51, name: "Colossiens",             chapters: 4  },
  { id: 52, name: "1 Thessaloniciens",      chapters: 5  },
  { id: 53, name: "2 Thessaloniciens",      chapters: 3  },
  { id: 54, name: "1 Timothée",             chapters: 6  },
  { id: 55, name: "2 Timothée",             chapters: 4  },
  { id: 56, name: "Tite",                   chapters: 3  },
  { id: 57, name: "Philémon",               chapters: 1  },
  { id: 58, name: "Hébreux",                chapters: 13 },
  { id: 59, name: "Jacques",                chapters: 5  },
  { id: 60, name: "1 Pierre",               chapters: 5  },
  { id: 61, name: "2 Pierre",               chapters: 3  },
  { id: 62, name: "1 Jean",                 chapters: 5  },
  { id: 63, name: "2 Jean",                 chapters: 1  },
  { id: 64, name: "3 Jean",                 chapters: 1  },
  { id: 65, name: "Jude",                   chapters: 1  },
  { id: 66, name: "Apocalypse",             chapters: 22 },
];

function countWords(str) {
  return str.trim().split(/\s+/).filter(Boolean).length;
}

/** Découpe une strophe trop longue en plusieurs diapositives, en coupant
 *  de préférence sur la ponctuation (fin de phrase, virgule, retour à la
 *  ligne) plutôt qu'au milieu d'une proposition. Utilisé à l'import depuis
 *  une URL, où l'IA peut renvoyer de longs blocs de texte en une strophe. */
function splitStropheIntoSlides(text, maxWords = 20) {
  const trimmed = text.trim();
  if (!trimmed || countWords(trimmed) <= maxWords) return [trimmed];

  // 1) Découpe en clauses en s'appuyant sur la ponctuation et les retours à la ligne.
  const clauses = (trimmed.match(/[^.!?;:,\n]+[.!?;:,\n]*/g) || [trimmed])
    .map((c) => c.trim())
    .filter(Boolean);

  // 2) Les clauses trop longues (peu ou pas de ponctuation) sont redécoupées mot à mot.
  const pieces = [];
  clauses.forEach((clause) => {
    const words = clause.split(/\s+/).filter(Boolean);
    if (words.length <= maxWords) {
      pieces.push(clause);
    } else {
      for (let i = 0; i < words.length; i += maxWords) {
        pieces.push(words.slice(i, i + maxWords).join(" "));
      }
    }
  });

  // 3) Regroupe les morceaux successifs tant que la limite n'est pas dépassée.
  const slides = [];
  let current = "";
  let currentWords = 0;
  pieces.forEach((piece) => {
    const pieceWords = countWords(piece);
    if (currentWords > 0 && currentWords + pieceWords > maxWords) {
      slides.push(current.trim());
      current = "";
      currentWords = 0;
    }
    current += (current ? " " : "") + piece;
    currentWords += pieceWords;
  });
  if (current) slides.push(current.trim());

  return slides;
}

/** Petit utilitaire autour de BroadcastChannel pour la synchro temps réel
 *  entre l'onglet technicien et l'onglet de projection. Retombe sur un
 *  simple no-op si l'API n'est pas disponible. */
function createChannel() {
  if ("BroadcastChannel" in window) {
    return new BroadcastChannel(CHANNEL_NAME);
  }
  return { postMessage() {}, close() {}, onmessage: null };
}
