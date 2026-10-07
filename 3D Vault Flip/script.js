(() => {
  "use strict";
  const field = document.getElementById("password");
  const shell = document.getElementById("passwordShell");
  const layer = document.getElementById("tileLayer");
  const toggle = document.getElementById("togglePassword");
  const toggleText = document.getElementById("toggleText");
  const stateText = document.getElementById("stateText");
  const liveStatus = document.getElementById("liveStatus");
  if (!field || !layer || !toggle || !shell) return;

  const MOTION = Object.freeze({ flipDuration: 520, stagger: 64, settle: 110 });
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  let visible = false;
  let busy = false;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const segment = (value) => window.Intl?.Segmenter
    ? [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value)].map((x) => x.segment)
    : Array.from(value);

  function syncUi() {
    stateText.textContent = visible ? "UNLOCKED" : "LOCKED";
    toggleText.textContent = visible ? "Lock" : "Unlock";
    toggle.setAttribute("aria-label", visible ? "Hide password" : "Show password");
    toggle.setAttribute("aria-pressed", String(visible));
  }

  function immediate(target) {
    field.type = target ? "text" : "password";
    visible = target;
    syncUi();
    liveStatus.textContent = target ? "Password visible" : "Password hidden";
  }

  function makeTile(frontCharacter, backCharacter) {
    const tile = document.createElement("span");
    tile.className = "tile";
    const front = document.createElement("span");
    front.className = "face front";
    front.textContent = frontCharacter;
    const back = document.createElement("span");
    back.className = "face back";
    back.textContent = backCharacter;
    tile.append(front, back);
    return tile;
  }

  async function animateToggle(targetVisible) {
    if (busy) return;
    const chars = segment(field.value);
    if (!chars.length || reduceMotion?.matches) {
      immediate(targetVisible);
      return;
    }

    busy = true;
    toggle.disabled = true;
    shell.setAttribute("aria-busy", "true");
    layer.replaceChildren();
    chars.forEach((character) => layer.append(makeTile(targetVisible ? "•" : character, targetVisible ? character : "•")));
    field.classList.add("is-ghosted");
    layer.classList.add("is-active");

    const tiles = [...layer.children];
    const center = (tiles.length - 1) / 2;
    const ordered = tiles
      .map((tile, index) => ({ tile, distance: Math.abs(index - center), index }))
      .sort((a, b) => a.distance - b.distance || a.index - b.index);

    ordered.forEach(({ tile }, orderIndex) => {
      setTimeout(() => tile.classList.add("is-flipped"), orderIndex * MOTION.stagger);
    });

    await sleep(MOTION.flipDuration + (tiles.length - 1) * MOTION.stagger + MOTION.settle);
    field.type = targetVisible ? "text" : "password";
    visible = targetVisible;
    field.classList.remove("is-ghosted");
    layer.classList.remove("is-active");
    layer.replaceChildren();
    shell.setAttribute("aria-busy", "false");
    toggle.disabled = false;
    busy = false;
    syncUi();
    liveStatus.textContent = visible ? "Password visible" : "Password hidden";
  }

  toggle.addEventListener("click", () => animateToggle(!visible));
  syncUi();
})();
