/* ==========================================================================
   Régie Chants — poste technicien (index.html)
   ========================================================================== */

(function () {
  "use strict";

  let songs = loadSongs();
  let selectedSongIndex = -1;   // chant actuellement ouvert dans le panneau de droite
  let liveSongIndex = -1;       // chant actuellement projeté
  let liveSlideIndex = -1;      // diapositive actuellement projetée (-1 = noir)
  let filterText = "";
  let editMode = false;         // édition des paroles du chant ouvert
  const saveTimers = {};        // debounce des modifications de texte, par index de diapo

  const channel = createChannel();

  const els = {
    songCount:         document.getElementById("songCount"),
    songList:          document.getElementById("songList"),
    songSearch:        document.getElementById("songSearch"),
    addSongBtn:        document.getElementById("addSongBtn"),
    reverseOrderBtn:   document.getElementById("reverseOrderBtn"),
    slidesArea:        document.getElementById("slidesArea"),
    openProjectionBtn: document.getElementById("openProjectionBtn"),
    blackoutBtn:       document.getElementById("blackoutBtn"),
    statusPill:        document.getElementById("statusPill"),
    livePreviewTitle:  document.getElementById("livePreviewTitle"),
    livePreviewText:   document.getElementById("livePreviewText"),
  };

  /* ---------------------------------------------------------------------- */
  /* Rendu : liste des chants                                               */
  /* ---------------------------------------------------------------------- */

  function renderSongList() {
    const q = filterText.trim().toLowerCase();
    const visible = songs
      .map((song, index) => ({ song, index }))
      .filter(({ song }) => !q || song.titre.toLowerCase().includes(q));

    els.songCount.textContent = songs.length;

    if (songs.length === 0) {
      els.songList.innerHTML =
        `<p class="empty-note">Aucun chant pour l'instant.<br>L'ajout de chants arrive prochainement.</p>`;
      return;
    }

    if (visible.length === 0) {
      els.songList.innerHTML = `<p class="empty-note">Aucun résultat pour « ${escapeHtml(filterText)} ».</p>`;
      return;
    }

    els.songList.innerHTML = "";
    visible.forEach(({ song, index }) => {
      const btn = document.createElement("button");
      btn.className = "song-item" + (index === selectedSongIndex ? " is-selected" : "");
      btn.innerHTML = `
        <span class="song-item__index">${String(index + 1).padStart(2, "0")}</span>
        <span class="song-item__title">${escapeHtml(song.titre)}</span>
        <span class="song-item__count">${song.paroles.length}</span>
      `;
      btn.addEventListener("click", () => selectSong(index));
      els.songList.appendChild(btn);
    });
  }

  function selectSong(index) {
    selectedSongIndex = index;
    editMode = false;
    renderSongList();
    renderSlides();
  }

  /** Inverse l'ordre des chants dans la liste de gauche, en conservant
   *  la sélection et l'état projeté (qui restent liés au même chant). */
  function reverseSongOrder() {
    const selectedSong = songs[selectedSongIndex] || null;
    const liveSong = songs[liveSongIndex] || null;

    songs = songs.slice().reverse();
    saveSongs(songs);

    selectedSongIndex = selectedSong ? songs.indexOf(selectedSong) : -1;
    liveSongIndex = liveSong ? songs.indexOf(liveSong) : -1;

    renderSongList();
  }

  /* ---------------------------------------------------------------------- */
  /* Rendu : diapositives du chant sélectionné                              */
  /* ---------------------------------------------------------------------- */

  function renderSlides() {
    if (selectedSongIndex === -1 || !songs[selectedSongIndex]) {
      els.slidesArea.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__glyph">♪</div>
          <div class="empty-state__title">Aucun chant sélectionné</div>
          <div class="empty-state__hint">Choisissez un chant dans la liste à gauche pour afficher ses paroles ici.</div>
        </div>`;
      return;
    }

    const song = songs[selectedSongIndex];

    const cards = song.paroles.map((text, i) => {
      const isLive = selectedSongIndex === liveSongIndex && i === liveSlideIndex;

      if (editMode) {
        return `
          <div class="slide-card slide-card--edit${isLive ? " is-live" : ""}" data-slide="${i}">
            <span class="slide-card__top">
              <span class="slide-card__num">DIAPO ${String(i + 1).padStart(2, "0")}</span>
              <button class="slide-card__delete" data-delete="${i}" title="Supprimer cette diapositive">×</button>
            </span>
            <textarea class="slide-card__textarea" data-edit="${i}" rows="4">${escapeHtml(text)}</textarea>
          </div>`;
      }

      return `
        <button class="slide-card${isLive ? " is-live" : ""}" data-slide="${i}">
          <span class="slide-card__top">
            <span class="slide-card__num">DIAPO ${String(i + 1).padStart(2, "0")}</span>
            ${isLive ? `<span class="live-tag">En direct</span>` : ""}
          </span>
          <span class="slide-card__text">${escapeHtml(text)}</span>
        </button>`;
    }).join("");

    const addCard = editMode
      ? `<button class="slide-card slide-card--add" id="addSlideBtn">
           <span class="slide-card--add__plus">+</span>
           <span>Ajouter une diapositive</span>
         </button>`
      : "";

    els.slidesArea.innerHTML = `
      <div class="slides-header">
        <span class="slides-header__title">${escapeHtml(song.titre)}</span>
        <span class="slides-header__right">
          <span class="slides-header__count">${song.paroles.length} diapositive${song.paroles.length > 1 ? "s" : ""}</span>
          <button class="btn" id="editModeBtn">${editMode ? "Terminer" : "Modifier"}</button>
        </span>
      </div>
      <div class="slides-scroll">
        <div class="slides-grid">${cards}${addCard}</div>
      </div>
    `;

    document.getElementById("editModeBtn").addEventListener("click", () => {
      editMode = !editMode;
      renderSlides();
    });

    if (editMode) {
      const addSlideBtn = document.getElementById("addSlideBtn");
      if (addSlideBtn) addSlideBtn.addEventListener("click", addSlide);

      els.slidesArea.querySelectorAll(".slide-card__textarea").forEach((ta) => {
        autoGrow(ta);
        ta.addEventListener("input", () => {
          autoGrow(ta);
          scheduleTextSave(Number(ta.dataset.edit), ta.value);
        });
      });

      els.slidesArea.querySelectorAll(".slide-card__delete").forEach((btn) => {
        btn.addEventListener("click", () => deleteSlide(Number(btn.dataset.delete)));
      });
    } else {
      els.slidesArea.querySelectorAll(".slide-card:not(.slide-card--add)").forEach((card) => {
        card.addEventListener("click", () => {
          projectSlide(selectedSongIndex, Number(card.dataset.slide));
        });
      });
    }
  }

  function autoGrow(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  }

  /* ---------------------------------------------------------------------- */
  /* Édition des paroles                                                    */
  /* ---------------------------------------------------------------------- */

  function scheduleTextSave(slideIndex, value) {
    window.clearTimeout(saveTimers[slideIndex]);
    saveTimers[slideIndex] = window.setTimeout(() => {
      const song = songs[selectedSongIndex];
      if (!song) return;
      song.paroles[slideIndex] = value;
      saveSongs(songs);

      // Le texte modifié est déjà à l'écran : on le met à jour sans coupure.
      if (selectedSongIndex === liveSongIndex && slideIndex === liveSlideIndex) {
        const state = {
          titre: song.titre,
          slideIndex,
          slideCount: song.paroles.length,
          text: value,
        };
        saveCurrent(state);
        channel.postMessage({ type: "show", state, silent: true });
        updateLivePreview(state);
      }
    }, 400);
  }

  function addSlide() {
    const song = songs[selectedSongIndex];
    if (!song) return;
    song.paroles.push("");
    saveSongs(songs);
    renderSlides();

    const grid = els.slidesArea.querySelector(".slides-grid");
    const newTextarea = grid.querySelector(`[data-edit="${song.paroles.length - 1}"]`);
    if (newTextarea) {
      newTextarea.focus();
      newTextarea.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  function deleteSlide(slideIndex) {
    const song = songs[selectedSongIndex];
    if (!song || song.paroles.length <= 1) return; // un chant garde toujours au moins une diapositive

    const wasLive = selectedSongIndex === liveSongIndex && slideIndex === liveSlideIndex;
    song.paroles.splice(slideIndex, 1);
    saveSongs(songs);

    if (wasLive) {
      blackout();
    } else if (selectedSongIndex === liveSongIndex && liveSlideIndex > slideIndex) {
      liveSlideIndex -= 1; // les diapositives suivantes ont glissé d'un cran
    }

    renderSlides();
  }

  /* ---------------------------------------------------------------------- */
  /* Projection                                                             */
  /* ---------------------------------------------------------------------- */

  function projectSlide(songIndex, slideIndex) {
    const song = songs[songIndex];
    if (!song || song.paroles[slideIndex] === undefined) return;

    liveSongIndex = songIndex;
    liveSlideIndex = slideIndex;

    const state = {
      titre: song.titre,
      slideIndex,
      slideCount: song.paroles.length,
      text: song.paroles[slideIndex],
    };

    saveCurrent(state);
    channel.postMessage({ type: "show", state });

    renderSlides();
    updateLivePreview(state);
  }

  function blackout() {
    liveSongIndex = -1;
    liveSlideIndex = -1;
    saveCurrent(null);
    channel.postMessage({ type: "blackout" });
    renderSlides();
    updateLivePreview(null);
  }

  function updateLivePreview(state) {
    if (!state) {
      els.statusPill.textContent = "à l'arrêt";
      els.statusPill.classList.remove("is-live");
      els.livePreviewTitle.textContent = "—";
      els.livePreviewText.textContent = "";
      return;
    }
    els.statusPill.textContent = "en direct";
    els.statusPill.classList.add("is-live");
    els.livePreviewTitle.textContent = state.titre;
    els.livePreviewText.textContent = state.text;
  }

  /* ---------------------------------------------------------------------- */
  /* Divers                                                                 */
  /* ---------------------------------------------------------------------- */

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  els.songSearch.addEventListener("input", (e) => {
    filterText = e.target.value;
    renderSongList();
  });

  els.blackoutBtn.addEventListener("click", blackout);
  els.reverseOrderBtn.addEventListener("click", reverseSongOrder);

  els.openProjectionBtn.addEventListener("click", () => {
    window.open("projection.html", "regie-chants-projection", "width=1280,height=720");
  });

  // Navigation clavier : ↑/↓ pour parcourir les diapositives du chant ouvert,
  // Échap pour couper. Ignoré si on tape dans un champ ou une zone de texte.
  document.addEventListener("keydown", (e) => {
    const tag = e.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (selectedSongIndex === -1 || editMode) return;
    const song = songs[selectedSongIndex];
    if (!song) return;

    if (e.key === "Escape") {
      blackout();
      return;
    }

    const isSameSong = liveSongIndex === selectedSongIndex;
    const cur = isSameSong ? liveSlideIndex : -1;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.min(cur + 1, song.paroles.length - 1);
      projectSlide(selectedSongIndex, next < 0 ? 0 : next);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = Math.max(cur - 1, 0);
      projectSlide(selectedSongIndex, prev);
    }
  });

  // Reflète l'état courant s'il existe déjà (ex. : rechargement de l'onglet).
  const existing = loadCurrent();
  if (existing) {
    const idx = songs.findIndex((s) => s.titre === existing.titre);
    if (idx !== -1) {
      liveSongIndex = idx;
      liveSlideIndex = existing.slideIndex;
    }
    updateLivePreview(existing);
  }

  renderSongList();
  renderSlides();
})();
