# Password Reveal Animation — Type 6

Type 6 is a single-line password conveyor. The complete visible text moves left together: the first symbol exits through the left edge while the next character enters from beyond the right edge of the text window.

Open `index.html` directly in a modern browser. No dependencies or build step are required.

## Animation configuration

This README contains only the conveyor animation settings and focused animation snippets—not the complete page source.

```js
const MOTION = Object.freeze({
    moveDuration: 180,
    holdDuration: 25,
    maxTotalDuration: 2200,
    easing: "cubic-bezier(0.22, 1, 0.36, 1)"
});
```

For `ABC123`, reveal uses one continuous master track:

```js
const masks = Array(graphemes.length).fill("•");
const revealTrack = [...masks, ...graphemes];
// ••••••ABC123
```

Moving that track left by one character advance at a time produces:

```text
•••••• → •••••A → ••••AB → •••ABC → ••ABC1 → •ABC12 → ABC123
```

Hide uses the inverse master track while keeping the same leftward motion:

```js
const hideTrack = [...graphemes, ...masks];
// ABC123••••••
```

```text
ABC123 → BC123• → C123•• → 123••• → 23•••• → 3••••• → ••••••
```

## Stepped conveyor keyframes

Each move is eased, followed by a short hold so every completed string is readable. Opacity, blur, scale, and per-character animations are intentionally absent.

```js
const keyframes = [
    {
        transform: "translateX(0px)",
        offset: 0,
        easing: MOTION.easing
    }
];

let elapsed = 0;

for (let step = 1; step <= characterTotal; step += 1) {
    const position = `translateX(-${step * advance}px)`;
    elapsed += moveDuration;

    keyframes.push({
        transform: position,
        offset: elapsed / totalDuration,
        easing: "linear"
    });

    if (step < characterTotal) {
        elapsed += holdDuration;
        keyframes.push({
            transform: position,
            offset: elapsed / totalDuration,
            easing: MOTION.easing
        });
    }
}
```

## Plain clipping layer

The spans provide equal invisible character spacing only. They have no boxes, borders, backgrounds, or individual animation.

```css
.conveyor-window {
    overflow: hidden;
}

.conveyor-track {
    display: flex;
    width: max-content;
    will-change: transform;
}

.conveyor-glyph {
    width: var(--advance);
    flex: 0 0 var(--advance);
}
```

The native input value is never rewritten. Reveal keeps it password-masked until the conveyor completes; hide masks it before its first cleartext proxy frame. Reduced-motion mode skips the conveyor and settles immediately.
