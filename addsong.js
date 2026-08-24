/* ==========================================================================
   Régie Chants — fenêtre « Ajouter un chant » (index.html)
   Deux sources : une page web (extraction par IA) ou un passage biblique.
   ========================================================================== */

(function () {
  "use strict";

  const els = {
    openBtn:      document.getElementById("addSongBtn"),
    overlay:      document.getElementById("addSongOverlay"),
    closeBtn:     document.getElementById("addSongClose"),
    tabs:         document.querySelectorAll(".modal__tab"),
    panels:       document.querySelectorAll(".modal__panel"),

    urlForm:      document.getElementById("urlForm"),
    urlTitle:     document.getElementById("urlTitleInput"),
    urlLink:      document.getElementById("urlLinkInput"),
    urlStatus:    document.getElementById("urlStatus"),
    urlSubmitBtn: document.getElementById("urlSubmitBtn"),

    bibleForm:        document.getElementById("bibleForm"),
    bibleBookSelect:  document.getElementById("bibleBookSelect"),
    bibleChapter:     document.getElementById("bibleChapterInput"),
    bibleVerseStart:  document.getElementById("bibleVerseStartInput"),
    bibleVerseEnd:    document.getElementById("bibleVerseEndInput"),
    bibleTranslation: document.getElementById("bibleTranslationSelect"),
    bibleStatus:      document.getElementById("bibleStatus"),
    bibleSubmitBtn:   document.getElementById("bibleSubmitBtn"),
  };

  /* ---------------------------------------------------------------------- */
  /* Ouverture / fermeture de la fenêtre                                    */
  /* ---------------------------------------------------------------------- */

  function openModal() {
    els.overlay.hidden = false;
    els.urlTitle.focus();
  }

  function closeModal() {
    els.overlay.hidden = true;
    resetStatus(els.urlStatus);
    resetStatus(els.bibleStatus);
  }

  els.openBtn.addEventListener("click", openModal);
  els.closeBtn.addEventListener("click", closeModal);
  els.overlay.addEventListener("click", (e) => {
    if (e.target === els.overlay) closeModal();
  });

  // Capturée avant l'écouteur clavier global de control.js (raccourci Échap),
  // pour que fermer la fenêtre ne coupe pas la projection en cours.
  document.addEventListener(
    "keydown",
    (e) => {
      if (!els.overlay.hidden && e.key === "Escape") {
        closeModal();
        e.stopPropagation();
      }
    },
    true
  );

  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      els.tabs.forEach((t) => t.classList.toggle("is-active", t === tab));
      els.panels.forEach((p) => (p.hidden = p.dataset.panel !== tab.dataset.tab));
    });
  });

  /* ---------------------------------------------------------------------- */
  /* Statut (chargement / erreur / succès)                                  */
  /* ---------------------------------------------------------------------- */

  function setStatus(el, text, kind) {
    el.textContent = text;
    el.className = "modal__status" + (kind ? " modal__status--" + kind : "");
  }
  function resetStatus(el) { setStatus(el, "", null); }

  function htmlToPlainText(html) {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent.replace(/\s+/g, " ").trim();
  }

  /* ---------------------------------------------------------------------- */
  /* Onglet « passage biblique » — API bolls.life (sans clé)                */
  /* ---------------------------------------------------------------------- */

  BIBLE_BOOKS.forEach((book) => {
    const opt = document.createElement("option");
    opt.value = String(book.id);
    opt.textContent = book.name;
    els.bibleBookSelect.appendChild(opt);
  });

  els.bibleBookSelect.addEventListener("change", () => {
    const book = BIBLE_BOOKS.find((b) => b.id === Number(els.bibleBookSelect.value));
    if (book) els.bibleChapter.max = String(book.chapters);
  });
  els.bibleBookSelect.dispatchEvent(new Event("change"));

  els.bibleForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const book = BIBLE_BOOKS.find((b) => b.id === Number(els.bibleBookSelect.value));
    const chapter = Number(els.bibleChapter.value);
    const verseStart = Number(els.bibleVerseStart.value);
    const verseEnd = Number(els.bibleVerseEnd.value);
    const translation = els.bibleTranslation.value;

    if (!book || !chapter || !verseStart || !verseEnd) {
      setStatus(els.bibleStatus, "Merci de remplir tous les champs.", "error");
      return;
    }
    if (verseEnd < verseStart) {
      setStatus(els.bibleStatus, "Le verset de fin doit suivre le verset de début.", "error");
      return;
    }

    els.bibleSubmitBtn.disabled = true;
    setStatus(els.bibleStatus, "Récupération du passage…", "loading");

    try {
      const url = `https://bolls.life/get-text/${translation}/${book.id}/${chapter}/`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const verses = await response.json();
      if (!Array.isArray(verses) || verses.length === 0) {
        throw new Error("Chapitre introuvable pour cette traduction.");
      }

      const selected = verses.filter((v) => v.verse >= verseStart && v.verse <= verseEnd);
      if (selected.length === 0) {
        throw new Error(`Aucun verset entre ${verseStart} et ${verseEnd} dans ce chapitre.`);
      }

      const text = selected.map((v) => htmlToPlainText(v.text)).join("\n");
      const lastVerse = selected[selected.length - 1].verse;
      const reference = verseStart === lastVerse
        ? `${book.name} ${chapter}:${verseStart}`
        : `${book.name} ${chapter}:${verseStart}-${lastVerse}`;

      window.RegieChantsControl.addSong({ titre: reference, paroles: [text] });
      setStatus(els.bibleStatus, "Passage ajouté.", "success");
      closeModal();
      els.bibleForm.reset();
      els.bibleBookSelect.dispatchEvent(new Event("change"));
    } catch (err) {
      console.error(err);
      setStatus(els.bibleStatus, "Impossible de récupérer ce passage. " + err.message, "error");
    } finally {
      els.bibleSubmitBtn.disabled = false;
    }
  });

  /* ---------------------------------------------------------------------- */
  /* Découpage des strophes trop longues (import URL uniquement)            */
  /* ---------------------------------------------------------------------- */

  const MAX_WORDS_PER_SLIDE = 20;

  function wordCount(str) {
    return (str.match(/\S+/g) || []).length;
  }

  /** Découpe un bloc de texte trop long en diapositives, en priorité sur
   *  les retours à la ligne, puis sur la ponctuation de fin de phrase,
   *  et en dernier recours par nombre de mots. */
  function splitStropheIntoSlides(text, maxWords) {
    const trimmed = text.trim();
    if (wordCount(trimmed) <= maxWords) return [trimmed];

    const lines = trimmed.split("\n").map((s) => s.trim()).filter(Boolean);
    if (lines.length > 1) return groupIntoChunks(lines, "\n", maxWords);

    const sentences = trimmed
      .split(/(?<=[.!?;])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (sentences.length > 1) return groupIntoChunks(sentences, " ", maxWords);

    // Dernier recours : aucune ligne ni ponctuation exploitable, on tranche
    // simplement par paquets de mots.
    const words = trimmed.match(/\S+/g) || [];
    const out = [];
    for (let i = 0; i < words.length; i += maxWords) {
      out.push(words.slice(i, i + maxWords).join(" "));
    }
    return out;
  }

  /** Regroupe des fragments (lignes ou phrases) en diapositives d'au plus
   *  `maxWords` mots, sans jamais couper un fragment qui tient seul ;
   *  un fragment lui-même trop long est redécoupé récursivement. */
  function groupIntoChunks(pieces, joiner, maxWords) {
    const slides = [];
    let current = [];
    let currentWords = 0;

    function flush() {
      if (current.length) {
        slides.push(current.join(joiner));
        current = [];
        currentWords = 0;
      }
    }

    pieces.forEach((piece) => {
      const pieceWords = wordCount(piece);

      if (pieceWords > maxWords) {
        flush();
        slides.push(...splitStropheIntoSlides(piece, maxWords));
        return;
      }

      if (current.length > 0 && currentWords + pieceWords > maxWords) flush();
      current.push(piece);
      currentWords += pieceWords;
    });
    flush();

    return slides;
  }

  /* ---------------------------------------------------------------------- */
  /* Onglet « URL » — lecture de page (Jina Reader) + extraction par IA     */
  /* ---------------------------------------------------------------------- */

  async function getPageContent(url) {
    const response = await fetch("https://r.jina.ai/" + url, {
      headers: { "X-Respond-With": "text" },
    });
    if (!response.ok) throw new Error(`Lecteur de page : HTTP ${response.status}`);
    return await response.text();
  }

  async function askLLM(prompt) {
    const response = await fetch("https://api.llm7.io/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "codestral-latest",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!response.ok) throw new Error(`Assistant IA : HTTP ${response.status}`);
    const data = await response.json();
    return data.choices[0].message.content;
  }

  els.urlForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const titre = els.urlTitle.value.trim();
    const lien = els.urlLink.value.trim();
    if (!titre || !lien) {
      setStatus(els.urlStatus, "Merci de remplir le titre et l'URL.", "error");
      return;
    }

    els.urlSubmitBtn.disabled = true;

    try {
      setStatus(els.urlStatus, "Lecture de la page…", "loading");
      const paroles_brut = await getPageContent(lien);

      setStatus(els.urlStatus, "Extraction des paroles…", "loading");
      const prompt =
        'Renvoie un json et seulement un json, sans aucun commentaire. ' +
        'Il contiendra la clé "strophes" associée à une liste où chaque élément ' +
        'est une chaine de caractère qui correspond à une strophe/refrain/pont ' +
        'du chant présent dans le texte suivant : \n\n' + paroles_brut;
      const paroles_txt = await askLLM(prompt);

      const cleaned = paroles_txt.replace(/^```json\s*/, "").replace(/\s*```$/, "").trim();
      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch (parseErr) {
        throw new Error("Réponse inattendue de l'assistant IA.");
      }

      const strophes = parsed && parsed.strophes;
      if (!Array.isArray(strophes) || strophes.length === 0) {
        throw new Error("Aucune parole détectée sur cette page.");
      }

      // Les strophes de plus de 20 mots sont réparties sur plusieurs diapositives :
      // en priorité sur les retours à la ligne, puis sur la ponctuation, puis par mots.
      const paroles = strophes.flatMap((s) => splitStropheIntoSlides(String(s), MAX_WORDS_PER_SLIDE));

      window.RegieChantsControl.addSong({ titre, paroles });
      setStatus(els.urlStatus, "Chant ajouté.", "success");
      closeModal();
      els.urlForm.reset();
    } catch (err) {
      console.error(err);
      setStatus(els.urlStatus, "Échec de la récupération. " + err.message, "error");
    } finally {
      els.urlSubmitBtn.disabled = false;
    }
  });
})();
