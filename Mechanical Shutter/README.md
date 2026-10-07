# Password Reveal Animation — Type 3

A dependency-free password reveal interaction built as an **industrial mechanical shutter**. Six staggered metal blades seal the password field, visibility changes only while every blade is closed, and the mechanism opens again.

> [!NOTE]
> The shutter is a visual privacy transition, not encryption. The real input value is never rewritten, copied into a presentation layer, stored, or transmitted.

## Run the demo

Open [`index.html`](./index.html) directly in a modern browser. The sample password `Torque-Lime-03` is included for immediate testing.

## Animation configuration

The timing values are defined near the top of [`script.js`](./script.js):

```javascript
const BLADE_ANIMATION_DURATION = 700;
const BLADE_STAGGER = 22;
const BLADE_COUNT = 6;

const SHUTTER_CYCLE_DURATION =
    BLADE_ANIMATION_DURATION +
    BLADE_STAGGER * (BLADE_COUNT - 1) +
    10;

const TYPE_SWITCH_DELAY = 400;
const motionPreference =
    window.matchMedia?.("(prefers-reduced-motion: reduce)");
```

The matching blade duration is defined in [`style.css`](./style.css):

```css
:root {
    --blade-duration: 700ms;
}
```

| Setting | Default | Purpose |
| --- | ---: | --- |
| `BLADE_ANIMATION_DURATION` | `700` ms | Close, hold, and reopen animation for one blade |
| `BLADE_STAGGER` | `22` ms | Delay between neighboring blades |
| `BLADE_COUNT` | `6` | Number of mechanical panels |
| `SHUTTER_CYCLE_DURATION` | `820` ms | Full cycle including the final stagger and cleanup buffer |
| `TYPE_SWITCH_DELAY` | `400` ms | Fully covered moment when the input type changes |
| Reduced motion | Immediate | Skips the shutter cycle and changes visibility directly |

Keep `BLADE_ANIMATION_DURATION` and `--blade-duration` synchronized when changing the speed.

## Animation markup

This is the markup directly involved in the shutter interaction:

```html
<div id="passwordShell"
     class="password-shell"
     data-state="hidden"
     aria-busy="false">
    <input
        id="password"
        type="password"
        value="Torque-Lime-03"
        autocomplete="off"
        spellcheck="false"
    >

    <div id="shutterArray"
         class="shutter-array"
         aria-hidden="true">
        <span class="shutter-blade" data-index="01"></span>
        <span class="shutter-blade" data-index="02"></span>
        <span class="shutter-blade" data-index="03"></span>
        <span class="shutter-blade" data-index="04"></span>
        <span class="shutter-blade" data-index="05"></span>
        <span class="shutter-blade" data-index="06"></span>
    </div>
</div>

<button
    id="togglePassword"
    class="lever-control"
    type="button"
    aria-controls="password"
    aria-label="Reveal password"
    aria-pressed="false"
    data-visible="false">
    <span class="lever-copy">
        <small>Security lever</small>
        <strong id="leverAction">Unseal password</strong>
    </span>

    <span class="lever-assembly" aria-hidden="true">
        <span class="lever-gate">
            <span class="lever-arm">
                <span class="lever-knob"></span>
            </span>
        </span>
    </span>
</button>

<span id="liveStatus" class="sr-only" aria-live="polite"></span>
```

## Mechanical-shutter CSS

Only the styles that construct, stagger, and animate the six blades are shown here:

```css
.password-shell {
    position: relative;
    overflow: hidden;
}

.shutter-array {
    position: absolute;
    z-index: 4;
    inset: 0;
    display: grid;
    visibility: hidden;
    overflow: hidden;
    pointer-events: none;
    grid-template-columns: repeat(6, 1fr);
}

.shutter-array.is-active {
    visibility: visible;
}

.shutter-blade {
    position: relative;
    margin-inline: -1px;
    border-inline: 1px solid #0b0d0f;
    background:
        linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.13),
            transparent 18%,
            transparent 82%,
            rgba(0, 0, 0, 0.42)
        ),
        repeating-linear-gradient(
            0deg,
            #343b44 0 5px,
            #2b3138 5px 10px
        );
    transform: scaleY(0);
}

.shutter-blade:nth-child(odd) {
    transform-origin: 50% 0;
}

.shutter-blade:nth-child(even) {
    transform-origin: 50% 100%;
}

.shutter-array.is-active .shutter-blade {
    animation:
        shutter-cycle
        var(--blade-duration)
        cubic-bezier(0.77, 0, 0.18, 1)
        both;
}

.shutter-array.is-active .shutter-blade:nth-child(1) {
    animation-delay: 0ms;
}

.shutter-array.is-active .shutter-blade:nth-child(2) {
    animation-delay: 22ms;
}

.shutter-array.is-active .shutter-blade:nth-child(3) {
    animation-delay: 44ms;
}

.shutter-array.is-active .shutter-blade:nth-child(4) {
    animation-delay: 66ms;
}

.shutter-array.is-active .shutter-blade:nth-child(5) {
    animation-delay: 88ms;
}

.shutter-array.is-active .shutter-blade:nth-child(6) {
    animation-delay: 110ms;
}

@keyframes shutter-cycle {
    0% {
        transform: scaleY(0);
    }

    32%,
    68% {
        transform: scaleY(1);
    }

    100% {
        transform: scaleY(0);
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

Odd blades close from the top and even blades close from the bottom. The negative inline margin prevents subpixel gaps between adjacent blades.

## Covered timing

With the default values:

- The last staggered blade is fully closed at approximately 334 ms.
- JavaScript switches the input type at 400 ms.
- The first blade does not begin reopening until approximately 476 ms.
- The final blade finishes at approximately 810 ms.
- JavaScript completes the state at 820 ms.

This leaves the input fully covered around the visibility change.

## Component states

The script uses four presentation states:

- `hidden` — access key is masked
- `cycling` — shutters are moving
- `revealed` — access key is visible
- `queued` — another lever command was requested during the cycle

During a cycle, the input becomes read-only and `aria-busy` becomes `true`. Rapid commands are queued, reduced-motion users receive an immediate change, and leaving or hiding the page forces the password back to its concealed state.

## Project files

- [`index.html`](./index.html) — complete demo markup
- [`style.css`](./style.css) — full industrial interface and shutter styling
- [`script.js`](./script.js) — complete shutter state logic

The README intentionally contains only animation-related excerpts and configuration. The complete source remains in the files above.
