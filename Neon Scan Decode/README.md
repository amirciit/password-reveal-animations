# Password Reveal Animation — Type 8

A dependency-free **Neon Scan Decode** password reveal. A bright scanner crosses the field while each position cycles through temporary glyphs before resolving to the real character. Hiding runs the same idea in reverse and resolves back to bullets.

> The decode effect is visual only. It is not encryption and the real password value is never rewritten.

## Run

Open `index.html` directly in a modern browser. No dependencies or build step are required.

## Motion settings

```js
const MOTION = Object.freeze({
  scanDuration: 980,
  glyphDuration: 260,
  stagger: 52
});
```

The demo also honors `prefers-reduced-motion` and switches visibility immediately when reduced motion is requested.
