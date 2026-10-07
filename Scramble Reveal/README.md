# Password Reveal Animation — Type 1

A dependency-free password reveal interaction that displays a short random-character **decrypting** sequence before showing the real password.

> [!NOTE]
> The scramble is a visual effect, not encryption. Random characters are rendered in a separate overlay and never replace the real password value.

## Run the demo

Open [`index.html`](./index.html) directly in a modern browser. The sample password `Secure@2026` is included for immediate testing.

## Animation configuration

The animation values are defined near the top of [`script.js`](./script.js):

```javascript
const CHARACTER_SET =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:\",.<>?";

const SCRAMBLE_LENGTH = 16;
const TOTAL_FRAMES = 20;
const FRAME_DELAY = 100;

const reducedMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
```

| Setting | Default | Purpose |
| --- | ---: | --- |
| `CHARACTER_SET` | Letters, numbers, symbols | Characters available to each random frame |
| `SCRAMBLE_LENGTH` | `16` | Number of characters displayed in one frame |
| `TOTAL_FRAMES` | `20` | Number of frames before the password appears |
| `FRAME_DELAY` | `100` ms | Delay between frame updates |
| Reduced motion | Immediate | Skips the scramble and reveals directly |

The first frame appears immediately. The remaining frames update every 100 ms, and the reveal completes after approximately two seconds.

## Animation markup

This is the markup directly involved in the reveal interaction:

```html
<div id="passwordShell"
     class="password-shell"
     data-state="hidden"
     aria-busy="false">
    <div class="password-viewport">
        <input
            id="password"
            type="password"
            value="Secure@2026"
            autocomplete="off"
            spellcheck="false"
        >

        <span id="scrambleText"
              class="scramble-text"
              aria-hidden="true"></span>
    </div>

    <button
        id="togglePassword"
        class="toggle-password"
        type="button"
        aria-label="Show password"
        aria-controls="password"
        aria-pressed="false">
        <span class="icon-stack" aria-hidden="true">
            <svg class="eye-icon" viewBox="0 0 24 24">
                <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                <circle cx="12" cy="12" r="2.7" />
            </svg>

            <svg class="eye-off-icon" viewBox="0 0 24 24">
                <path d="m3 3 18 18" />
                <path d="M10.6 6.1A9.8 9.8 0 0 1 12 6c6 0 9.5 6 9.5 6a15 15 0 0 1-2.1 2.8M6.5 6.6C3.9 8.3 2.5 12 2.5 12s3.5 6 9.5 6a9.7 9.7 0 0 0 3.2-.5" />
                <path d="M10.1 10.1a2.7 2.7 0 0 0 3.8 3.8" />
            </svg>
        </span>
    </button>
</div>

<p id="passwordMessage"
   class="password-message"
   role="status"
   aria-live="polite"
   aria-hidden="true">
    <span class="status-dot" aria-hidden="true"></span>
    <span class="message-text"></span>
</p>

<span id="liveAnnouncement"
      class="sr-only"
      aria-live="polite"></span>
```

## Scramble-animation CSS

Only the styles responsible for the scramble overlay, icon transition, and activity indicators are shown here:

```css
.scramble-text {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    padding: 0 0.25rem 0 1rem;
    overflow: hidden;
    background: #f8fbff;
    color: var(--blue-700);
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
    font-size: 0.93rem;
    font-weight: 700;
    letter-spacing: 0.035em;
    opacity: 0;
    pointer-events: none;
    white-space: nowrap;
    transition: opacity 120ms ease;
}

.password-shell[data-state="decrypting"] .scramble-text {
    opacity: 1;
}

.password-shell[data-state="decrypting"] .scramble-text::after {
    width: 2px;
    height: 1.25rem;
    margin-left: 0.3rem;
    background: var(--cyan-400);
    content: "";
    animation: cursor-blink 480ms steps(1) infinite;
}

.icon-stack svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    fill: none;
    stroke: currentColor;
    transition: opacity 220ms ease, transform 300ms ease;
}

.eye-off-icon {
    opacity: 0;
    transform: rotate(-90deg) scale(0.72);
}

.password-shell:not([data-state="hidden"]) .eye-icon {
    opacity: 0;
    transform: rotate(90deg) scale(0.72);
}

.password-shell:not([data-state="hidden"]) .eye-off-icon {
    opacity: 1;
    transform: rotate(0) scale(1);
}

.password-shell[data-state="decrypting"] .toggle-password::after {
    position: absolute;
    width: 2rem;
    height: 2rem;
    border: 2px solid transparent;
    border-top-color: var(--cyan-400);
    border-radius: 50%;
    content: "";
    animation: spin 850ms linear infinite;
}

.password-message {
    opacity: 0;
    transform: translateY(-0.2rem);
    transition: opacity 220ms ease, transform 220ms ease;
}

.password-message.is-visible {
    opacity: 1;
    transform: translateY(0);
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

@keyframes cursor-blink {
    50% {
        opacity: 0;
    }
}

@media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}
```

## Component states

The script uses three presentation states:

- `hidden` — the password is masked
- `decrypting` — the random-character overlay is active
- `revealed` — the real password is visible

During `decrypting`, the input becomes read-only and `aria-busy` becomes `true`. Clicking again cancels the animation and hides the password immediately. Leaving the page also restores the hidden state.

## Project files

- [`index.html`](./index.html) — complete demo markup
- [`style.css`](./style.css) — full page and animation styling
- [`script.js`](./script.js) — complete interaction logic

The README intentionally contains only animation-related excerpts and configuration. The complete source remains in the files above.
