(() => {
    "use strict";

    const passwordField = document.getElementById("password");
    const passwordShell = document.getElementById("passwordShell");
    const toggleButton = document.getElementById("togglePassword");
    const scrambleText = document.getElementById("scrambleText");
    const messageField = document.getElementById("passwordMessage");
    const messageText = messageField?.querySelector(".message-text");
    const liveAnnouncement = document.getElementById("liveAnnouncement");
    const demoSubmit = document.getElementById("demoSubmit");
    const forgotPassword = document.getElementById("forgotPassword");
    const demoToast = document.getElementById("demoToast");

    if (!passwordField || !passwordShell || !toggleButton || !scrambleText || !messageField || !messageText) {
        return;
    }

    const CHARACTER_SET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:\",.<>?";
    const SCRAMBLE_LENGTH = 16;
    const TOTAL_FRAMES = 20;
    const FRAME_DELAY = 100;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    let animationTimer = null;
    let announcementTimer = null;
    let toastTimer = null;

    function createRandomString(length) {
        let result = "";

        for (let index = 0; index < length; index += 1) {
            const randomIndex = Math.floor(Math.random() * CHARACTER_SET.length);
            result += CHARACTER_SET[randomIndex];
        }

        return result;
    }

    function announce(message) {
        if (!liveAnnouncement) {
            return;
        }

        window.clearTimeout(announcementTimer);
        liveAnnouncement.textContent = "";
        announcementTimer = window.setTimeout(() => {
            liveAnnouncement.textContent = message;
            announcementTimer = null;
        }, 20);
    }

    function showDecryptingMessage() {
        messageField.setAttribute("aria-hidden", "false");
        messageText.textContent = "Decrypting Your Secured Password...";
        messageField.classList.add("is-visible");
    }

    function hideDecryptingMessage() {
        messageField.classList.remove("is-visible");
        messageField.setAttribute("aria-hidden", "true");
    }

    function updateToggle(state) {
        const isHidden = state === "hidden";
        const isRevealed = state === "revealed";
        const label = state === "decrypting" ? "Cancel password reveal" : isHidden ? "Show password" : "Hide password";

        passwordShell.dataset.state = state;
        passwordShell.setAttribute("aria-busy", String(state === "decrypting"));
        toggleButton.setAttribute("aria-label", label);
        toggleButton.setAttribute("aria-pressed", String(isRevealed));
    }

    function stopAnimation() {
        if (animationTimer !== null) {
            window.clearInterval(animationTimer);
            animationTimer = null;
        }
    }

    function hidePassword({ announceChange = true } = {}) {
        stopAnimation();
        passwordField.readOnly = false;
        passwordField.type = "password";
        scrambleText.textContent = "";
        hideDecryptingMessage();
        updateToggle("hidden");

        if (announceChange) {
            announce("Password hidden.");
        } else if (liveAnnouncement) {
            window.clearTimeout(announcementTimer);
            announcementTimer = null;
            liveAnnouncement.textContent = "";
        }
    }

    function finishReveal() {
        stopAnimation();
        passwordField.type = "text";
        passwordField.readOnly = false;
        scrambleText.textContent = "";
        hideDecryptingMessage();
        updateToggle("revealed");
        announce("Password revealed.");
    }

    function revealPassword() {
        if (passwordField.value.length === 0) {
            announce("Enter a password before using the reveal animation.");
            passwordField.focus();
            return;
        }

        passwordField.type = "password";
        passwordField.readOnly = true;
        updateToggle("decrypting");
        showDecryptingMessage();

        if (reducedMotion) {
            finishReveal();
            return;
        }

        let frame = 0;
        scrambleText.textContent = createRandomString(SCRAMBLE_LENGTH);
        frame += 1;

        animationTimer = window.setInterval(() => {
            if (frame >= TOTAL_FRAMES) {
                finishReveal();
                return;
            }

            scrambleText.textContent = createRandomString(SCRAMBLE_LENGTH);
            frame += 1;
        }, FRAME_DELAY);
    }

    function showToast(message) {
        if (!demoToast) {
            return;
        }

        window.clearTimeout(toastTimer);
        demoToast.setAttribute("aria-hidden", "false");
        demoToast.textContent = message;
        demoToast.classList.add("is-visible");
        toastTimer = window.setTimeout(() => {
            demoToast.classList.remove("is-visible");
            demoToast.setAttribute("aria-hidden", "true");
        }, 2600);
    }

    toggleButton.addEventListener("click", () => {
        const state = passwordShell.dataset.state;

        if (state === "hidden") {
            revealPassword();
        } else {
            hidePassword();
        }
    });

    passwordField.addEventListener("input", () => {
        if (passwordShell.dataset.state === "revealed" && passwordField.value.length === 0) {
            hidePassword({ announceChange: false });
        }
    });

    demoSubmit?.addEventListener("click", () => {
        showToast("This is a visual demo. Nothing was submitted.");
    });

    forgotPassword?.addEventListener("click", () => {
        showToast("Password recovery is not connected in this demo.");
    });

    window.addEventListener("pagehide", () => {
        hidePassword({ announceChange: false });
    });
})();
