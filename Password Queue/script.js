(() => {
    "use strict";

    const passwordField = document.getElementById("password");
    const passwordShell = document.getElementById("passwordShell");
    const conveyorStage = document.getElementById("conveyorStage");
    const conveyorWindow = document.getElementById("conveyorWindow");
    const conveyorTrack = document.getElementById("conveyorTrack");
    const incomingGlyph = document.getElementById("incomingGlyph");
    const toggleButton = document.getElementById("togglePassword");
    const toggleText = document.getElementById("toggleText");
    const visibilityState = document.getElementById("visibilityState");
    const fieldMessage = document.getElementById("fieldMessage");
    const liveStatus = document.getElementById("liveStatus");

    if (
        !passwordField ||
        !passwordShell ||
        !conveyorStage ||
        !conveyorWindow ||
        !conveyorTrack ||
        !incomingGlyph ||
        !toggleButton ||
        !toggleText ||
        !visibilityState
    ) {
        return;
    }

    const MOTION = Object.freeze({
        stepDuration: 260,
        stepPause: 20,
        maxTotalDuration: 2600,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)"
    });

    const MASK = "\u2022";
    const motionPreference = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const segmenter = typeof Intl?.Segmenter === "function"
        ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
        : null;

    let actualVisible = false;
    let desiredVisible = false;
    let isAnimating = false;
    let transitionGeneration = 0;
    let transitionSnapshot = null;
    let originalReadOnly = passwordField.readOnly;
    let announcementTimer = null;
    let pauseTimer = null;
    let pauseResolver = null;
    const activeAnimations = new Set();

    function splitGraphemes(value) {
        if (segmenter) {
            return Array.from(segmenter.segment(value), ({ segment }) => segment);
        }

        return Array.from(value);
    }

    function captureInputState() {
        return {
            value: passwordField.value,
            selectionStart: passwordField.selectionStart,
            selectionEnd: passwordField.selectionEnd,
            selectionDirection: passwordField.selectionDirection,
            scrollLeft: passwordField.scrollLeft,
            wasFocused: document.activeElement === passwordField
        };
    }

    function setPasswordVisibility(visible, snapshot = captureInputState(), restoreFocus = true) {
        passwordField.type = visible ? "text" : "password";

        if (snapshot.selectionStart !== null && snapshot.selectionEnd !== null) {
            try {
                passwordField.setSelectionRange(
                    snapshot.selectionStart,
                    snapshot.selectionEnd,
                    snapshot.selectionDirection ?? "none"
                );
            } catch {
                // Selection restoration is not available for every password input.
            }
        }

        passwordField.scrollLeft = snapshot.scrollLeft;

        if (
            restoreFocus &&
            snapshot.wasFocused &&
            !document.hidden &&
            document.activeElement !== passwordField
        ) {
            passwordField.focus({ preventScroll: true });
        }
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
        passwordShell.classList.add("has-error");
    }

    function clearFieldMessage() {
        if (!fieldMessage) {
            return;
        }

        fieldMessage.textContent = "";
        passwordShell.classList.remove("has-error");
    }

    function renderCompletedState() {
        const state = actualVisible ? "revealed" : "hidden";

        passwordShell.dataset.state = state;
        passwordShell.setAttribute("aria-busy", "false");
        visibilityState.textContent = actualVisible ? "Visible" : "Hidden";
        toggleButton.setAttribute("aria-pressed", String(actualVisible));
        toggleButton.setAttribute("aria-label", actualVisible ? "Hide password" : "Reveal password");
        toggleText.textContent = actualVisible ? "Hide" : "Reveal";
    }

    function renderRunningState(targetVisible) {
        passwordShell.dataset.state = "running";
        passwordShell.setAttribute("aria-busy", "true");
        visibilityState.textContent = targetVisible ? "Revealing…" : "Hiding…";
        toggleButton.setAttribute("aria-pressed", String(actualVisible));
        toggleButton.setAttribute(
            "aria-label",
            targetVisible ? "Cancel password reveal" : "Cancel password hiding"
        );
        toggleText.textContent = "Cancel";
    }

    function createGlyph(glyph) {
        const element = document.createElement("span");
        element.className = "conveyor-glyph";
        element.textContent = glyph;
        return element;
    }

    function renderRow(glyphs) {
        conveyorTrack.replaceChildren(...glyphs.map(createGlyph));
    }

    function measureAdvance(graphemes) {
        const probe = document.createElement("span");
        probe.className = "conveyor-probe";
        conveyorStage.append(probe);

        let widest = 0;
        [...graphemes, MASK].forEach((grapheme) => {
            probe.textContent = grapheme;
            widest = Math.max(widest, probe.getBoundingClientRect().width);
        });

        probe.remove();
        return Math.max(1, Math.ceil(widest));
    }

    function buildConveyor(targetVisible, snapshot) {
        const graphemes = splitGraphemes(snapshot.value);
        const masks = Array(graphemes.length).fill(MASK);
        const current = targetVisible ? [...masks] : [...graphemes];
        const feed = targetVisible ? [...graphemes] : [...masks];

        renderRow(current);
        conveyorTrack.style.transform = "translate3d(0, 0, 0)";
        incomingGlyph.textContent = "";
        incomingGlyph.style.removeProperty("transform");
        conveyorStage.hidden = false;
        passwordShell.classList.add("is-running");

        const advance = measureAdvance(graphemes);
        conveyorStage.style.setProperty("--advance", `${advance}px`);
        conveyorWindow.style.width = `${advance * graphemes.length}px`;

        return {
            advance,
            characterTotal: graphemes.length,
            current,
            feed
        };
    }

    function getSequenceTiming(characterTotal) {
        const nominalTotal =
            characterTotal * MOTION.stepDuration +
            Math.max(0, characterTotal - 1) * MOTION.stepPause;
        const scale = nominalTotal > MOTION.maxTotalDuration
            ? MOTION.maxTotalDuration / nominalTotal
            : 1;

        return {
            stepDuration: MOTION.stepDuration * scale,
            stepPause: MOTION.stepPause * scale
        };
    }

    function getStepGeometry(characterTotal, advance) {
        const stageRect = conveyorStage.getBoundingClientRect();
        const buttonRect = toggleButton.getBoundingClientRect();
        const buttonLeft = buttonRect.left - stageRect.left;
        const buttonInset = Math.max(8, (buttonRect.width - advance) / 2);

        return {
            startX: buttonLeft + buttonInset,
            landingX: Math.max(0, (characterTotal - 1) * advance)
        };
    }

    function registerAnimation(animation) {
        activeAnimations.add(animation);
        return animation;
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

    async function animateStep(nextGlyph, characterTotal, advance, duration) {
        const geometry = getStepGeometry(characterTotal, advance);
        const rowStart = "translate3d(0px, 0, 0)";
        const rowEnd = `translate3d(-${advance}px, 0, 0)`;
        const incomingStart = `translate3d(${geometry.startX}px, 0, 0)`;
        const incomingEnd = `translate3d(${geometry.landingX}px, 0, 0)`;

        conveyorTrack.style.transform = rowStart;
        incomingGlyph.textContent = nextGlyph;
        incomingGlyph.style.transform = incomingStart;
        void conveyorStage.offsetWidth;

        const timing = {
            duration,
            easing: MOTION.easing,
            fill: "both"
        };
        const rowAnimation = registerAnimation(
            conveyorTrack.animate(
                [
                    { transform: rowStart },
                    { transform: rowEnd }
                ],
                timing
            )
        );
        const incomingAnimation = registerAnimation(
            incomingGlyph.animate(
                [
                    { transform: incomingStart },
                    { transform: incomingEnd }
                ],
                timing
            )
        );
        const sharedStartTime = document.timeline?.currentTime;

        if (sharedStartTime !== null && sharedStartTime !== undefined) {
            rowAnimation.startTime = sharedStartTime;
            incomingAnimation.startTime = sharedStartTime;
        }

        const animations = [rowAnimation, incomingAnimation];
        const completed = await waitForAnimations(animations);
        return { animations, completed };
    }

    function cancelAnimations(animations = activeAnimations) {
        Array.from(animations).forEach((animation) => {
            try {
                animation.cancel();
            } catch {
                // The animation may already be finished.
            }
            activeAnimations.delete(animation);
        });
    }

    function waitForStepPause(duration) {
        if (duration <= 0) {
            return Promise.resolve(true);
        }

        return new Promise((resolve) => {
            pauseResolver = resolve;
            pauseTimer = window.setTimeout(() => {
                pauseTimer = null;
                pauseResolver = null;
                resolve(true);
            }, duration);
        });
    }

    function cancelStepPause() {
        if (pauseTimer !== null) {
            window.clearTimeout(pauseTimer);
            pauseTimer = null;
        }

        if (pauseResolver) {
            const resolve = pauseResolver;
            pauseResolver = null;
            resolve(false);
        }
    }

    function commitStep(nextRow, animations) {
        renderRow(nextRow);
        incomingGlyph.textContent = "";
        cancelAnimations(animations);
        conveyorTrack.style.transform = "translate3d(0, 0, 0)";
        incomingGlyph.style.removeProperty("transform");
    }

    function cleanupConveyor() {
        cancelStepPause();
        cancelAnimations();

        [conveyorTrack, incomingGlyph].forEach((element) => {
            if (typeof element.getAnimations !== "function") {
                return;
            }

            element.getAnimations().forEach((animation) => {
                try {
                    animation.cancel();
                } catch {
                    // Removing the animated nodes discards finished effects.
                }
            });
        });

        conveyorTrack.replaceChildren();
        conveyorTrack.style.removeProperty("transform");
        incomingGlyph.textContent = "";
        incomingGlyph.style.removeProperty("transform");
        conveyorStage.style.removeProperty("--advance");
        conveyorWindow.style.removeProperty("width");
        conveyorStage.hidden = true;
        passwordShell.classList.remove("is-running");
    }

    async function runConveyor(targetVisible) {
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

        // Hide the native value before a cleartext proxy row can be painted.
        if (!targetVisible) {
            setPasswordVisibility(false, transitionSnapshot);
        }

        renderRunningState(targetVisible);
        const conveyor = buildConveyor(targetVisible, transitionSnapshot);
        const timing = getSequenceTiming(conveyor.characterTotal);
        let currentRow = conveyor.current;

        try {
            for (let step = 0; step < conveyor.characterTotal; step += 1) {
                const result = await animateStep(
                    conveyor.feed[step],
                    conveyor.characterTotal,
                    conveyor.advance,
                    timing.stepDuration
                );

                if (
                    !result.completed ||
                    generation !== transitionGeneration ||
                    passwordField.value !== transitionSnapshot.value
                ) {
                    return;
                }

                currentRow = [...currentRow.slice(1), conveyor.feed[step]];
                commitStep(currentRow, result.animations);

                if (step < conveyor.characterTotal - 1) {
                    const pauseCompleted = await waitForStepPause(timing.stepPause);

                    if (!pauseCompleted || generation !== transitionGeneration) {
                        return;
                    }
                }
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
                    actualVisible = false;
                    desiredVisible = false;
                    setPasswordVisibility(false, transitionSnapshot);
                }

                cleanupConveyor();
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
        cleanupConveyor();
        setPasswordVisibility(actualVisible, transitionSnapshot ?? captureInputState());
        passwordField.readOnly = originalReadOnly;
        desiredVisible = actualVisible;
        transitionSnapshot = null;
        isAnimating = false;
        renderCompletedState();
    }

    function requestToggle() {
        if (isAnimating) {
            cancelToCompletedState();
            return;
        }

        const targetVisible = !actualVisible;

        if (targetVisible && passwordField.value.length === 0) {
            showFieldMessage("Enter a password before revealing it.");
            passwordField.focus();
            return;
        }

        clearFieldMessage();
        void runConveyor(targetVisible);
    }

    function forceHidden(restoreFocus = false) {
        const readOnlyState = isAnimating ? originalReadOnly : passwordField.readOnly;
        const snapshot = transitionSnapshot ?? captureInputState();

        transitionGeneration += 1;
        cleanupConveyor();
        isAnimating = false;
        actualVisible = false;
        desiredVisible = false;
        transitionSnapshot = null;
        passwordField.readOnly = readOnlyState;
        setPasswordVisibility(false, snapshot, restoreFocus);
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
        cleanupConveyor();
        isAnimating = false;

        if (passwordField.value !== snapshot.value) {
            actualVisible = false;
            desiredVisible = false;
            setPasswordVisibility(false, captureInputState());
        } else {
            setPasswordVisibility(targetVisible, snapshot);
            actualVisible = targetVisible;
            desiredVisible = targetVisible;
        }

        passwordField.readOnly = originalReadOnly;
        transitionSnapshot = null;
        renderCompletedState();
        announce(actualVisible ? "Password revealed." : "Password hidden.");
    }

    toggleButton.addEventListener("pointerdown", (event) => {
        if (document.activeElement === passwordField) {
            event.preventDefault();
        }
    });
    toggleButton.addEventListener("click", requestToggle);

    passwordField.addEventListener("input", () => {
        clearFieldMessage();

        if (
            isAnimating &&
            transitionSnapshot &&
            passwordField.value !== transitionSnapshot.value
        ) {
            forceHidden(true);
            return;
        }

        if (actualVisible && passwordField.value.length === 0) {
            forceHidden(true);
        }
    });

    window.addEventListener("resize", () => {
        if (isAnimating) {
            cancelToCompletedState();
        }
    });
    window.addEventListener("pagehide", () => forceHidden(false));
    window.addEventListener("pageshow", (event) => {
        if (event.persisted) {
            forceHidden(false);
        }
    });
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            forceHidden(false);
        }
    });

    if (typeof motionPreference?.addEventListener === "function") {
        motionPreference.addEventListener("change", settleForReducedMotion);
    } else if (typeof motionPreference?.addListener === "function") {
        motionPreference.addListener(settleForReducedMotion);
    }

    renderCompletedState();
})();
