(() => {
  "use strict";

  const STORAGE_KEY = "notion-pomodoro-preferences-v1";
  const MODES = {
    focus: { seconds: 25 * 60, label: "Concentration", ready: "Prêt à se concentrer" },
    short: { seconds: 5 * 60, label: "Pause courte", ready: "Prêt pour une pause" },
    long: { seconds: 15 * 60, label: "Pause longue", ready: "Prêt pour une pause" },
  };

  const timer = document.querySelector("#timer");
  const timerRing = document.querySelector("#timerRing");
  const timerStatus = document.querySelector("#timerStatus");
  const timerMode = document.querySelector("#timerMode");
  const sessionCount = document.querySelector("#sessionCount");
  const startButton = document.querySelector("#startButton");
  const pauseButton = document.querySelector("#pauseButton");
  const resetButton = document.querySelector("#resetButton");
  const soundToggle = document.querySelector("#soundToggle");
  const clearSessions = document.querySelector("#clearSessions");
  const modeButtons = [...document.querySelectorAll(".mode")];

  const stored = loadPreferences();
  let mode = MODES[stored.mode] ? stored.mode : "focus";
  let soundEnabled = stored.soundEnabled !== false;
  let sessions = Number.isInteger(stored.sessions) && stored.sessions >= 0 ? stored.sessions : 0;
  let remaining = MODES[mode].seconds;
  let endTime = 0;
  let intervalId = null;
  let state = "idle";
  let transientStatus = "";
  let audioContext = null;

  function loadPreferences() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function savePreferences() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, soundEnabled, sessions }));
    } catch {
      // Le widget reste utilisable si le stockage est bloqué dans l'iframe.
    }
  }

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function render() {
    const total = MODES[mode].seconds;
    const elapsedRatio = Math.min(1, Math.max(0, (total - remaining) / total));
    timer.textContent = formatTime(remaining);
    timer.dateTime = `PT${remaining}S`;
    timerRing.style.setProperty("--progress", `${elapsedRatio * 360}deg`);
    timerMode.textContent = MODES[mode].label;
    sessionCount.textContent = sessions;

    const statusText = transientStatus || (state === "running" ? "En cours" : state === "paused" ? "En pause" : MODES[mode].ready);
    timerStatus.textContent = statusText;
    document.title = `${formatTime(remaining)} · ${MODES[mode].label}`;

    startButton.textContent = state === "paused" ? "Reprendre" : "Start";
    startButton.disabled = state === "running";
    pauseButton.disabled = state !== "running";

    modeButtons.forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    soundToggle.setAttribute("aria-pressed", String(soundEnabled));
    soundToggle.setAttribute("aria-label", soundEnabled ? "Désactiver le son" : "Activer le son");
  }

  function tick() {
    remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    render();

    if (remaining === 0) completeTimer();
  }

  function startTimer() {
    if (state === "running") return;
    transientStatus = "";
    unlockAudio();
    endTime = Date.now() + remaining * 1000;
    state = "running";
    clearInterval(intervalId);
    intervalId = window.setInterval(tick, 250);
    render();
  }

  function pauseTimer() {
    if (state !== "running") return;
    remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    clearInterval(intervalId);
    intervalId = null;
    state = "paused";
    render();
  }

  function resetTimer() {
    clearInterval(intervalId);
    intervalId = null;
    remaining = MODES[mode].seconds;
    state = "idle";
    transientStatus = "";
    render();
  }

  function completeTimer() {
    clearInterval(intervalId);
    intervalId = null;
    state = "idle";

    if (mode === "focus") {
      sessions += 1;
      savePreferences();
    }

    playSignal();
    remaining = MODES[mode].seconds;
    transientStatus = mode === "focus" ? "Session terminée" : "Pause terminée";
    render();
  }

  function unlockAudio() {
    if (!soundEnabled) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      audioContext ||= new AudioContext();
      if (audioContext.state === "suspended") audioContext.resume();
    } catch {
      audioContext = null;
    }
  }

  function playSignal() {
    if (!soundEnabled) return;

    try {
      unlockAudio();
      if (!audioContext) return;
      const now = audioContext.currentTime;

      [0, 0.22].forEach((delay, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = index === 0 ? 660 : 780;
        gain.gain.setValueAtTime(0.0001, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.055, now + delay + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.18);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(now + delay);
        oscillator.stop(now + delay + 0.2);
      });

    } catch {
      // Certains navigateurs exigent une interaction avant d'autoriser le son.
    }
  }

  function selectMode(nextMode) {
    if (!MODES[nextMode] || nextMode === mode) return;
    mode = nextMode;
    savePreferences();
    resetTimer();
  }

  startButton.addEventListener("click", startTimer);
  pauseButton.addEventListener("click", pauseTimer);
  resetButton.addEventListener("click", resetTimer);

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => selectMode(button.dataset.mode));
  });

  soundToggle.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    if (soundEnabled) unlockAudio();
    savePreferences();
    render();
  });

  clearSessions.addEventListener("click", () => {
    sessions = 0;
    savePreferences();
    render();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && state === "running") tick();
  });

  render();
})();
