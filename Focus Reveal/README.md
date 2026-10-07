# Password Reveal Animation — Type 4

A smooth **focus-match** password reveal. The characters travel through a visible blur, a light sweep crosses the field, the input switches mode while fully transparent, then the new state settles cleanly into focus.

> This is a visual interaction demo. Revealing a password does not encrypt, transmit, or store it.

## Run the demo

Open `index.html` in a modern browser. No build step or dependencies are required.

## Animation configuration

These are the motion values used by the demo. Edit them in `script.js` to tune the animation without changing the state logic.

```js
const MOTION = Object.freeze({
    exitDuration: 300,
    enterDuration: 500,
    sweepDuration: 900,
    exitEasing: "cubic-bezier(0.4, 0, 0.7, 0.2)",
    enterEasing: "cubic-bezier(0.16, 1, 0.3, 1)",
    shift: 12,
    blur: 6,
    scale: 0.985
});
```

| Setting | Purpose |
| --- | --- |
| `exitDuration` | Time for the current characters to disappear |
| `enterDuration` | Time for the replacement characters to settle in |
| `sweepDuration` | Time for the indigo focus light to cross the field |
| `exitEasing` | Controlled acceleration into the midpoint |
| `enterEasing` | Soft deceleration back into focus |
| `shift` | Maximum horizontal movement in pixels |
| `blur` | Maximum blur in pixels |
| `scale` | Small depth change at the transparent midpoint |

## Motion phases

The animation uses two Web Animations API phases. The input `type` changes only after the exit phase reaches zero opacity, so bullets and plain text never overlap.

```js
// Exit: current characters spread, travel, and disappear.
[
    { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)", filter: "blur(0px)" },
    {
        opacity: 0,
        transform: `translate3d(${MOTION.shift}px, 0, 0) scale(${MOTION.scale})`,
        filter: `blur(${MOTION.blur}px)`
    }
]

// Enter: the new character state returns to focus.
[
    {
        opacity: 0,
        transform: `translate3d(-${MOTION.shift}px, 0, 0) scale(${MOTION.scale})`,
        filter: `blur(${MOTION.blur}px)`
    },
    { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)", filter: "blur(0px)" }
]
```

The focus sweep runs alongside both character phases:

```js
const sweepTiming = {
    duration: MOTION.sweepDuration,
    easing: "cubic-bezier(0.4, 0, 0.2, 1)"
};
```

## Interaction behavior

- Latest intent wins when the toggle is clicked repeatedly.
- The password value, selection, direction, and horizontal scroll position are preserved.
- The field is temporarily read-only during the visual transition.
- Leaving or hiding the page immediately restores the masked password state.
- `prefers-reduced-motion: reduce` skips or immediately settles the transition.

## Files

- `index.html` — demo structure
- `style.css` — layout and visual states
- `script.js` — animation configuration and reveal state machine

Only the animation-related configuration and motion excerpts are shown here; the complete runnable source remains in the project files.
