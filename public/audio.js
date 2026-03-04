(() => {
  const STORAGE = {
    enabled: "meditation_audio_enabled",
    currentTime: "meditation_audio_current_time",
    started: "meditation_audio_started"
  };
  const AUDIO_SRC = "/assets/light.mp3";

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
  }

  // Default behavior: sound is ON unless the user explicitly turns it OFF.
  if (localStorage.getItem(STORAGE.enabled) === null) {
    setBool(STORAGE.enabled, true);
  }

  const audio = new Audio(AUDIO_SRC);
  audio.preload = "auto";
  audio.loop = true;
  audio.volume = 1;

  const enabled = getBool(STORAGE.enabled, true);
  const started = getBool(STORAGE.started, false);
  const savedTime = Number(localStorage.getItem(STORAGE.currentTime) || "0");
  if (Number.isFinite(savedTime) && savedTime > 0) {
    audio.currentTime = savedTime;
  }

  let persistTimer = 0;
  let volumeFadeRaf = 0;
  const persistProgress = () => {
    localStorage.setItem(STORAGE.currentTime, String(audio.currentTime || 0));
  };

  const stopVolumeFade = () => {
    if (volumeFadeRaf) {
      window.cancelAnimationFrame(volumeFadeRaf);
      volumeFadeRaf = 0;
    }
  };

  const fadeAudioVolume = ({
    from,
    to,
    durationMs,
    onStart,
    onDone
  }) => {
    stopVolumeFade();
    if (typeof onStart === "function") {
      onStart();
    }
    if (durationMs <= 0 || from === to) {
      audio.volume = to;
      onDone?.();
      return;
    }
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      audio.volume = from + (to - from) * eased;
      if (t < 1) {
        volumeFadeRaf = window.requestAnimationFrame(tick);
        return;
      }
      volumeFadeRaf = 0;
      onDone?.();
    };
    volumeFadeRaf = window.requestAnimationFrame(tick);
  };

  const tryPlay = () => {
    if (!getBool(STORAGE.enabled, true)) {
      return;
    }
    if (!getBool(STORAGE.started, false)) {
      return;
    }
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        // If autoplay is blocked, retry on first user interaction.
        const resume = () => {
          window.removeEventListener("pointerdown", resume);
          window.removeEventListener("touchstart", resume);
          window.removeEventListener("keydown", resume);
          if (getBool(STORAGE.enabled, true) && getBool(STORAGE.started, false)) {
            audio.play().catch(() => {});
          }
        };
        window.addEventListener("pointerdown", resume, { once: true, passive: true });
        window.addEventListener("touchstart", resume, { once: true, passive: true });
        window.addEventListener("keydown", resume, { once: true });
      });
    }
  };

  const pauseAudio = () => {
    fadeAudioVolume({
      from: audio.volume,
      to: 0,
      durationMs: 480,
      onDone: () => {
        audio.pause();
        audio.volume = 1;
        persistProgress();
      }
    });
  };

  if (started && enabled && body.dataset.audioAutostart === "true") {
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
      const isOn = getBool(STORAGE.enabled, true);
      btn.innerHTML = isOn ? iconOn : iconOff;
      btn.setAttribute("aria-label", isOn ? "Turn sound off" : "Turn sound on");
    };
    syncUi();

    btn.addEventListener("click", () => {
      const currentlyEnabled = getBool(STORAGE.enabled, true);
      if (!currentlyEnabled) {
        setBool(STORAGE.enabled, true);
        fadeAudioVolume({
          from: 0,
          to: 1,
          durationMs: 520,
          onStart: () => {
            audio.volume = 0;
            tryPlay();
          }
        });
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
        // Prime playback on the same user gesture before navigation.
        if (getBool(STORAGE.enabled, true)) {
          tryPlay();
        }
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
