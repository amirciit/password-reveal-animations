# Password Reveal Animation — Type 9

A dependency-free **3D Vault Flip** password reveal. Every character becomes a miniature mechanical split-flap tile and rotates from bullet to real character. The flip wave starts at the center and travels outward.

## Run

Open `index.html` directly in a modern browser.

## Motion settings

```js
const MOTION = Object.freeze({
  flipDuration: 520,
  stagger: 64,
  settle: 110
});
```

Reveal and hide use the same mechanism in opposite content states. The real input value remains unchanged during the visual transition, and reduced-motion users receive an immediate state change.
