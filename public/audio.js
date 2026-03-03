(() => {
  const STORAGE = {
    enabled: "meditation_audio_enabled",
    shouldPlay: "meditation_audio_should_play",
    currentTime: "meditation_audio_current_time",
    started: "meditation_audio_started"
  };
  const AUDIO_SRC = "/assets/metriko-calm-nature-background-music-364797.mp3";

  const getBool = (key, fallback) => {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return fallback;
    }
    return raw === "true";
  };

  const setBool = (key, value) => {
    localStorage.setItem(key, value ? "true" : "false");
  };

  const body = document.body;
  if (!body) {
    return;
  }

  const isJourney = location.pathname.startsWith("/journey");
  if (isJourney) {
    setBool(STORAGE.started, true);
    if (localStorage.getItem(STORAGE.shouldPlay) === null) {
      setBool(STORAGE.shouldPlay, true);
    }
  }

  const audio = new Audio(AUDIO_SRC);
  audio.preload = "auto";
  audio.loop = true;

  const enabled = getBool(STORAGE.enabled, true);
  const shouldPlay = getBool(STORAGE.shouldPlay, false);
  const started = getBool(STORAGE.started, false);
  const savedTime = Number(localStorage.getItem(STORAGE.currentTime) || "0");
  if (Number.isFinite(savedTime) && savedTime > 0) {
    audio.currentTime = savedTime;
  }

  let persistTimer = 0;
  const persistProgress = () => {
    localStorage.setItem(STORAGE.currentTime, String(audio.currentTime || 0));
  };

  const tryPlay = () => {
    if (!getBool(STORAGE.enabled, true)) {
      return;
    }
    setBool(STORAGE.shouldPlay, true);
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  };

  const pauseAudio = () => {
    audio.pause();
    setBool(STORAGE.shouldPlay, false);
    persistProgress();
  };

  if (started && enabled && shouldPlay && body.dataset.audioAutostart === "true") {
    tryPlay();
  }

  if (body.dataset.audioUi === "true") {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "audio-toggle";
    const iconOn = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M11 5L7.5 8.5H4a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h3.5L11 19a1 1 0 0 0 1.7-.7V5.7A1 1 0 0 0 11 5z"/>
        <path d="M15.2 9.2a1 1 0 1 1 1.4-1.4 6 6 0 0 1 0 8.4 1 1 0 1 1-1.4-1.4 4 4 0 0 0 0-5.6z"/>
        <path d="M18.2 6.2a1 1 0 1 1 1.4-1.4 10 10 0 0 1 0 14.2 1 1 0 1 1-1.4-1.4 8 8 0 0 0 0-11.4z"/>
      </svg>`;
    const iconOff = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M11 5L7.5 8.5H4a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h3.5L11 19a1 1 0 0 0 1.7-.7V5.7A1 1 0 0 0 11 5z"/>
        <path d="M16.3 10.3a1 1 0 0 1 1.4 0l1.3 1.3 1.3-1.3a1 1 0 1 1 1.4 1.4L20.4 13l1.3 1.3a1 1 0 0 1-1.4 1.4L19 14.4l-1.3 1.3a1 1 0 0 1-1.4-1.4l1.3-1.3-1.3-1.3a1 1 0 0 1 0-1.4z"/>
      </svg>`;
    const syncUi = () => {
      const isOn = !audio.paused && !audio.ended;
      btn.innerHTML = isOn ? iconOn : iconOff;
      btn.setAttribute("aria-label", isOn ? "Turn sound off" : "Turn sound on");
    };
    syncUi();

    btn.addEventListener("click", () => {
      if (audio.paused) {
        setBool(STORAGE.enabled, true);
        tryPlay();
      } else {
        setBool(STORAGE.enabled, false);
        pauseAudio();
      }
      syncUi();
    });

    audio.addEventListener("play", syncUi);
    audio.addEventListener("pause", syncUi);
    body.appendChild(btn);
  }

  if (location.pathname === "/") {
    const enterButton = document.querySelector(".intro-button");
    if (enterButton) {
      enterButton.addEventListener("click", () => {
        setBool(STORAGE.started, true);
        setBool(STORAGE.shouldPlay, true);
      });
    }
  }

  persistTimer = window.setInterval(() => {
    if (!audio.paused) {
      persistProgress();
    }
  }, 800);

  const handlePageHide = () => {
    persistProgress();
    window.clearInterval(persistTimer);
  };

  window.addEventListener("pagehide", handlePageHide, { once: true });
})();
