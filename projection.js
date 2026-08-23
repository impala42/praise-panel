/* ==========================================================================
   Régie Chants — page de projection (projection.html)
   ========================================================================== */

(function () {
  "use strict";

  const channel = createChannel();

  const stage        = document.getElementById("stage");
  const lyricsEl      = document.getElementById("stageLyrics");
  const metaEl        = document.getElementById("stageMeta");
  const fullscreenBtn = document.getElementById("fullscreenBtn");

  const FADE_MS = 350;
  let pendingState = null;
  let currentKey = null; // "titre::slideIndex" actuellement affiché, pour les mises à jour silencieuses

  /* ---------------------------------------------------------------------- */
  /* Affichage                                                              */
  /* ---------------------------------------------------------------------- */

  function show(state, silent) {
    if (!state) {
      currentKey = null;
      hideAll();
      return;
    }

    const key = state.titre + "::" + state.slideIndex;

    // Correction de texte sur la diapositive déjà à l'écran : on remplace
    // le texte sans coupure, plutôt que de refaire un fondu complet.
    if (silent && key === currentKey) {
      lyricsEl.textContent = state.text;
      metaEl.textContent = `${state.titre} · ${state.slideIndex + 1}/${state.slideCount}`;
      fitText();
      return;
    }

    currentKey = key;

    // Fondu enchaîné : on masque, on remplace le texte, on réaffiche.
    lyricsEl.classList.remove("is-visible");
    stage.classList.remove("is-empty");

    window.clearTimeout(pendingState);
    pendingState = window.setTimeout(() => {
      lyricsEl.textContent = state.text;
      metaEl.textContent = `${state.titre} · ${state.slideIndex + 1}/${state.slideCount}`;
      fitText();
      requestAnimationFrame(() => lyricsEl.classList.add("is-visible"));
    }, FADE_MS);
  }

  function hideAll() {
    lyricsEl.classList.remove("is-visible");
    window.clearTimeout(pendingState);
    pendingState = window.setTimeout(() => {
      stage.classList.add("is-empty");
    }, FADE_MS);
  }

  /** Réduit progressivement la taille du texte jusqu'à ce qu'il tienne
   *  dans la zone visible, pour que des paroles longues ne débordent pas. */
  function fitText() {
    let size = Math.round(window.innerWidth * 0.065); // point de départ
    const minSize = 18;
    lyricsEl.style.fontSize = size + "px";

    let guard = 0;
    while (
      guard++ < 60 &&
      size > minSize &&
      (lyricsEl.scrollHeight > lyricsEl.clientHeight + 2 ||
       lyricsEl.scrollWidth > lyricsEl.clientWidth + 2)
    ) {
      size -= 2;
      lyricsEl.style.fontSize = size + "px";
    }
  }

  window.addEventListener("resize", () => {
    if (lyricsEl.textContent) fitText();
  });

  /* ---------------------------------------------------------------------- */
  /* Synchronisation                                                        */
  /* ---------------------------------------------------------------------- */

  channel.onmessage = (event) => {
    const msg = event.data;
    if (!msg) return;
    if (msg.type === "show") show(msg.state, !!msg.silent);
    else if (msg.type === "blackout") { currentKey = null; hideAll(); }
  };

  // Filet de sécurité pour les environnements sans BroadcastChannel :
  // localStorage émet un évènement "storage" sur les autres onglets.
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_CURRENT_KEY) return;
    show(e.newValue ? JSON.parse(e.newValue) : null);
  });

  // État initial (onglet de projection ouvert après coup, ou rafraîchi).
  const initial = loadCurrent();
  if (initial) {
    currentKey = initial.titre + "::" + initial.slideIndex;
    lyricsEl.textContent = initial.text;
    metaEl.textContent = `${initial.titre} · ${initial.slideIndex + 1}/${initial.slideCount}`;
    stage.classList.remove("is-empty");
    fitText();
    requestAnimationFrame(() => lyricsEl.classList.add("is-visible"));
  }

  /* ---------------------------------------------------------------------- */
  /* Plein écran                                                            */
  /* ---------------------------------------------------------------------- */

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  fullscreenBtn.addEventListener("click", toggleFullscreen);
  stage.addEventListener("dblclick", toggleFullscreen);

  document.addEventListener("fullscreenchange", () => {
    fullscreenBtn.textContent = document.fullscreenElement ? "Quitter le plein écran" : "Plein écran";
  });
})();
