# Password Reveal Animation — Type 5

A right-to-left **character cascade**. Reveal and Hide both begin with the rightmost password character and progress one position at a time toward the left. Each replacement glyph enters from the physical right side of its slot.

> This is a visual interaction demo. Revealing a password does not encrypt, transmit, or store it.

## Run the demo

Open `index.html` in a modern browser. No dependencies or build step are required.

## Animation configuration

The animation-related values are defined in `script.js`:

```js
const MOTION = Object.freeze({
    characterDuration: 340,
    characterStagger: 72,
    maxSequenceDuration: 1500,
    beamTail: 80,
    enterDistance: 14,
    exitDistance: 10,
    blur: 5,
    enterEasing: "cubic-bezier(0.22, 1, 0.36, 1)",
    exitEasing: "cubic-bezier(0.4, 0, 0.2, 1)"
});
```

| Setting | Purpose |
| --- | --- |
| `characterDuration` | Duration of each individual character replacement |
| `characterStagger` | Delay between neighboring characters |
| `maxSequenceDuration` | Caps the main cascade for long passwords |
| `beamTail` | Extra time for the right-to-left highlight to leave the field |
| `enterDistance` | Distance an incoming glyph travels from the right |
| `exitDistance` | Distance an outgoing glyph travels toward the left |
| `blur` | Maximum character blur in pixels |
| `enterEasing` | Smooth settling curve for incoming characters |
| `exitEasing` | Controlled fade curve for outgoing characters |

## Right-to-left order

Each character receives a delay based on its distance from the right edge:

```js
const rightToLeftOrder = characterTotal - 1 - index;
const delay = rightToLeftOrder * stagger;
```

For `ABCDE`, Reveal progresses visually as:

```text
••••E → •••DE → ••CDE → •BCDE → ABCDE
```

Hide uses the same direction:

```text
ABCD• → ABC•• → AB••• → A•••• → •••••
```

## Character motion

The incoming layer always begins to the right of its final position:

```js
[
    {
        opacity: 0,
        transform: `translateX(${MOTION.enterDistance}px) scale(0.88)`,
        filter: `blur(${MOTION.blur}px)`
    },
    {
        opacity: 1,
        transform: "translateX(0) scale(1)",
        filter: "blur(0px)"
    }
]
```

The outgoing layer moves in the opposite direction while fading:

```js
[
    { opacity: 1, transform: "translateX(0)", filter: "blur(0px)" },
    {
        opacity: 0,
        transform: `translateX(-${MOTION.exitDistance}px)`,
        filter: `blur(${MOTION.blur}px)`
    }
]
```

## Interaction behavior

- `Intl.Segmenter` keeps Unicode grapheme clusters together when supported.
- The native input value is never replaced with bullet characters.
- A temporary `aria-hidden` visual layer performs the cascade and is cleared afterward.
- Reveal keeps the native input masked until the sequence finishes.
- Hide masks the native input immediately behind the temporary character layer.
- Value, selection, direction, focus, and horizontal scroll are preserved.
- Repeated clicks cancel the active cascade and return to the last completed state.
- Page hiding immediately removes temporary characters and masks the password.
- Reduced-motion preferences switch state immediately without the cascade.

## Files

- `index.html` — demo structure
- `style.css` — visual design and character-layer layout
- `script.js` — animation configuration and cascade state logic

Only animation configuration and focused motion excerpts are included here; the complete runnable source remains in the project files.
