# Password Reveal Animation — Type 10

A dependency-free **Liquid Glass Ripple** password reveal. A glass-like lens blooms across the field while the target visibility state expands underneath it, producing a soft liquid transition instead of a normal instant toggle.

## Run

Open `index.html` directly in a modern browser.

## Motion settings

```js
const MOTION = Object.freeze({
  rippleDuration: 900,
  settle: 80
});
```

The animation is bidirectional: reveal expands from the toggle side, while hide blooms from the opposite side. The input value itself is not rewritten. Reduced-motion users receive an immediate visibility change.
