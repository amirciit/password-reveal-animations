# Password Reveal Animation — Type 2

A dependency-free password reveal interaction using a bold **redaction wipe**. A solid `PRIVATE` band covers the field, changes password visibility at the covered midpoint, and exits to reveal the final state.

## Run the demo

Open [`index.html`](./index.html) directly in a modern browser. No installation or build step is required.

## Animation configuration

The JavaScript timing values are defined near the top of [`script.js`](./script.js):

```javascript
const WIPE_DURATION = 760;
const TYPE_SWITCH_DELAY = WIPE_DURATION / 2;
const motionPreference = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)"
);
```

The matching CSS duration is defined in [`style.css`](./style.css):

```css
:root {
    --wipe-duration: 760ms;
}
```

Keep `WIPE_DURATION` and `--wipe-duration` synchronized when changing the speed.

| Setting | Default | Purpose |
| --- | ---: | --- |
| `WIPE_DURATION` | `760` ms | Total time for the band to enter, cover, and exit |
| `TYPE_SWITCH_DELAY` | `380` ms | Covered midpoint where the input type changes |
| `--wipe-duration` | `760ms` | CSS animation duration |
| Reduced motion | Immediate | Skips the wipe and changes visibility directly |

## Animation markup

This is the markup directly involved in the password animation:

```html
<div id="passwordShell"
     class="password-shell"
     data-state="hidden"
     aria-busy="false">
    <input
        id="password"
        type="password"
        value="Paper&amp;Ink#26"
        autocomplete="off"
        spellcheck="false"
    >

    <div id="redactionBand"
         class="redaction-band"
         aria-hidden="true">
        <span>Private</span>
        <span>Private</span>
        <span>Private</span>
    </div>
</div>

<button
    id="togglePassword"
    class="visibility-toggle"
    type="button"
    aria-controls="password"
    aria-label="Show password"
    aria-pressed="false">
    <span class="toggle-copy">
        <small>Password view</small>
        <strong id="toggleAction">Reveal</strong>
    </span>

    <span class="switch-track" aria-hidden="true">
        <span class="switch-thumb">+</span>
    </span>
</button>

<span id="liveStatus" class="sr-only" aria-live="polite"></span>
```

## Redaction-wipe CSS

Only the styles that create and run the wipe are shown here:

```css
.password-shell {
    position: relative;
    overflow: hidden;
}

.redaction-band {
    position: absolute;
    z-index: 3;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: space-around;
    gap: 1rem;
    overflow: hidden;
    border-block: 4px solid var(--ink);
    background:
        repeating-linear-gradient(
            -55deg,
            transparent 0 9px,
            rgba(255, 101, 66, 0.9) 9px 12px,
            transparent 12px 22px
        ),
        var(--ink);
    color: var(--paper);
    pointer-events: none;
    transform: translateX(-105%);
}

.redaction-band.is-active {
    animation: redaction-wipe
        var(--wipe-duration)
        cubic-bezier(0.77, 0, 0.18, 1)
        both;
}

@keyframes redaction-wipe {
    0% {
        transform: translateX(-105%);
    }

    44%,
    56% {
        transform: translateX(0);
    }

    100% {
        transform: translateX(105%);
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

The band remains fully over the input from 44% through 56% of the animation. JavaScript switches between `type="password"` and `type="text"` at 50%, so the change is never visible.

## Component states

The script uses four presentation states:

- `hidden` — password is masked
- `wiping` — redaction band is moving
- `revealed` — password is visible
- `queued` — another visibility change was requested during the wipe

During the wipe, the input becomes read-only and `aria-busy` becomes `true`. Rapid clicks are queued, reduced-motion users receive an immediate change, and leaving the page forces the password back to its hidden state.

## Project files

- [`index.html`](./index.html) — complete demo markup
- [`style.css`](./style.css) — full page and animation styling
- [`script.js`](./script.js) — complete interaction state logic

The README intentionally contains only animation-related excerpts and configuration. The complete source remains in the files above.
