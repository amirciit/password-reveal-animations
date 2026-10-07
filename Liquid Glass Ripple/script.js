(() => {
  "use strict";
  const field = document.getElementById("password");
  const shell = document.getElementById("passwordShell");
  const baseText = document.getElementById("baseText");
  const targetText = document.getElementById("targetText");
  const toggle = document.getElementById("togglePassword");
  const toggleText = document.getElementById("toggleText");
  const stateText = document.getElementById("stateText");
  const liveStatus = document.getElementById("liveStatus");
  if (!field || !shell || !baseText || !targetText || !toggle) return;

  const MOTION = Object.freeze({ rippleDuration: 900, settle: 80 });
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  let visible = false;
  let busy = false;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const segment = (value) => window.Intl?.Segmenter
    ? [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value)].map((x) => x.segment)
    : Array.from(value);

  function syncUi() {
    stateText.textContent = visible ? "Visible" : "Private";
    toggleText.textContent = visible ? "Hide" : "Reveal";
    toggle.setAttribute("aria-label", visible ? "Hide password" : "Show password");
    toggle.setAttribute("aria-pressed", String(visible));
  }

  function immediate(target) {
    field.type = target ? "text" : "password";
    visible = target;
    syncUi();
    liveStatus.textContent = target ? "Password visible" : "Password hidden";
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
    const bullets = chars.map(() => "•").join("");
    const plain = chars.join("");
    baseText.textContent = targetVisible ? bullets : plain;
    targetText.textContent = targetVisible ? plain : bullets;
    baseText.classList.add("is-active");
    targetText.classList.add("is-active");
    field.classList.add("is-ghosted");
    shell.classList.toggle("is-hiding", !targetVisible);
    void shell.offsetWidth;
    shell.classList.add("is-rippling");

    await sleep(MOTION.rippleDuration + MOTION.settle);
    field.type = targetVisible ? "text" : "password";
    visible = targetVisible;
    shell.classList.remove("is-rippling", "is-hiding");
    field.classList.remove("is-ghosted");
    baseText.classList.remove("is-active");
    targetText.classList.remove("is-active");
    baseText.textContent = "";
    targetText.textContent = "";
    shell.setAttribute("aria-busy", "false");
    toggle.disabled = false;
    busy = false;
    syncUi();
    liveStatus.textContent = visible ? "Password visible" : "Password hidden";
  }

  toggle.addEventListener("click", () => animateToggle(!visible));
  syncUi();
})();
