(() => {
    "use strict";

    const passwordField = document.getElementById("password");
    const passwordShell = document.getElementById("passwordShell");
    const redactionBand = document.getElementById("redactionBand");
    const toggleButton = document.getElementById("togglePassword");
    const toggleAction = document.getElementById("toggleAction");
    const visibilityState = document.getElementById("visibilityState");
    const fieldMessage = document.getElementById("fieldMessage");
    const liveStatus = document.getElementById("liveStatus");
    const demoSubmit = document.getElementById("demoSubmit");
    const accessHelp = document.getElementById("accessHelp");
    const demoToast = document.getElementById("demoToast");

    if (
        !passwordField ||
        !passwordShell ||
        !redactionBand ||
        !toggleButton ||
        !toggleAction ||
        !visibilityState
    ) {
        return;
    }

    const WIPE_DURATION = 760;
    const TYPE_SWITCH_DELAY = WIPE_DURATION / 2;
    const motionPreference = window.matchMedia?.("(prefers-reduced-motion: reduce)");

    let isVisible = false;
    let isAnimating = false;
    let activeTarget = null;
    let queuedTarget = null;
    let transitionToken = 0;
    let announcementTimer = null;
    let toastTimer = null;
    const transitionTimers = new Set();

    function scheduleTransition(callback, delay) {
        const timer = window.setTimeout(() => {
            transitionTimers.delete(timer);
            callback();
        }, delay);

        transitionTimers.add(timer);
        return timer;
    }

    function clearTransitionTimers() {
        transitionTimers.forEach((timer) => window.clearTimeout(timer));
        transitionTimers.clear();
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
        passwordShell.classList.remove("has-error");
        void passwordShell.offsetWidth;
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

    function setVisibilityType(visible) {
        const selectionStart = passwordField.selectionStart;
        const selectionEnd = passwordField.selectionEnd;

        passwordField.type = visible ? "text" : "password";

        if (selectionStart !== null && selectionEnd !== null) {
            try {
                passwordField.setSelectionRange(selectionStart, selectionEnd);
            } catch {
                // Some browsers do not restore selection ranges on password inputs.
            }
        }
    }

    function renderCompletedState() {
        const state = isVisible ? "revealed" : "hidden";

        passwordShell.dataset.state = state;
        passwordShell.setAttribute("aria-busy", "false");
        visibilityState.dataset.state = state;
        visibilityState.textContent = isVisible ? "Visible" : "Masked";
        toggleButton.dataset.visible = String(isVisible);
        toggleButton.classList.remove("is-busy");
        toggleButton.setAttribute("aria-pressed", String(isVisible));
        toggleButton.setAttribute("aria-label", isVisible ? "Hide password" : "Show password");
        toggleAction.textContent = isVisible ? "Conceal" : "Reveal";
    }

    function renderBusyState() {
        const hasQueuedChange = queuedTarget !== null;

        passwordShell.dataset.state = "wiping";
        passwordShell.setAttribute("aria-busy", "true");
        visibilityState.dataset.state = hasQueuedChange ? "queued" : "wiping";
        visibilityState.textContent = hasQueuedChange ? "Change queued" : "Working";
        toggleButton.classList.add("is-busy");

        if (hasQueuedChange) {
            const queuedAction = queuedTarget ? "reveal" : "conceal";
            toggleAction.textContent = `${queuedAction} queued`;
            toggleButton.setAttribute("aria-label", `Cancel queued password ${queuedAction}`);
        } else {
            const followUpAction = activeTarget ? "hide it afterward" : "show it afterward";
            toggleAction.textContent = activeTarget ? "Revealing..." : "Concealing...";
            toggleButton.setAttribute(
                "aria-label",
                `Password change in progress. Activate to ${followUpAction}`
            );
        }
    }

    function restartWipeAnimation() {
        redactionBand.classList.remove("is-active");
        void redactionBand.offsetWidth;
        redactionBand.classList.add("is-active");
    }

    function completeTransition(target, token) {
        if (token !== transitionToken || !isAnimating) {
            return;
        }

        redactionBand.classList.remove("is-active");
        passwordField.readOnly = false;
        isAnimating = false;
        activeTarget = null;
        renderCompletedState();

        const nextTarget = queuedTarget;
        queuedTarget = null;

        if (nextTarget !== null && nextTarget !== isVisible) {
            scheduleTransition(() => startTransition(nextTarget), 70);
            return;
        }

        announce(target ? "Password shown." : "Password hidden.");
    }

    function startTransition(target) {
        clearFieldMessage();

        if (target && passwordField.value.length === 0) {
            showFieldMessage("Enter a passphrase before revealing it.");
            announce("Enter a passphrase before revealing it.");
            passwordField.focus();
            return;
        }

        clearTransitionTimers();
        transitionToken += 1;
        const token = transitionToken;

        if (motionPreference?.matches) {
            setVisibilityType(target);
            isVisible = target;
            isAnimating = false;
            activeTarget = null;
            queuedTarget = null;
            passwordField.readOnly = false;
            renderCompletedState();
            announce(target ? "Password shown." : "Password hidden.");
            return;
        }

        isAnimating = true;
        activeTarget = target;
        queuedTarget = null;
        passwordField.readOnly = true;
        renderBusyState();
        restartWipeAnimation();

        scheduleTransition(() => {
            if (token !== transitionToken || !isAnimating) {
                return;
            }

            setVisibilityType(target);
            isVisible = target;
        }, TYPE_SWITCH_DELAY);

        scheduleTransition(() => completeTransition(target, token), WIPE_DURATION);
    }

    function requestToggle() {
        if (!isAnimating) {
            startTransition(!isVisible);
            return;
        }

        const pendingGoal = queuedTarget === null ? activeTarget : queuedTarget;
        const nextGoal = !pendingGoal;
        queuedTarget = nextGoal === activeTarget ? null : nextGoal;
        renderBusyState();
    }

    function forceHidden() {
        clearTransitionTimers();
        transitionToken += 1;
        isAnimating = false;
        activeTarget = null;
        queuedTarget = null;
        redactionBand.classList.remove("is-active");
        passwordField.readOnly = false;
        setVisibilityType(false);
        isVisible = false;
        renderCompletedState();

        if (liveStatus) {
            window.clearTimeout(announcementTimer);
            announcementTimer = null;
            liveStatus.textContent = "";
        }
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
        }, 2800);
    }

    toggleButton.addEventListener("click", requestToggle);

    passwordField.addEventListener("input", () => {
        clearFieldMessage();

        if (isVisible && passwordField.value.length === 0) {
            forceHidden();
        }
    });

    demoSubmit?.addEventListener("click", () => {
        showToast("Demo only — no credentials were sent.");
    });

    accessHelp?.addEventListener("click", () => {
        showToast("Access recovery is not connected in this demo.");
    });

    window.addEventListener("pagehide", forceHidden);
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            forceHidden();
        }
    });

    renderCompletedState();
})();
