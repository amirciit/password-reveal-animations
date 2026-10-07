(() => {
    "use strict";

    const passwordField = document.getElementById("password");
    const passwordShell = document.getElementById("passwordShell");
    const focusBloom = document.getElementById("focusBloom");
    const toggleButton = document.getElementById("togglePassword");
    const toggleText = document.getElementById("toggleText");
    const visibilityState = document.getElementById("visibilityState");
    const fieldMessage = document.getElementById("fieldMessage");
    const liveStatus = document.getElementById("liveStatus");
    const demoSubmit = document.getElementById("demoSubmit");
    const forgotButton = document.getElementById("forgotButton");
    const demoToast = document.getElementById("demoToast");

    if (
        !passwordField ||
        !passwordShell ||
        !toggleButton ||
        !toggleText ||
        !visibilityState
    ) {
        return;
    }

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

    const motionPreference = window.matchMedia?.("(prefers-reduced-motion: reduce)");

    let actualVisible = false;
    let desiredVisible = false;
    let isAnimating = false;
    let transitionGeneration = 0;
    let originalReadOnly = false;
    let announcementTimer = null;
    let toastTimer = null;
    const activeAnimations = new Set();

    function announce(message) {
        if (!liveStatus) {
            return;
        }

        window.clearTimeout(announcementTimer);
        liveStatus.textContent = "";
        announcementTimer = window.setTimeout(() => {
            liveStatus.textContent = message;
            announcementTimer = null;
        }, 20);
    }

    function showFieldMessage(message) {
        if (!fieldMessage) {
            return;
        }

        fieldMessage.textContent = message;
        fieldMessage.setAttribute("aria-hidden", "false");
        fieldMessage.classList.add("is-visible");
        passwordShell.classList.add("has-error");
    }

    function clearFieldMessage() {
        if (!fieldMessage) {
            return;
        }

        fieldMessage.classList.remove("is-visible");
        fieldMessage.setAttribute("aria-hidden", "true");
        passwordShell.classList.remove("has-error");
    }

    function setPasswordVisibility(visible) {
        const selectionStart = passwordField.selectionStart;
        const selectionEnd = passwordField.selectionEnd;
        const selectionDirection = passwordField.selectionDirection;
        const scrollPosition = passwordField.scrollLeft;

        passwordField.type = visible ? "text" : "password";

        if (selectionStart !== null && selectionEnd !== null) {
            try {
                passwordField.setSelectionRange(
                    selectionStart,
                    selectionEnd,
                    selectionDirection ?? "none"
                );
            } catch {
                // Some browsers do not restore selection on password inputs.
            }
        }

        passwordField.scrollLeft = scrollPosition;
    }

    function renderCompletedState() {
        const state = actualVisible ? "revealed" : "hidden";

        passwordShell.dataset.state = state;
        passwordShell.setAttribute("aria-busy", "false");
        visibilityState.dataset.state = state;
        visibilityState.textContent = actualVisible ? "Visible" : "Hidden";
        toggleButton.dataset.visible = String(actualVisible);
        toggleButton.setAttribute("aria-label", actualVisible ? "Hide password" : "Show password");
        toggleText.textContent = actualVisible ? "Hide" : "Show";
    }

    function renderIntentState() {
        passwordShell.dataset.state = "shifting";
        passwordShell.setAttribute("aria-busy", "true");
        visibilityState.dataset.state = "shifting";
        visibilityState.textContent = desiredVisible ? "Revealing…" : "Hiding…";
        toggleButton.dataset.visible = String(desiredVisible);
        toggleButton.setAttribute("aria-label", desiredVisible ? "Hide password" : "Show password");
        toggleText.textContent = desiredVisible ? "Hide" : "Show";
    }

    function registerAnimation(animation) {
        activeAnimations.add(animation);
        return animation;
    }

    async function waitForAnimation(animation) {
        try {
            await animation.finished;
            return true;
        } catch {
            return false;
        } finally {
            activeAnimations.delete(animation);
        }
    }

    function cancelAnimations() {
        activeAnimations.forEach((animation) => {
            try {
                animation.cancel();
            } catch {
                // Already-finished animations need no cleanup.
            }
        });
        activeAnimations.clear();
    }

    function startFocusSweep(revealing) {
        if (!focusBloom || typeof focusBloom.animate !== "function") {
            return null;
        }

        const start = revealing ? 0 : 360;
        const end = revealing ? 360 : 0;
        const position = (progress) => start + (end - start) * progress;
        const animation = registerAnimation(
            focusBloom.animate(
                [
                    { opacity: 0, transform: `translateX(${position(0)}%) skewX(-10deg)` },
                    { opacity: 0.42, transform: `translateX(${position(0.12)}%) skewX(-10deg)`, offset: 0.12 },
                    { opacity: 0.96, transform: `translateX(${position(0.34)}%) skewX(-10deg)`, offset: 0.34 },
                    { opacity: 0.58, transform: `translateX(${position(0.72)}%) skewX(-10deg)`, offset: 0.72 },
                    { opacity: 0, transform: `translateX(${position(1)}%) skewX(-10deg)` }
                ],
                {
                    duration: MOTION.sweepDuration,
                    easing: "cubic-bezier(0.4, 0, 0.2, 1)"
                }
            )
        );

        animation.finished
            .catch(() => {})
            .finally(() => activeAnimations.delete(animation));

        return animation;
    }

    function createExitAnimation(direction) {
        return registerAnimation(
            passwordField.animate(
                [
                    {
                        opacity: 1,
                        transform: "translate3d(0, 0, 0) scale(1)",
                        filter: "blur(0px)",
                        letterSpacing: "0.035em"
                    },
                    {
                        opacity: 0.78,
                        transform: `translate3d(${direction * 3}px, 0, 0) scale(0.997)`,
                        filter: "blur(1.5px)",
                        letterSpacing: "0.07em",
                        offset: 0.44
                    },
                    {
                        opacity: 0,
                        transform: `translate3d(${direction * MOTION.shift}px, 0, 0) scale(${MOTION.scale})`,
                        filter: `blur(${MOTION.blur}px)`,
                        letterSpacing: "0.16em"
                    }
                ],
                {
                    duration: MOTION.exitDuration,
                    easing: MOTION.exitEasing,
                    fill: "forwards"
                }
            )
        );
    }

    function createEnterAnimation(direction) {
        return registerAnimation(
            passwordField.animate(
                [
                    {
                        opacity: 0,
                        transform: `translate3d(${-direction * MOTION.shift}px, 0, 0) scale(${MOTION.scale})`,
                        filter: `blur(${MOTION.blur}px)`,
                        letterSpacing: "0.16em"
                    },
                    {
                        opacity: 0.72,
                        transform: `translate3d(${-direction * 3}px, 0, 0) scale(0.997)`,
                        filter: "blur(2px)",
                        letterSpacing: "0.075em",
                        offset: 0.42
                    },
                    {
                        opacity: 1,
                        transform: "translate3d(0, 0, 0) scale(1)",
                        filter: "blur(0px)",
                        letterSpacing: "0.035em"
                    }
                ],
                {
                    duration: MOTION.enterDuration,
                    easing: MOTION.enterEasing,
                    fill: "both"
                }
            )
        );
    }

    async function driveVisibility() {
        if (isAnimating) {
            renderIntentState();
            return;
        }

        if (motionPreference?.matches || typeof passwordField.animate !== "function") {
            setPasswordVisibility(desiredVisible);
            actualVisible = desiredVisible;
            renderCompletedState();
            announce(actualVisible ? "Password shown." : "Password hidden.");
            return;
        }

        isAnimating = true;
        originalReadOnly = passwordField.readOnly;
        passwordField.readOnly = true;
        const generation = ++transitionGeneration;
        renderIntentState();

        try {
            while (
                generation === transitionGeneration &&
                desiredVisible !== actualVisible
            ) {
                const exitDirection = desiredVisible ? 1 : -1;
                const sweepAnimation = startFocusSweep(desiredVisible);

                const exitAnimation = createExitAnimation(exitDirection);
                const exited = await waitForAnimation(exitAnimation);

                if (!exited || generation !== transitionGeneration) {
                    return;
                }

                const midpointTarget = desiredVisible;
                setPasswordVisibility(midpointTarget);
                actualVisible = midpointTarget;

                const enterDirection = midpointTarget ? 1 : -1;
                const enterAnimation = createEnterAnimation(enterDirection);
                exitAnimation.cancel();
                const entered = await waitForAnimation(enterAnimation);
                enterAnimation.cancel();

                if (!entered || generation !== transitionGeneration) {
                    return;
                }

                if (sweepAnimation) {
                    const swept = await waitForAnimation(sweepAnimation);

                    if (!swept || generation !== transitionGeneration) {
                        return;
                    }
                }
            }
        } finally {
            if (generation === transitionGeneration) {
                isAnimating = false;
                passwordField.readOnly = originalReadOnly;
                renderCompletedState();
                announce(actualVisible ? "Password shown." : "Password hidden.");
            }
        }
    }

    function requestToggle() {
        const nextTarget = !desiredVisible;

        if (nextTarget && passwordField.value.length === 0) {
            desiredVisible = false;
            showFieldMessage("Enter a password before revealing it.");
            announce("Enter a password before revealing it.");
            passwordField.focus();
            return;
        }

        clearFieldMessage();
        desiredVisible = nextTarget;

        // If clear text is already entering, a Hide request takes priority and
        // masks synchronously instead of letting the reveal finish first.
        if (isAnimating && actualVisible && !desiredVisible) {
            forceHidden();
            announce("Password hidden.");
            return;
        }

        renderIntentState();
        void driveVisibility();
    }

    function forceHidden() {
        transitionGeneration += 1;
        cancelAnimations();
        isAnimating = false;
        desiredVisible = false;
        actualVisible = false;
        passwordField.readOnly = originalReadOnly;
        setPasswordVisibility(false);
        renderCompletedState();

        if (liveStatus) {
            window.clearTimeout(announcementTimer);
            announcementTimer = null;
            liveStatus.textContent = "";
        }
    }

    function honorReducedMotion(event) {
        if (!event.matches || !isAnimating) {
            return;
        }

        transitionGeneration += 1;
        cancelAnimations();
        isAnimating = false;
        passwordField.readOnly = originalReadOnly;
        setPasswordVisibility(desiredVisible);
        actualVisible = desiredVisible;
        renderCompletedState();
        announce(actualVisible ? "Password shown." : "Password hidden.");
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

    toggleButton.addEventListener("click", requestToggle);

    passwordField.addEventListener("input", () => {
        clearFieldMessage();

        if (actualVisible && passwordField.value.length === 0) {
            forceHidden();
        }
    });

    demoSubmit?.addEventListener("click", () => {
        showToast("Demo only — nothing was submitted.");
    });

    forgotButton?.addEventListener("click", () => {
        showToast("Password recovery is not connected in this demo.");
    });

    window.addEventListener("pagehide", forceHidden);
    window.addEventListener("pageshow", (event) => {
        if (event.persisted) {
            forceHidden();
        }
    });
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            forceHidden();
        }
    });

    if (typeof motionPreference?.addEventListener === "function") {
        motionPreference.addEventListener("change", honorReducedMotion);
    } else if (typeof motionPreference?.addListener === "function") {
        motionPreference.addListener(honorReducedMotion);
    }

    renderCompletedState();
})();
