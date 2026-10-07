# Password Reveal Animations

A collection of **10 creative password reveal animations** built with vanilla HTML, CSS, and JavaScript.

Each animation provides a different visual way to reveal and hide password characters without requiring any framework, library, dependency, or build tool.

## Live Demo

Explore the full collection:

**https://amirciit.github.io/password-reveal-animations/**

## Animations

1. **Scramble Reveal** — characters rapidly scramble before resolving into the real password.
2. **Redaction Wipe** — a smooth redaction-style wipe reveals and hides the password.
3. **Mechanical Shutter** — password characters appear through a mechanical shutter effect.
4. **Focus Reveal** — characters transition from blurred or unfocused states into clear text.
5. **Character Cascade** — password characters reveal progressively in a cascading sequence.
6. **Password Conveyor** — characters move through a conveyor-style transition before settling.
7. **Password Queue** — password characters enter and leave through an animated queue.
8. **Neon Scan Decode** — a glowing scan passes across the password while characters decode.
9. **3D Vault Flip** — individual characters flip into place using a 3D vault-inspired effect.
10. **Liquid Glass Ripple** — a glass-like ripple travels through the field to reveal or hide the password.

## Features

- 10 unique password reveal animations
- Vanilla HTML, CSS, and JavaScript
- Zero external dependencies
- No framework required
- No build process
- Responsive layouts
- Reveal and hide animations
- Easy to customize
- Suitable for login and authentication interfaces
- `prefers-reduced-motion` support where applicable
- GitHub Pages-ready gallery

## Project Structure

```text
password-reveal-animations/
│
├── index.html
├── style.css
├── README.md
│
├── Scramble Reveal/
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── README.md
│
├── Redaction Wipe/
├── Mechanical Shutter/
├── Focus Reveal/
├── Character Cascade/
├── Password Conveyor/
├── Password Queue/
├── Neon Scan Decode/
├── 3D Vault Flip/
└── Liquid Glass Ripple/
```

Each animation is independent and can be used separately.

## Usage

Clone the repository:

```bash
git clone https://github.com/amirciit/password-reveal-animations.git
```

Open the project:

```bash
cd password-reveal-animations
```

Open the root `index.html` to browse the gallery, or choose any animation folder and open its `index.html` directly.

No installation or package manager is required.

## Customization

You can customize each animation by modifying:

- animation duration
- easing
- colors
- glow effects
- typography
- character delays
- password field size
- reveal direction
- background styling

Most visual settings are available directly inside the corresponding CSS file.

## Accessibility

The animations are intended to enhance the interface without changing the underlying password value.

Reduced-motion behavior should be respected for users who enable:

```css
@media (prefers-reduced-motion: reduce)
```

Password visibility controls should remain keyboard accessible and include suitable accessibility labels when used in production applications.

## Security Note

These animations are **visual UI effects only**. They do not provide encryption or additional password security.

Applications using these effects should continue to follow normal security practices, including HTTPS, server-side password hashing, secure password storage, appropriate autocomplete attributes, and protection against common web vulnerabilities.

Never store plain-text passwords.

## Browser Support

Designed for modern browsers, including:

- Google Chrome
- Microsoft Edge
- Mozilla Firefox
- Safari

Some advanced visual effects may look slightly different between browsers.

## Contributing

Contributions are welcome. You can contribute new reveal effects, accessibility improvements, compatibility fixes, performance improvements, or documentation updates.

Create a feature branch:

```bash
git checkout -b feature/new-animation
```

Then commit your changes:

```bash
git add .
git commit -m "Add new password reveal animation"
```

Push the branch and open a pull request.

## License

This project is intended to be released under the **MIT License**.

## Author

**Muhammad Amir Tariq**

GitHub: **https://github.com/amirciit**

If you find the project useful, consider giving the repository a ⭐.
