
/* ==========================================
   FERRARI — BEYOND THE LIMITS
   MAIN JAVASCRIPT
   Vanilla JavaScript — No Libraries
========================================== */


/* ==========================================
   01. DOM ELEMENTS
========================================== */

const $ = (selector, parent = document) =>
    parent.querySelector(selector);

const $$ = (selector, parent = document) =>
    [...parent.querySelectorAll(selector)];


/* ==========================================
   02. GLOBAL STATE
========================================== */

const state = {
    engineRunning: false,
    rpm: 0,
    targetRPM: 0,
    throttle: 0,
    audioReady: false,
    gameRunning: false,
    gameReady: false,
    gameTimeouts: [],
    attempts: 0,
    bestTime: null,
    selectedColor: "#dc0000"
};


/* ==========================================
   03. PRELOADER
========================================== */

const preloader = $("#preloader");
const loaderProgress = $("#loaderProgress");
const loaderPercent = $("#loaderPercent");

function startPreloader() {

    let progress = 0;

    const interval = setInterval(() => {

        progress += Math.floor(Math.random() * 8) + 2;

        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);

            setTimeout(() => {

                preloader?.classList.add("hidden");

                document.body.classList.add("loaded");

            }, 400);
        }

        if (loaderProgress) {
            loaderProgress.style.width = `${progress}%`;
        }

        if (loaderPercent) {
            loaderPercent.textContent =
                `${String(progress).padStart(2, "0")}%`;
        }

    }, 70);

}

if (document.readyState === "complete") {
    startPreloader();
} else {
    window.addEventListener("load", startPreloader, { once: true });
}


/* ==========================================
   04. CUSTOM CURSOR
========================================== */

const cursorDot = $("#cursorDot");
const cursorOutline = $("#cursorOutline");

const supportsFinePointer =
    window.matchMedia("(pointer: fine)").matches;

let mouseX = 0;
let mouseY = 0;

let outlineX = 0;
let outlineY = 0;

if (supportsFinePointer && cursorDot && cursorOutline) {

    document.addEventListener("mousemove", (event) => {

        mouseX = event.clientX;
        mouseY = event.clientY;

        cursorDot.style.left = `${mouseX}px`;
        cursorDot.style.top = `${mouseY}px`;

    });

    function animateCursor() {

        outlineX += (mouseX - outlineX) * 0.15;
        outlineY += (mouseY - outlineY) * 0.15;

        cursorOutline.style.left = `${outlineX}px`;
        cursorOutline.style.top = `${outlineY}px`;

        requestAnimationFrame(animateCursor);

    }

    animateCursor();


    document.addEventListener("mouseover", (event) => {

        const target = event.target.closest(
            "a, button, .magnetic, .color-option"
        );

        if (target) {
            cursorOutline.classList.add("hover");
        }

    });

    document.addEventListener("mouseout", (event) => {

        const target = event.target.closest(
            "a, button, .magnetic, .color-option"
        );

        if (target) {
            cursorOutline.classList.remove("hover");
        }

    });

    document.addEventListener("mousedown", () => {
        cursorOutline.classList.add("click");
    });

    document.addEventListener("mouseup", () => {
        cursorOutline.classList.remove("click");
    });

}


/* ==========================================
   05. MAGNETIC BUTTONS
========================================== */

const magneticElements = $$(".magnetic");

if (supportsFinePointer) {

    magneticElements.forEach((element) => {

        element.addEventListener("mousemove", (event) => {

            const rect = element.getBoundingClientRect();

            const x = event.clientX - rect.left - rect.width / 2;
            const y = event.clientY - rect.top - rect.height / 2;

            element.style.transform =
                `translate(${x * 0.15}px, ${y * 0.15}px)`;

        });

        element.addEventListener("mouseleave", () => {

            element.style.transform = "";

        });

    });

}


/* ==========================================
   06. MOBILE NAVIGATION
========================================== */

const menuToggle = $("#menuToggle");
const mobileMenu = $("#mobileMenu");

