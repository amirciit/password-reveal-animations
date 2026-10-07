(() => {
    "use strict";

    const passwordField = document.getElementById("password");
    const passwordShell = document.getElementById("passwordShell");
    const characterStage = document.getElementById("characterStage");
    const characterTrack = document.getElementById("characterTrack");
    const sequenceBeam = document.getElementById("sequenceBeam");
    const toggleButton = document.getElementById("togglePassword");
    const toggleText = document.getElementById("toggleText");
    const visibilityState = document.getElementById("visibilityState");
    const characterCount = document.getElementById("characterCount");
    const fieldMessage = document.getElementById("fieldMessage");
    const liveStatus = document.getElementById("liveStatus");
    const demoSubmit = document.getElementById("demoSubmit");
    const forgotButton = document.getElementById("forgotButton");
    const demoToast = document.getElementById("demoToast");

    if (
        !passwordField ||
        !passwordShell ||
        !characterStage ||
        !characterTrack ||
        !toggleButton ||
        !toggleText ||
        !visibilityState
    ) {
        return;
    }

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

    const MASK = "•";
    const motionPreference = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const graphemeSegmenter = typeof Intl?.Segmenter === "function"
        ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
        : null;

    let actualVisible = false;
    let desiredVisible = false;
    let isAnimating = false;
    let transitionGeneration = 0;
    let originalReadOnly = passwordField.readOnly;
    let transitionSnapshot = null;
    let announcementTimer = null;
    let toastTimer = null;
    const activeAnimations = new Set();

    function splitGraphemes(value) {
        if (graphemeSegmenter) {
            return Array.from(graphemeSegmenter.segment(value), ({ segment }) => segment);
        }

        return Array.from(value);
    }

    function updateCharacterCount() {
        if (!characterCount) {
            return;
        }

        const count = splitGraphemes(passwordField.value).length;
        characterCount.textContent = `${count} ${count === 1 ? "character" : "characters"}`;
    }

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

    function captureInputState() {
        return {
            selectionStart: passwordField.selectionStart,
            selectionEnd: passwordField.selectionEnd,
            selectionDirection: passwordField.selectionDirection,
            scrollLeft: passwordField.scrollLeft,
            wasFocused: document.activeElement === passwordField
        };
    }

    function setPasswordVisibility(visible, snapshot = captureInputState()) {
        passwordField.type = visible ? "text" : "password";

        if (snapshot.selectionStart !== null && snapshot.selectionEnd !== null) {
            try {
                passwordField.setSelectionRange(
                    snapshot.selectionStart,
                    snapshot.selectionEnd,
                    snapshot.selectionDirection ?? "none"
                );
            } catch {
                // Some browsers do not restore a selection on password inputs.
            }
        }

        passwordField.scrollLeft = snapshot.scrollLeft;

        if (snapshot.wasFocused && document.activeElement !== passwordField) {
            passwordField.focus({ preventScroll: true });
        }
    }

    function renderCompletedState() {
        const state = actualVisible ? "revealed" : "hidden";

        passwordShell.dataset.state = state;
        passwordShell.setAttribute("aria-busy", "false");
        visibilityState.dataset.state = state;
        visibilityState.textContent = actualVisible ? "Visible" : "Hidden";
        toggleButton.dataset.visible = String(actualVisible);
        toggleButton.setAttribute("aria-label", actualVisible ? "Mask password" : "Reveal password");
        toggleText.textContent = actualVisible ? "Mask" : "Reveal";
    }

    function renderSequencingState(targetVisible) {
        passwordShell.dataset.state = "sequencing";
        passwordShell.setAttribute("aria-busy", "true");
        visibilityState.dataset.state = "sequencing";
        visibilityState.textContent = targetVisible ? "Revealing ←" : "Hiding ←";
        toggleButton.dataset.visible = String(targetVisible);
        toggleButton.setAttribute(
            "aria-label",
            targetVisible ? "Cancel password reveal" : "Cancel password hiding"
        );
        toggleText.textContent = "Cancel";
    }

    function registerAnimation(animation) {
        activeAnimations.add(animation);
        return animation;
    }

    function cancelAnimations() {
        activeAnimations.forEach((animation) => {
            try {
                animation.cancel();
            } catch {
                // An already-finished animation needs no further cleanup.
            }
        });
        activeAnimations.clear();
    }

    async function waitForAnimations(animations) {
        const results = await Promise.all(
            animations.map(async (animation) => {
                try {
                    await animation.finished;
                    return true;
                } catch {
                    return false;
                } finally {
                    activeAnimations.delete(animation);
                }
            })
        );

        return results.every(Boolean);
    }

    function getStagger(characterTotal) {
        if (characterTotal <= 1) {
            return 0;
        }

        const cappedStagger =
            (MOTION.maxSequenceDuration - MOTION.characterDuration) /
            (characterTotal - 1);

        return Math.max(0, Math.min(MOTION.characterStagger, cappedStagger));
    }

    function buildCharacterStage(targetVisible, snapshot) {
        const graphemes = splitGraphemes(passwordField.value);
        const cells = [];

        characterTrack.replaceChildren();
        characterTrack.style.transform = `translateX(-${snapshot.scrollLeft}px)`;

        graphemes.forEach((grapheme) => {
            const cell = document.createElement("span");
            const outgoing = document.createElement("span");
            const incoming = document.createElement("span");

            cell.className = "character-cell";
            outgoing.className = "character-layer character-outgoing";
            incoming.className = "character-layer character-incoming";
            outgoing.textContent = targetVisible ? MASK : grapheme;
            incoming.textContent = targetVisible ? grapheme : MASK;

            cell.append(outgoing, incoming);
            characterTrack.append(cell);
            cells.push({ cell, outgoing, incoming });
        });

        characterStage.hidden = false;
        passwordShell.classList.add("is-sequencing");

        return { cells, characterTotal: graphemes.length };
    }

    function createCascadeAnimations(cells, stagger) {
        const animations = [];
        const characterTotal = cells.length;

        cells.forEach(({ cell, outgoing, incoming }, index) => {
            const rightToLeftOrder = characterTotal - 1 - index;
            const delay = rightToLeftOrder * stagger;
            const timing = {
                duration: MOTION.characterDuration,
                delay,
                fill: "both"
            };

            animations.push(
                registerAnimation(
                    outgoing.animate(
                        [
                            {
                                opacity: 1,
                                transform: "translateX(0) scale(1)",
                                filter: "blur(0px)"
                            },
                            {
                                opacity: 0.45,
                                transform: `translateX(-${MOTION.exitDistance * 0.45}px) scale(0.96)`,
                                filter: "blur(1.5px)",
                                offset: 0.52
                            },
                            {
                                opacity: 0,
                                transform: `translateX(-${MOTION.exitDistance}px) scale(0.88)`,
                                filter: `blur(${MOTION.blur}px)`
                            }
                        ],
                        { ...timing, easing: MOTION.exitEasing }
                    )
                ),
                registerAnimation(
                    incoming.animate(
                        [
                            {
                                opacity: 0,
                                transform: `translateX(${MOTION.enterDistance}px) scale(0.88)`,
                                filter: `blur(${MOTION.blur}px)`,
                                color: "#d7f56a"
                            },
                            {
                                opacity: 0,
                                transform: `translateX(${MOTION.enterDistance}px) scale(0.9)`,
                                filter: `blur(${MOTION.blur}px)`,
                                color: "#d7f56a",
                                offset: 0.18
                            },
                            {
                                opacity: 1,
                                transform: "translateX(0) scale(1.06)",
                                filter: "blur(0px)",
                                color: "#d7f56a",
                                offset: 0.72
                            },
                            {
                                opacity: 1,
                                transform: "translateX(0) scale(1)",
                                filter: "blur(0px)",
                                color: "#f7faef"
                            }
                        ],
                        { ...timing, easing: MOTION.enterEasing }
                    )
                ),
                registerAnimation(
                    cell.animate(
                        [
                            { backgroundColor: "rgba(215, 245, 106, 0)", transform: "scale(1)" },
                            {
                                backgroundColor: "rgba(215, 245, 106, 0.2)",
                                transform: "scale(1.08)",
                                offset: 0.62
                            },
                            { backgroundColor: "rgba(215, 245, 106, 0)", transform: "scale(1)" }
                        ],
                        { ...timing, easing: MOTION.enterEasing }
                    )
                )
            );
        });

        return animations;
    }

    function createBeamAnimation(duration) {
        if (!sequenceBeam || typeof sequenceBeam.animate !== "function") {
            return null;
        }

        return registerAnimation(
            sequenceBeam.animate(
                [
                    { opacity: 0, transform: "translateX(0)" },
                    { opacity: 0.85, transform: "translateX(-40%)", offset: 0.12 },
                    { opacity: 0.55, transform: "translateX(-280%)", offset: 0.82 },
                    { opacity: 0, transform: "translateX(-380%)" }
                ],
                {
                    duration,
                    easing: "cubic-bezier(0.4, 0, 0.2, 1)",
                    fill: "both"
                }
            )
        );
    }

    function cleanupCharacterStage() {
        cancelAnimations();
        characterStage.getAnimations({ subtree: true }).forEach((animation) => {
            try {
                animation.cancel();
            } catch {
                // Finished proxy effects can be discarded with their nodes.
            }
        });
        characterTrack.replaceChildren();
        characterTrack.style.removeProperty("transform");
        characterStage.hidden = true;
        passwordShell.classList.remove("is-sequencing");
        passwordShell.style.removeProperty("--sequence-duration");
    }

    async function runCascade(targetVisible) {
        if (
            motionPreference?.matches ||
            typeof Element.prototype.animate !== "function"
        ) {
            const snapshot = captureInputState();
            setPasswordVisibility(targetVisible, snapshot);
            actualVisible = targetVisible;
            desiredVisible = targetVisible;
            renderCompletedState();
            announce(targetVisible ? "Password revealed." : "Password hidden.");
            return;
        }

        isAnimating = true;
        desiredVisible = targetVisible;
        originalReadOnly = passwordField.readOnly;
        transitionSnapshot = captureInputState();
        passwordField.readOnly = true;
        const generation = ++transitionGeneration;
        let committed = false;

        const { cells, characterTotal } = buildCharacterStage(
            targetVisible,
            transitionSnapshot
        );
        const stagger = getStagger(characterTotal);
        const cascadeDuration =
            MOTION.characterDuration + Math.max(0, characterTotal - 1) * stagger;
        const totalDuration = cascadeDuration + MOTION.beamTail;

        passwordShell.style.setProperty("--sequence-duration", `${totalDuration}ms`);
        renderSequencingState(targetVisible);

        // Hiding masks the native input immediately; the temporary layer then
        // shows the requested per-character clear-text-to-bullet sequence.
        if (!targetVisible) {
            setPasswordVisibility(false, transitionSnapshot);
        }

        try {
            const animations = createCascadeAnimations(cells, stagger);
            const beamAnimation = createBeamAnimation(totalDuration);

            if (beamAnimation) {
                animations.push(beamAnimation);
            }

            const completed = await waitForAnimations(animations);

            if (!completed || generation !== transitionGeneration) {
                return;
            }

            if (targetVisible) {
                setPasswordVisibility(true, transitionSnapshot);
            }

            actualVisible = targetVisible;
            desiredVisible = targetVisible;
            committed = true;
        } finally {
            if (generation === transitionGeneration) {
                if (!committed) {
                    setPasswordVisibility(actualVisible, transitionSnapshot);
                    desiredVisible = actualVisible;
                }

                cleanupCharacterStage();
                passwordField.readOnly = originalReadOnly;
                transitionSnapshot = null;
                isAnimating = false;
                renderCompletedState();
                announce(actualVisible ? "Password revealed." : "Password hidden.");
            }
        }
    }

    function cancelToCompletedState() {
        if (!isAnimating) {
            return;
        }

        transitionGeneration += 1;
        cleanupCharacterStage();
        setPasswordVisibility(actualVisible, transitionSnapshot ?? captureInputState());
        passwordField.readOnly = originalReadOnly;
        desiredVisible = actualVisible;
        transitionSnapshot = null;
        isAnimating = false;
        renderCompletedState();
    }

    function requestToggle() {
        const nextTarget = !desiredVisible;

        if (nextTarget && passwordField.value.length === 0) {
            desiredVisible = false;
            showFieldMessage("Enter a password before revealing it.");
            passwordField.focus();
            return;
        }

        clearFieldMessage();
        desiredVisible = nextTarget;

        if (isAnimating) {
            cancelToCompletedState();
            return;
        }

        void runCascade(nextTarget);
    }

    function forceHidden() {
        const readOnlyState = isAnimating ? originalReadOnly : passwordField.readOnly;
        const snapshot = transitionSnapshot ?? captureInputState();

        transitionGeneration += 1;
        cleanupCharacterStage();
        isAnimating = false;
        desiredVisible = false;
        actualVisible = false;
        transitionSnapshot = null;
        passwordField.readOnly = readOnlyState;
        setPasswordVisibility(false, snapshot);
        renderCompletedState();

        if (liveStatus) {
            window.clearTimeout(announcementTimer);
            announcementTimer = null;
            liveStatus.textContent = "";
        }
    }

    function settleForReducedMotion(event) {
        if (!event.matches || !isAnimating) {
            return;
        }

        const targetVisible = desiredVisible;
        const snapshot = transitionSnapshot ?? captureInputState();

        transitionGeneration += 1;
        cleanupCharacterStage();
        isAnimating = false;
        setPasswordVisibility(targetVisible, snapshot);
        actualVisible = targetVisible;
        desiredVisible = targetVisible;
        passwordField.readOnly = originalReadOnly;
        transitionSnapshot = null;
        renderCompletedState();
        announce(targetVisible ? "Password revealed." : "Password hidden.");
    }

    function showToast(message) {
        if (!demoToast) {
            return;
        }

        window.clearTimeout(toastTimer);
        demoToast.textContent = message;
        demoToast.setAttribute("aria-hidden", "false");
        demoToast.classList.add("is-visible");
        toastTimer = window.setTimeout(() => {
            demoToast.classList.remove("is-visible");
            demoToast.setAttribute("aria-hidden", "true");
        }, 2600);
    }

    toggleButton.addEventListener("pointerdown", (event) => {
        if (document.activeElement === passwordField) {
            event.preventDefault();
        }
    });
    toggleButton.addEventListener("click", requestToggle);

    passwordField.addEventListener("input", () => {
        clearFieldMessage();
        updateCharacterCount();

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
        motionPreference.addEventListener("change", settleForReducedMotion);
    } else if (typeof motionPreference?.addListener === "function") {
        motionPreference.addListener(settleForReducedMotion);
    }

    updateCharacterCount();
    renderCompletedState();
})();
