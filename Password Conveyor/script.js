(() => {
    "use strict";

    const passwordField = document.getElementById("password");
    const passwordShell = document.getElementById("passwordShell");
    const conveyorStage = document.getElementById("conveyorStage");
    const conveyorWindow = document.getElementById("conveyorWindow");
    const conveyorTrack = document.getElementById("conveyorTrack");
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
        !toggleButton ||
        !toggleText ||
        !visibilityState
    ) {
        return;
    }

    const MOTION = Object.freeze({
        moveDuration: 180,
        holdDuration: 25,
        maxTotalDuration: 2200,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)"
    });

    const MASK = "•";
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
    let activeAnimation = null;
    let announcementTimer = null;

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
        const masterSequence = targetVisible
            ? [...masks, ...graphemes]
            : [...graphemes, ...masks];

        conveyorTrack.replaceChildren();
        conveyorTrack.style.transform = "translateX(0)";

        masterSequence.forEach((grapheme) => {
            const glyph = document.createElement("span");
            glyph.className = "conveyor-glyph";
            glyph.textContent = grapheme;
            conveyorTrack.append(glyph);
        });

        conveyorStage.hidden = false;
        passwordShell.classList.add("is-running");

        const advance = measureAdvance(graphemes);
        const fullWindowWidth = advance * graphemes.length;
        conveyorTrack.style.setProperty("--advance", `${advance}px`);
        conveyorWindow.style.width = `${fullWindowWidth}px`;

        return {
            advance,
            characterTotal: graphemes.length
        };
    }

    function getSequenceTiming(characterTotal) {
        const nominalTotal =
            characterTotal * MOTION.moveDuration +
            Math.max(0, characterTotal - 1) * MOTION.holdDuration;
        const scale = nominalTotal > MOTION.maxTotalDuration
            ? MOTION.maxTotalDuration / nominalTotal
            : 1;
        const moveDuration = MOTION.moveDuration * scale;
        const holdDuration = MOTION.holdDuration * scale;
        const totalDuration =
            characterTotal * moveDuration +
            Math.max(0, characterTotal - 1) * holdDuration;

        return { moveDuration, holdDuration, totalDuration };
    }

    function createConveyorKeyframes(characterTotal, advance, timing) {
        const keyframes = [
            {
                transform: "translateX(0px)",
                offset: 0,
                easing: MOTION.easing
            }
        ];
        let elapsed = 0;

        for (let step = 1; step <= characterTotal; step += 1) {
            const position = `translateX(-${step * advance}px)`;
            elapsed += timing.moveDuration;
            keyframes.push({
                transform: position,
                offset: elapsed / timing.totalDuration,
                easing: "linear"
            });

            if (step < characterTotal) {
                elapsed += timing.holdDuration;
                keyframes.push({
                    transform: position,
                    offset: elapsed / timing.totalDuration,
                    easing: MOTION.easing
                });
            }
        }

        keyframes[keyframes.length - 1].offset = 1;
        return keyframes;
    }

    function cancelActiveAnimation() {
        if (!activeAnimation) {
            return;
        }

        try {
            activeAnimation.cancel();
        } catch {
            // The animation may already be finished.
        }
        activeAnimation = null;
    }

    function cleanupConveyor() {
        cancelActiveAnimation();

        if (typeof conveyorTrack.getAnimations === "function") {
            conveyorTrack.getAnimations().forEach((animation) => {
                try {
                    animation.cancel();
                } catch {
                    // Removing the track will discard any finished effect.
                }
            });
        }

        conveyorTrack.replaceChildren();
        conveyorTrack.style.removeProperty("--advance");
        conveyorTrack.style.removeProperty("transform");
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

        const { advance, characterTotal } = buildConveyor(
            targetVisible,
            transitionSnapshot
        );
        const timing = getSequenceTiming(characterTotal);
        const keyframes = createConveyorKeyframes(
            characterTotal,
            advance,
            timing
        );

        renderRunningState(targetVisible);

        // Hide the native value before any cleartext proxy frame is painted.
        if (!targetVisible) {
            setPasswordVisibility(false, transitionSnapshot);
        }

        try {
            activeAnimation = conveyorTrack.animate(keyframes, {
                duration: timing.totalDuration,
                easing: "linear",
                fill: "both"
            });

            await activeAnimation.finished;

            if (generation !== transitionGeneration) {
                return;
            }

            if (passwordField.value !== transitionSnapshot.value) {
                actualVisible = false;
                desiredVisible = false;
                setPasswordVisibility(false, captureInputState());
                return;
            }

            if (targetVisible) {
                setPasswordVisibility(true, transitionSnapshot);
            }

            actualVisible = targetVisible;
            desiredVisible = targetVisible;
            committed = true;
        } catch {
            // Cancellation is expected when the user stops an active conveyor.
        } finally {
            if (generation === transitionGeneration) {
                if (!committed) {
                    desiredVisible = actualVisible;
                    setPasswordVisibility(actualVisible, transitionSnapshot);
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