function closeMobileMenu() {

    menuToggle?.classList.remove("active");
    mobileMenu?.classList.remove("active");

    document.body.classList.remove("menu-open");

    menuToggle?.setAttribute("aria-expanded", "false");

}

menuToggle?.addEventListener("click", () => {

    const isOpen = mobileMenu.classList.toggle("active");

    menuToggle.classList.toggle("active", isOpen);

    document.body.classList.toggle("menu-open", isOpen);

    menuToggle.setAttribute("aria-expanded", String(isOpen));

});

$$("#mobileMenu a").forEach((link) => {

    link.addEventListener("click", closeMobileMenu);

});

window.addEventListener("resize", () => {

    if (window.innerWidth > 800) {
        closeMobileMenu();
    }

});


/* ==========================================
   07. ACTIVE NAVIGATION
========================================== */

const sections = $$("main section[id]");
const navigationLinks = $$(".nav-link");

if ("IntersectionObserver" in window) {

    const navObserver = new IntersectionObserver(
        (entries) => {

            entries.forEach((entry) => {

                if (!entry.isIntersecting) return;

                navigationLinks.forEach((link) => {

                    link.classList.toggle(
                        "active",
                        link.getAttribute("href") ===
                        `#${entry.target.id}`
                    );

                });

            });

        },
        {
            threshold: 0.3
        }
    );

    sections.forEach((section) => {
        navObserver.observe(section);
    });

}


/* ==========================================
   08. WEB AUDIO API — V12 SIMULATOR
========================================== */

let audioContext = null;

let masterGain = null;
let engineGain = null;

let oscillatorBank = [];
let audioInitialized = false;

let audioFilter = null;
let distortion = null;

let audioIndicator = $("#audioIndicator");

function createDistortionCurve(amount = 20) {

    const samples = 44100;
    const curve = new Float32Array(samples);

    const k = amount;

    for (let i = 0; i < samples; i++) {

        const x = (i * 2) / samples - 1;

        curve[i] =
            ((3 + k) * x * 20 * Math.PI / 180) /
            (Math.PI + k * Math.abs(x));

    }

    return curve;

}


async function initializeAudio() {

    if (audioInitialized) {

        if (audioContext.state === "suspended") {
            await audioContext.resume();
        }

        return;

    }

    const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {

        alert("Web Audio API is not supported in this browser.");

        return;

    }

    audioContext = new AudioContextClass();

    await audioContext.resume();


    // MASTER OUTPUT

    masterGain = audioContext.createGain();

    masterGain.gain.value = 0.22;


    // ENGINE VOLUME

    engineGain = audioContext.createGain();

    engineGain.gain.value = 0;


    // LOW-PASS FILTER

    audioFilter = audioContext.createBiquadFilter();

    audioFilter.type = "lowpass";

    audioFilter.frequency.value = 500;

    audioFilter.Q.value = 1.2;


    // DISTORTION

    distortion = audioContext.createWaveShaper();

    distortion.curve = createDistortionCurve(12);

    distortion.oversample = "2x";


    // AUDIO CONNECTION

    engineGain.connect(audioFilter);

    audioFilter.connect(distortion);

    distortion.connect(masterGain);

    masterGain.connect(audioContext.destination);


    // V12 SIMULATION
    // Six harmonically related oscillator groups.

    const harmonics = [
        { ratio: 0.5, gain: 0.15, type: "sawtooth" },
        { ratio: 1, gain: 0.30, type: "sawtooth" },
        { ratio: 2, gain: 0.20, type: "triangle" },
        { ratio: 3, gain: 0.12, type: "sawtooth" },
        { ratio: 4, gain: 0.08, type: "triangle" },
        { ratio: 6, gain: 0.04, type: "sine" }
    ];

    harmonics.forEach((harmonic) => {

        const oscillator = audioContext.createOscillator();

        const gain = audioContext.createGain();

        oscillator.type = harmonic.type;

        oscillator.frequency.value = 35 * harmonic.ratio;

        gain.gain.value = harmonic.gain;

        oscillator.connect(gain);

        gain.connect(engineGain);

        oscillator.start();

        oscillatorBank.push({
            oscillator,
            gain,
            ratio: harmonic.ratio
        });

    });


    // SECONDARY ENGINE PULSE

    const pulseOscillator = audioContext.createOscillator();

    const pulseGain = audioContext.createGain();

    pulseOscillator.type = "square";

    pulseOscillator.frequency.value = 80;

    pulseGain.gain.value = 0.025;

    pulseOscillator.connect(pulseGain);

    pulseGain.connect(engineGain);

    pulseOscillator.start();

    oscillatorBank.push({
        oscillator: pulseOscillator,
        gain: pulseGain,
        ratio: null
    });


    audioInitialized = true;

    state.audioReady = true;

}


