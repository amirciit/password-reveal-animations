# Password Reveal Animation — Type 7

Type 7 uses a plain text queue. During every step, the existing password row shifts one character left while the next character starts underneath the toggle button, emerges from its left edge, and glides into the final text position.

Open `index.html` directly in a modern browser. No dependencies or build step are required.

## Animation configuration

This README contains only animation configuration and focused motion snippets—not the complete page source.

```js
const MOTION = Object.freeze({
    stepDuration: 260,
    stepPause: 20,
    maxTotalDuration: 2600,
    easing: "cubic-bezier(0.4, 0, 0.2, 1)"
});
```

For the demo value `ABC123`, the reveal queue progresses as:

```text
•••••• → •••••A → ••••AB → •••ABC → ••ABC1 → •ABC12 → ABC123
```

Hide uses the same leftward movement with bullets entering from behind the button:

```text
ABC123 → BC123• → C123•• → 123••• → 23•••• → 3••••• → ••••••
```

## Queue update

```js
const masks = Array(graphemes.length).fill("•");
const current = targetVisible ? [...masks] : [...graphemes];
const feed = targetVisible ? [...graphemes] : [...masks];

// After one synchronized movement:
const nextRow = [...current.slice(1), feed[step]];
```

## Behind-button geometry

The animation stage extends underneath the opaque button. The incoming glyph is parked near the button center, while its landing point is the last password position.

```js
const stageRect = conveyorStage.getBoundingClientRect();
const buttonRect = toggleButton.getBoundingClientRect();
const buttonLeft = buttonRect.left - stageRect.left;
const buttonInset = Math.max(8, (buttonRect.width - advance) / 2);

const startX = buttonLeft + buttonInset;
const landingX = (characterTotal - 1) * advance;
```

## Synchronized movement

The complete row and the incoming glyph animate together. There is no fade, blur, scale, or per-character box animation.

```js
const timing = {
    duration: MOTION.stepDuration,
    easing: MOTION.easing,
    fill: "both"
};

const rowAnimation = conveyorTrack.animate(
    [
        { transform: "translate3d(0, 0, 0)" },
        { transform: `translate3d(-${advance}px, 0, 0)` }
    ],
    timing
);

const incomingAnimation = incomingGlyph.animate(
    [
        { transform: `translate3d(${startX}px, 0, 0)` },
        { transform: `translate3d(${landingX}px, 0, 0)` }
    ],
    timing
);
```

## Layering configuration

```css
.conveyor-stage {
    position: absolute;
    right: 0;
    overflow: hidden;
    z-index: 2;
}

.incoming-glyph {
    position: absolute;
    left: 0;
    width: var(--advance);
}

.visibility-toggle {
    position: absolute;
    z-index: 3;
    background: #17191d;
}
```

The button’s solid background hides the parked glyph. The native input value is never rewritten: reveal keeps it masked until completion, and hide masks it before its first cleartext proxy frame.
