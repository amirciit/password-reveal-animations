(() => {
    "use strict";

    const passwordField = document.getElementById("password");
    const passwordShell = document.getElementById("passwordShell");
    const shutterArray = document.getElementById("shutterArray");
    const toggleButton = document.getElementById("togglePassword");
    const leverAction = document.getElementById("leverAction");
    const securityState = document.getElementById("securityState");
    const systemReadout = document.querySelector(".system-readout");
    const systemState = document.getElementById("systemState");
    const fieldMessage = document.getElementById("fieldMessage");
    const liveStatus = document.getElementById("liveStatus");
    const demoSubmit = document.getElementById("demoSubmit");
    const recoveryButton = document.getElementById("recoveryButton");
    const demoToast = document.getElementById("demoToast");

    if (
        !passwordField ||
        !passwordShell ||
        !shutterArray ||
        !toggleButton ||
        !leverAction ||
        !securityState ||
        !systemState
    ) {
        return;
    }

    const BLADE_ANIMATION_DURATION = 700;
    const BLADE_STAGGER = 22;
    const BLADE_COUNT = 6;
    const SHUTTER_CYCLE_DURATION =
        BLADE_ANIMATION_DURATION + BLADE_STAGGER * (BLADE_COUNT - 1) + 10;
    const TYPE_SWITCH_DELAY = 400;
    const motionPreference = window.matchMedia?.("(prefers-reduced-motion: reduce)");

    let isVisible = false;
    let isCycling = false;
    let activeTarget = null;
    let queuedTarget = null;
    let cycleToken = 0;
    let announcementTimer = null;
    let toastTimer = null;
    const cycleTimers = new Set();

    function scheduleCycle(callback, delay) {
        const timer = window.setTimeout(() => {
            cycleTimers.delete(timer);
            callback();
        }, delay);

        cycleTimers.add(timer);
        return timer;
    }

    function clearCycleTimers() {
        cycleTimers.forEach((timer) => window.clearTimeout(timer));
        cycleTimers.clear();
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

    function setPasswordVisibility(visible) {
        const selectionStart = passwordField.selectionStart;
        const selectionEnd = passwordField.selectionEnd;

        passwordField.type = visible ? "text" : "password";

        if (selectionStart !== null && selectionEnd !== null) {
            try {
                passwordField.setSelectionRange(selectionStart, selectionEnd);
            } catch {
                // Selection restoration is not supported on every password input.
            }
        }
    }

    function renderCompletedState() {
        const state = isVisible ? "revealed" : "hidden";

        passwordShell.dataset.state = state;
        passwordShell.setAttribute("aria-busy", "false");
        securityState.dataset.state = state;
        securityState.textContent = isVisible ? "Exposed" : "Secured";
        toggleButton.dataset.visible = String(isVisible);
        toggleButton.classList.remove("is-cycling");
        toggleButton.setAttribute("aria-pressed", String(isVisible));
        toggleButton.setAttribute("aria-label", isVisible ? "Conceal password" : "Reveal password");
        leverAction.textContent = isVisible ? "Seal password" : "Unseal password";
        systemReadout?.classList.remove("is-cycling");
        systemState.textContent = "System ready";
    }

    function renderCyclingState() {
        const hasQueuedCommand = queuedTarget !== null;

        passwordShell.dataset.state = "cycling";
        passwordShell.setAttribute("aria-busy", "true");
        securityState.dataset.state = hasQueuedCommand ? "queued" : "cycling";
        securityState.textContent = hasQueuedCommand ? "Command queued" : "Cycling";
        toggleButton.classList.add("is-cycling");
        systemReadout?.classList.add("is-cycling");
        systemState.textContent = hasQueuedCommand ? "Command queued" : "Shutters cycling";

        if (hasQueuedCommand) {
            const queuedAction = queuedTarget ? "reveal" : "conceal";
            leverAction.textContent = `${queuedAction} queued`;
            toggleButton.setAttribute("aria-label", `Cancel queued password ${queuedAction}`);
        } else {
            const followUpAction = activeTarget ? "conceal it afterward" : "reveal it afterward";
            leverAction.textContent = activeTarget ? "Unsealing..." : "Sealing...";
            toggleButton.setAttribute(
                "aria-label",
                `Shutters cycling. Activate to ${followUpAction}`
            );
        }
    }

    function restartShutters() {
        shutterArray.classList.remove("is-active");
        void shutterArray.offsetWidth;
        shutterArray.classList.add("is-active");
    }

    function completeCycle(target, token) {
        if (token !== cycleToken || !isCycling) {
            return;
        }

        shutterArray.classList.remove("is-active");
        passwordField.readOnly = false;
        isCycling = false;
        activeTarget = null;
        renderCompletedState();

        const nextTarget = queuedTarget;
        queuedTarget = null;

        if (nextTarget !== null && nextTarget !== isVisible) {
            scheduleCycle(() => startCycle(nextTarget), 70);
            return;
        }

        announce(target ? "Password revealed." : "Password concealed.");
    }

    function startCycle(target) {
        clearFieldMessage();

        if (target && passwordField.value.length === 0) {
            showFieldMessage("Enter an access key before unsealing it.");
            announce("Enter an access key before unsealing it.");
            passwordField.focus();
            return;
        }

        clearCycleTimers();
        cycleToken += 1;
        const token = cycleToken;

        if (motionPreference?.matches) {
            setPasswordVisibility(target);
            isVisible = target;
            isCycling = false;
            activeTarget = null;
            queuedTarget = null;
            passwordField.readOnly = false;
            renderCompletedState();
            announce(target ? "Password revealed." : "Password concealed.");
            return;
        }

        isCycling = true;
        activeTarget = target;
        queuedTarget = null;
        passwordField.readOnly = true;
        renderCyclingState();
        restartShutters();

        scheduleCycle(() => {
            if (token !== cycleToken || !isCycling) {
                return;
            }

            setPasswordVisibility(target);
            isVisible = target;
        }, TYPE_SWITCH_DELAY);

        scheduleCycle(() => completeCycle(target, token), SHUTTER_CYCLE_DURATION);
    }

    function requestToggle() {
        if (!isCycling) {
            startCycle(!isVisible);
            return;
        }

        const pendingGoal = queuedTarget === null ? activeTarget : queuedTarget;
        const nextGoal = !pendingGoal;
        queuedTarget = nextGoal === activeTarget ? null : nextGoal;
        renderCyclingState();
    }

    function forceConcealed() {
        clearCycleTimers();
        cycleToken += 1;
        isCycling = false;
        activeTarget = null;
        queuedTarget = null;
        shutterArray.classList.remove("is-active");
        passwordField.readOnly = false;
        setPasswordVisibility(false);
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
            forceConcealed();
        }
    });

    demoSubmit?.addEventListener("click", () => {
        showToast("Demo only — authorization was not submitted.");
    });

    recoveryButton?.addEventListener("click", () => {
        showToast("Recovery protocol is not connected in this demo.");
    });

    window.addEventListener("pagehide", forceConcealed);
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            forceConcealed();
        }
    });

    renderCompletedState();
})();