function updateEngineAudio(rpm) {

    if (!audioInitialized || !audioContext) return;

    const now = audioContext.currentTime;

    const normalizedRPM = rpm / 9000;

    const baseFrequency = Math.max(20, rpm / 60 * 2);

    oscillatorBank.forEach((item) => {

        if (item.ratio !== null) {

            item.oscillator.frequency.setTargetAtTime(
                baseFrequency * item.ratio,
                now,
                0.04
            );

        } else {

            item.oscillator.frequency.setTargetAtTime(
                Math.max(25, baseFrequency * 1.5),
                now,
                0.05
            );

        }

    });


    audioFilter.frequency.setTargetAtTime(
        350 + normalizedRPM * 3500,
        now,
        0.08
    );

    engineGain.gain.setTargetAtTime(
        state.engineRunning
            ? 0.08 + normalizedRPM * 0.30
            : 0,
        now,
        0.08
    );

}


function stopEngineAudio() {

    if (!audioInitialized || !audioContext) return;

    engineGain.gain.setTargetAtTime(
        0,
        audioContext.currentTime,
        0.2
    );

}


/* ==========================================
   09. ENGINE DASHBOARD
========================================== */

const engineStartButton = $("#engineStart");

const rpmNumber = $("#rpmNumber");

const engineState = $("#engineState");

const tachometerProgress = $("#tachometerProgress");

const throttleButton = $("#throttleButton");

const throttlePercent = $("#throttlePercent");

const throttleProgress = $("#throttleProgress");

const engineConnection = $("#engineConnection");

const audioMaxDash = 754;

let lastEngineFrame = 0;


function updateTachometer(rpm) {

    if (rpmNumber) {

        rpmNumber.textContent = String(
            Math.round(rpm)
        ).padStart(4, "0");

    }

    if (tachometerProgress) {

        const progress = Math.min(
            Math.max(rpm / 9000, 0),
            1
        );

        tachometerProgress.style.strokeDasharray =
            `${progress * audioMaxDash} 1005`;

    }

}


function setEngineState(running) {

    if (!engineState || !engineStartButton) return;

    engineState.textContent =
        running ? "ENGINE RUNNING" : "ENGINE OFF";

    engineState.classList.toggle("running", running);

    engineStartButton.classList.toggle("running", running);

    const startText = $(".start-text", engineStartButton);

    const startSubtext = $(".start-subtext", engineStartButton);

    if (startText) {
        startText.textContent =
            running ? "ENGINE STOP" : "ENGINE START";
    }

    if (startSubtext) {
        startSubtext.textContent =
            running ? "PRESS TO SHUT DOWN" : "PRESS TO IGNITE";
    }

    if (engineConnection) {

        engineConnection.textContent =
            running ? "CONNECTED" : "DISCONNECTED";

    }

    if (audioIndicator) {
        audioIndicator.classList.toggle("active", running);
    }

}


function startEngine() {

    state.engineRunning = true;

    state.targetRPM = 1000;

    state.throttle = 0;

    setEngineState(true);

}


function shutdownEngine() {

    state.engineRunning = false;

    state.targetRPM = 0;

    state.throttle = 0;

    if (throttleButton) {
        throttleButton.classList.remove("active");
    }

    if (throttlePercent) {
        throttlePercent.textContent = "0%";
    }

    if (throttleProgress) {
        throttleProgress.style.width = "0%";
    }

    setEngineState(false);

    if (audioInitialized) {
        stopEngineAudio();
    }

}


