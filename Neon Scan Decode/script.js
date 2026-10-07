(() => {
  "use strict";

  const field = document.getElementById("password");
  const shell = document.getElementById("passwordShell");
  const layer = document.getElementById("glyphLayer");
  const toggle = document.getElementById("togglePassword");
  const toggleText = document.getElementById("toggleText");
  const stateText = document.getElementById("stateText");
  const liveStatus = document.getElementById("liveStatus");
  if (!field || !shell || !layer || !toggle) return;

  const MOTION = Object.freeze({ scanDuration: 980, glyphDuration: 260, stagger: 52 });
  const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789@$%&*?#";
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  let visible = false;
  let busy = false;

  const segment = (value) => {
    if (window.Intl?.Segmenter) {
      const s = new Intl.Segmenter(undefined, { granularity: "grapheme" });
      return [...s.segment(value)].map((item) => item.segment);
    }
    return Array.from(value);
  };
  const randomGlyph = () => CHARSET[Math.floor(Math.random() * CHARSET.length)];
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function syncUi() {
    shell.dataset.visible = String(visible);
    stateText.textContent = visible ? "VISIBLE" : "MASKED";
    toggleText.textContent = visible ? "Hide" : "Reveal";
    toggle.setAttribute("aria-label", visible ? "Hide password" : "Show password");
    toggle.setAttribute("aria-pressed", String(visible));
  }

  function immediate(targetVisible) {
    field.type = targetVisible ? "text" : "password";
    visible = targetVisible;
    syncUi();
    liveStatus.textContent = targetVisible ? "Password visible" : "Password hidden";
  }

  function buildLayer(characters, targetVisible) {
    layer.replaceChildren();
    const startingCharacters = targetVisible ? characters.map(() => "•") : characters;
    startingCharacters.forEach((character) => {
      const span = document.createElement("span");
      span.textContent = character;
      layer.append(span);
    });
  }

  async function scrambleCharacter(span, finalCharacter, delay) {
    await sleep(delay);
    span.classList.add("scrambling");
    const started = performance.now();
    while (performance.now() - started < MOTION.glyphDuration) {
      span.textContent = randomGlyph();
      await sleep(38);
    }
    span.textContent = finalCharacter;
    span.classList.remove("scrambling");
    span.classList.add("resolved");
  }

  async function animateToggle(targetVisible) {
    if (busy) return;
    const characters = segment(field.value);
    if (!characters.length) {
      immediate(targetVisible);
      return;
    }
    if (reduceMotion?.matches) {
      immediate(targetVisible);
      return;
    }

    busy = true;
    toggle.disabled = true;
    shell.setAttribute("aria-busy", "true");
    shell.classList.toggle("is-hiding", !targetVisible);
    buildLayer(characters, targetVisible);
    field.classList.add("is-ghosted");
    layer.classList.add("is-active");
    void shell.offsetWidth;
    shell.classList.add("is-scanning");

    const spans = [...layer.children];
    const order = targetVisible ? spans : [...spans].reverse();
    const final = targetVisible ? characters : characters.map(() => "•");
    const finalInOrder = targetVisible ? final : [...final].reverse();
    const jobs = order.map((span, index) => scrambleCharacter(span, finalInOrder[index], 100 + index * MOTION.stagger));

    await Promise.all(jobs);
    await sleep(Math.max(0, MOTION.scanDuration - (100 + characters.length * MOTION.stagger)));

    field.type = targetVisible ? "text" : "password";
    visible = targetVisible;
    field.classList.remove("is-ghosted");
    layer.classList.remove("is-active");
    shell.classList.remove("is-scanning", "is-hiding");
    shell.setAttribute("aria-busy", "false");
    toggle.disabled = false;
    busy = false;
    syncUi();
    liveStatus.textContent = visible ? "Password visible" : "Password hidden";
  }

  toggle.addEventListener("click", () => animateToggle(!visible));
  syncUi();
})();
