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

/** Petit utilitaire autour de BroadcastChannel pour la synchro temps réel
 *  entre l'onglet technicien et l'onglet de projection. Retombe sur un
 *  simple no-op si l'API n'est pas disponible. */
function createChannel() {
  if ("BroadcastChannel" in window) {
    return new BroadcastChannel(CHANNEL_NAME);
  }
  return { postMessage() {}, close() {}, onmessage: null };
}