engineStartButton?.addEventListener("click", async () => {

    try {

        await initializeAudio();

        if (!state.engineRunning) {

            startEngine();

        } else {

            shutdownEngine();

        }

    } catch (error) {

        console.error("Engine audio initialization failed:", error);

    }

});


/* ==========================================
   10. THROTTLE CONTROL
========================================== */

function throttleStart(event) {

    if (event.cancelable) {
        event.preventDefault();
    }

    if (!state.engineRunning) return;

    state.throttle = 1;

    state.targetRPM = 9000;

    throttleButton?.classList.add("active");

}


function throttleStop() {

    state.throttle = 0;

    if (state.engineRunning) {
        state.targetRPM = 1000;
    }

    throttleButton?.classList.remove("active");

}


throttleButton?.addEventListener(
    "pointerdown",
    throttleStart
);

throttleButton?.addEventListener(
    "pointerup",
    throttleStop
);

throttleButton?.addEventListener(
    "pointercancel",
    throttleStop
);

throttleButton?.addEventListener(
    "lostpointercapture",
    throttleStop
);

throttleButton?.addEventListener(
    "contextmenu",
    (event) => event.preventDefault()
);

window.addEventListener("blur", throttleStop);

document.addEventListener("visibilitychange", () => {

    if (document.hidden) {
        throttleStop();
    }

});


/* ==========================================
   11. RPM ANIMATION LOOP
========================================== */

function animateEngine(timestamp) {

    const delta = lastEngineFrame
        ? Math.min((timestamp - lastEngineFrame) / 1000, 0.05)
        : 0;

    lastEngineFrame = timestamp;

    if (state.engineRunning) {

        const acceleration = 6500;

        const deceleration = 4000;

        if (state.rpm < state.targetRPM) {

            state.rpm = Math.min(
                state.rpm + acceleration * delta,
                state.targetRPM
            );

        } else if (state.rpm > state.targetRPM) {

            state.rpm = Math.max(
                state.rpm - deceleration * delta,
                state.targetRPM
            );

        }

    } else {

        state.rpm = Math.max(
            0,
            state.rpm - 4500 * delta
        );

    }


    updateTachometer(state.rpm);


    const throttle = state.engineRunning
        ? Math.round(state.throttle * 100)
        : 0;

    if (throttlePercent) {
        throttlePercent.textContent = `${throttle}%`;
    }

    if (throttleProgress) {
        throttleProgress.style.width = `${throttle}%`;
    }


    updateEngineAudio(state.rpm);


    requestAnimationFrame(animateEngine);

}

requestAnimationFrame(animateEngine);


/* ==========================================
   12. 3D TILT EFFECT
========================================== */

const tiltCards = $$(".tilt-card");

