(() => {
  "use strict";

  const TOTAL_SECONDS = 25 * 60;
  const timer = document.querySelector("#timer");
  const timerToggle = document.querySelector("#timerToggle");
  const timerAction = document.querySelector("#timerAction");
  const pauseButton = document.querySelector("#pauseButton");
  const resetButton = document.querySelector("#resetButton");
  const status = document.querySelector("#status");
  const tickRing = document.querySelector("#tickRing");
  const TICK_COUNT = 30;

  let remaining = TOTAL_SECONDS;
  let state = "idle";
  let endTime = 0;
  let intervalId = null;
  let audioContext = null;

  const ticks = Array.from({ length: TICK_COUNT }, (_, index) => {
    const tick = document.createElement("span");
    tick.className = "tick";
    tick.style.setProperty("--angle", `${180 - index * 360 / TICK_COUNT}deg`);
    tickRing.append(tick);
    return tick;
  });

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  }

  function render() {
    const elapsed = TOTAL_SECONDS - remaining;
    const progress = Math.min(100, Math.max(0, elapsed / TOTAL_SECONDS * 100));
    const elapsedTicks = Math.ceil(progress / 100 * TICK_COUNT);

    timer.textContent = formatTime(remaining);
    timer.dateTime = `PT${remaining}S`;
    status.textContent = remaining === 0 ? "Terminé" : "";
    timerAction.textContent = state === "running" ? "En cours" : state === "paused" ? "Reprendre" : remaining === 0 ? "Recommencer" : "Démarrer";
    timerAction.disabled = state === "running";
    timerAction.setAttribute("aria-label", state === "paused" ? "Reprendre le minuteur" : "Démarrer le minuteur");
    timerToggle.setAttribute("aria-label", state === "running" ? "Mettre le minuteur en pause" : state === "paused" ? "Reprendre le minuteur" : "Démarrer le minuteur");
    pauseButton.disabled = state !== "running";

    ticks.forEach((tick, index) => tick.classList.toggle("elapsed", index < elapsedTicks));
    tickRing.setAttribute("aria-valuenow", String(elapsed));
    tickRing.setAttribute("aria-valuetext", `${Math.round(progress)} % écoulés`);
    document.title = `${formatTime(remaining)} · Pomodoro`;
  }

  function tick() {
    remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    render();
    if (remaining === 0) completeTimer();
  }

  function startTimer() {
    if (state === "running") return;
    if (remaining === 0) remaining = TOTAL_SECONDS;
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
    remaining = TOTAL_SECONDS;
    state = "idle";
    render();
  }

  function toggleTimer() {
    state === "running" ? pauseTimer() : startTimer();
  }

  function completeTimer() {
    clearInterval(intervalId);
    intervalId = null;
    state = "idle";
    signal();
    render();
  }

  function unlockAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      audioContext ||= new AudioContext();
      if (audioContext.state === "suspended") audioContext.resume();
    } catch {
      audioContext = null;
    }
  }

  function signal() {
    try {
      unlockAudio();
      if (!audioContext) return;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.frequency.value = 720;
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.06, audioContext.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.35);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.36);
    } catch {
      // Certains navigateurs exigent une interaction avant d'autoriser le son.
    }
  }

  timerAction.addEventListener("click", startTimer);
  timerToggle.addEventListener("click", toggleTimer);
  pauseButton.addEventListener("click", pauseTimer);
  resetButton.addEventListener("click", resetTimer);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && state === "running") tick();
  });

  document.addEventListener("keydown", (event) => {
    if (event.code !== "Space" || event.target.closest("button")) return;
    event.preventDefault();
    toggleTimer();
  });

  render();
})();
