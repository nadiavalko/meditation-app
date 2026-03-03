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

  const isJourneyOrFinish = location.pathname.startsWith("/journey") || location.pathname.startsWith("/finish");
  if (isJourneyOrFinish) {
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
    const syncUi = () => {
      const isOn = !audio.paused && !audio.ended;
      btn.textContent = isOn ? "🔊" : "🔇";
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