if (supportsFinePointer) {

    tiltCards.forEach((card) => {

        card.addEventListener("mousemove", (event) => {

            const rect = card.getBoundingClientRect();

            const x = event.clientX - rect.left;

            const y = event.clientY - rect.top;

            const centerX = rect.width / 2;

            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -7;

            const rotateY = ((x - centerX) / centerX) * 7;

            card.style.transform =
                `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

        });

        card.addEventListener("mouseleave", () => {

            card.style.transform =
                "perspective(1000px) rotateX(0deg) rotateY(0deg)";

        });

    });

}


/* ==========================================
   13. CAR CONFIGURATOR
========================================== */

const colorOptions = $$(".color-option");

const selectedColorName = $("#selectedColorName");

const configCarImage = $("#configCarImage");

const configButton = $("#configButton");

colorOptions.forEach((option) => {

    option.addEventListener("click", () => {

        colorOptions.forEach((color) => {
            color.classList.remove("active");
        });

        option.classList.add("active");

        const color = option.dataset.color;

        const name = option.dataset.name;

        state.selectedColor = color;

        if (selectedColorName) {
            selectedColorName.textContent = name;
        }

        if (configCarImage) {

            configCarImage.style.filter =
                `brightness(0.7) sepia(0.35) saturate(1.6) hue-rotate(${getHue(color)}deg)`;

        }

    });

});


function getHue(hex) {

    const normalized = hex.replace("#", "");

    const r = parseInt(normalized.slice(0, 2), 16) / 255;

    const g = parseInt(normalized.slice(2, 4), 16) / 255;

    const b = parseInt(normalized.slice(4, 6), 16) / 255;

    const max = Math.max(r, g, b);

    const min = Math.min(r, g, b);

    const delta = max - min;

    if (delta === 0) return 0;

    let hue;

    if (max === r) {

        hue = ((g - b) / delta) % 6;

    } else if (max === g) {

        hue = (b - r) / delta + 2;

    } else {

        hue = (r - g) / delta + 4;

    }

    hue *= 60;

    return hue < 0 ? hue + 360 : hue;

}


configButton?.addEventListener("click", () => {

    const colorName =
        selectedColorName?.textContent || "ROSSO CORSA";

    const configuration = {
        model: "SF90 STRADALE",
        color: colorName,
        colorCode: state.selectedColor,
        engine: "V8 HYBRID",
        power: "986 HP"
    };

    try {

        localStorage.setItem(
            "ferrariConfiguration",
            JSON.stringify(configuration)
        );

        configButton.textContent = "CONFIGURATION SAVED ✓";

        configButton.style.background = "rgba(0,180,100,0.2)";

        configButton.style.borderColor = "#00c875";

        setTimeout(() => {

            configButton.textContent =
                "SAVE CONFIGURATION ↗";

            configButton.style.background = "";

            configButton.style.borderColor = "";

        }, 2500);

    } catch (error) {

        console.error("Could not save configuration:", error);

        configButton.textContent = "SAVE UNAVAILABLE";

    }

});


/* ==========================================
   14. CAR MODAL
========================================== */

const carModal = $("#carModal");

const modalTitle = $("#modalTitle");

const modalClose = $("#modalClose");

const modalAction = $("#modalAction");

const carViewButtons = $$(".car-view-button");


function openCarModal(model) {

    if (!carModal) return;

    if (modalTitle) {
        modalTitle.textContent = model;
    }

    carModal.classList.add("active");

    document.body.style.overflow = "hidden";

}


function closeCarModal() {

    carModal?.classList.remove("active");

    document.body.style.overflow = "";

}


carViewButtons.forEach((button) => {

    button.addEventListener("click", () => {

        openCarModal(button.dataset.model);

    });

});


modalClose?.addEventListener("click", closeCarModal);

modalAction?.addEventListener("click", closeCarModal);

carModal?.addEventListener("click", (event) => {

    if (event.target === carModal) {
        closeCarModal();
    }

});

document.addEventListener("keydown", (event) => {

    if (event.key === "Escape") {

        closeCarModal();

        closeMobileMenu();

    }

});


/* ==========================================
   15. F1 REACTION GAME
========================================== */

const gameStartButton = $("#gameStart");

const gameStatus = $("#gameStatus");

const gameMessage = $("#gameMessage");

const reactionResult = $("#reactionResult");

const bestTimeElement = $("#bestTime");

const attemptsElement = $("#attempts");

const driverStatus = $("#driverStatus");

const f1Lights = $$(".f1-light");

let greenLightTime = 0;

let gameStartTimestamp = 0;

let gameSequenceId = 0;


function clearGameTimeouts() {

    state.gameTimeouts.forEach((timeout) => {
        clearTimeout(timeout);
    });

    state.gameTimeouts = [];

}


function scheduleGameAction(callback, delay) {

    const timeout = setTimeout(callback, delay);

    state.gameTimeouts.push(timeout);

    return timeout;

}


function resetF1Lights() {

    f1Lights.forEach((light) => {

        light.classList.remove("active", "go");

    });

}


function updateGameStats(time) {

    if (bestTimeElement) {

        bestTimeElement.textContent =
            `${time} ms`;

    }

    if (attemptsElement) {

        attemptsElement.textContent =
            String(state.attempts).padStart(2, "0");

    }


    if (driverStatus) {

        if (time < 200) {

            driverStatus.textContent = "LEGEND";

        } else if (time < 250) {

            driverStatus.textContent = "PRO";

        } else if (time < 350) {

            driverStatus.textContent = "EXPERT";

        } else if (time < 500) {

            driverStatus.textContent = "ROOKIE";

        } else {

            driverStatus.textContent = "BEGINNER";

        }

    }

}


function startReactionGame() {

    if (state.gameRunning) return;

    clearGameTimeouts();

    resetF1Lights();

    gameSequenceId++;

    const currentSequence = gameSequenceId;

    state.gameRunning = true;

    state.gameReady = false;

    gameStartButton.disabled = true;

    gameStartButton.textContent = "GET READY...";

    gameStatus.textContent = "RACE INITIALIZING";

    gameMessage.textContent = "WAIT FOR ALL FIVE LIGHTS";

    reactionResult.textContent = "---";


    const numberOfLights = 5;

    let lightIndex = 0;


    function activateNextLight() {

        if (currentSequence !== gameSequenceId) return;

        if (lightIndex < numberOfLights) {

            f1Lights[lightIndex * 2].classList.add("active");

            f1Lights[lightIndex * 2 + 1].classList.add("active");

            lightIndex++;

            scheduleGameAction(
                activateNextLight,
                550
            );

        } else {

            // All five red lights are now on.

            const randomDelay =
                Math.random() * 2000 + 1000;

            scheduleGameAction(() => {

                if (currentSequence !== gameSequenceId) return;

                resetF1Lights();

                f1Lights.forEach((light) => {
                    light.classList.add("go");
                });

                greenLightTime = performance.now();

                state.gameReady = true;

                gameStatus.textContent = "LIGHTS OUT!";

                gameMessage.textContent = "GO! GO! GO!";

                gameStartButton.textContent = "WAITING FOR REACTION";

            }, randomDelay);

        }

    }


    scheduleGameAction(
        activateNextLight,
        400
    );

}


function finishReactionGame() {

    if (!state.gameRunning || !state.gameReady) return;

    const reactionTime = Math.round(
        performance.now() - greenLightTime
    );

    state.gameRunning = false;

    state.gameReady = false;

    state.attempts++;

    clearGameTimeouts();

    resetF1Lights();


    reactionResult.textContent =
        reactionTime.toString();


    gameStatus.textContent = "RACE COMPLETED";

    gameStartButton.disabled = false;

    gameStartButton.textContent = "RACE AGAIN ↗";


    if (reactionTime < 100) {

        gameMessage.textContent =
            "INCREDIBLE SPEED!";

    } else if (reactionTime < 250) {

        gameMessage.textContent =
            "EXCELLENT REACTION!";

    } else if (reactionTime < 350) {

        gameMessage.textContent =
            "GREAT PERFORMANCE!";

    } else {

        gameMessage.textContent =
            "KEEP PRACTICING!";

    }


    if (
        state.bestTime === null ||
        reactionTime < state.bestTime
    ) {

        state.bestTime = reactionTime;

        if (bestTimeElement) {

            bestTimeElement.textContent =
                `${reactionTime} ms`;

        }

    }


    updateGameStats(reactionTime);

}


function falseStart() {

    if (!state.gameRunning || state.gameReady) return;

    gameSequenceId++;

    state.gameRunning = false;

    state.gameReady = false;

    clearGameTimeouts();

    resetF1Lights();

    state.attempts++;

    gameStatus.textContent = "FALSE START";

    gameMessage.textContent =
        "TOO EARLY! WAIT FOR THE GREEN LIGHT.";

    reactionResult.textContent = "FALSE";

    gameStartButton.disabled = false;

    gameStartButton.textContent = "TRY AGAIN ↗";

    if (attemptsElement) {

        attemptsElement.textContent =
            String(state.attempts).padStart(2, "0");

    }

}


gameStartButton?.addEventListener("click", startReactionGame);


function handleReactionInput() {

    if (!state.gameRunning) return;

    if (!state.gameReady) {

        falseStart();

        return;

    }

    finishReactionGame();

}


// Desktop and mobile input.

document.addEventListener("keydown", (event) => {

    if (event.code !== "Space") return;

    if (
        event.repeat ||
        event.target.matches("input, textarea, select, button, a")
    ) {
        return;
    }

    event.preventDefault();

    handleReactionInput();

});


const reactionGame = $(".reaction-game");

reactionGame?.addEventListener("pointerdown", (event) => {

    if (
        event.target.closest("button")
    ) {
        return;
    }

    if (state.gameRunning) {

        handleReactionInput();

    }

});


/* ==========================================
   16. SCROLL REVEAL ANIMATIONS
========================================== */

const revealElements = $$(`
    .section-heading,
    .car-card,
    .configurator,
    .technology-card,
    .reaction-game,
    .final-content
`);


revealElements.forEach((element) => {

    element.style.opacity = "0";

    element.style.transform = "translateY(35px)";

    element.style.transition =
        "opacity 0.8s ease, transform 0.8s cubic-bezier(0.22,1,0.36,1)";

});


if ("IntersectionObserver" in window) {

    const revealObserver = new IntersectionObserver(
        (entries, observer) => {

            entries.forEach((entry) => {

                if (!entry.isIntersecting) return;

                entry.target.style.opacity = "1";

                entry.target.style.transform = "translateY(0)";

                observer.unobserve(entry.target);

            });

        },
        {
            threshold: 0.12
        }
    );


    revealElements.forEach((element) => {

        revealObserver.observe(element);

    });

} else {

    revealElements.forEach((element) => {

        element.style.opacity = "1";

        element.style.transform = "none";

    });

}


/* ==========================================
   17. SMOOTH SCROLL
========================================== */

$$('a[href^="#"]').forEach((link) => {

    link.addEventListener("click", (event) => {

        const targetId = link.getAttribute("href");

        if (!targetId || targetId === "#") return;

        const target = $(targetId);

        if (!target) return;

        event.preventDefault();

        target.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    });

});


/* ==========================================
   18. CONFIGURATION RESTORE
========================================== */

function restoreConfiguration() {

    try {

        const saved = localStorage.getItem(
            "ferrariConfiguration"
        );

        if (!saved) return;

        const configuration = JSON.parse(saved);

        const matchingOption = colorOptions.find(
            (option) =>
                option.dataset.name === configuration.color
        );

        if (matchingOption) {

            matchingOption.click();

        }

    } catch (error) {

        console.error(
            "Configuration restore failed:",
            error
        );

    }

}

restoreConfiguration();


/* ==========================================
   19. PAGE VISIBILITY MANAGEMENT
========================================== */

document.addEventListener("visibilitychange", () => {

    if (!document.hidden) return;

    throttleStop();

    if (state.gameRunning) {

        gameSequenceId++;

        state.gameRunning = false;

        state.gameReady = false;

        clearGameTimeouts();

        resetF1Lights();

        gameStatus.textContent = "GAME PAUSED";

        gameMessage.textContent =
            "RETURN AND START A NEW RACE.";

        gameStartButton.disabled = false;

        gameStartButton.textContent = "START RACE ↗";

    }

});


/* ==========================================
   20. ERROR HANDLING
========================================== */

window.addEventListener("error", (event) => {

    console.error(
        "Ferrari website error:",
        event.message
    );

});


window.addEventListener("unhandledrejection", (event) => {

    console.error(
        "Unhandled promise rejection:",
        event.reason
    );

});


/* ==========================================
   21. INITIALIZATION
========================================== */

function initializeFerrariWebsite() {

    updateTachometer(0);

    setEngineState(false);

    resetF1Lights();

    console.log(
        "%c FERRARI EXPERIENCE INITIALIZED ",
        "background:#dc0000;color:white;font-size:15px;font-weight:bold;padding:12px;"
    );

    console.log(
        "%c BEYOND THE LIMITS.",
        "color:#c6a15b;font-size:18px;font-weight:bold;"
    );

}

initializeFerrariWebsite();


/* ==========================================
   END OF FERRARI WEBSITE JAVASCRIPT
========================================== */
