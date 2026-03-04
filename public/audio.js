(() => {
  const STORAGE = {
    enabled: "meditation_audio_enabled",
    currentTime: "meditation_audio_current_time",
    started: "meditation_audio_started",
    gestureAt: "meditation_audio_gesture_at"
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

  const armInteractionResume = () => {
    const resume = () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("touchstart", resume);
      window.removeEventListener("keydown", resume);
      if (getBool(STORAGE.enabled, true) && getBool(STORAGE.started, false) && audio.paused) {
        tryPlay();
      }
    };
    window.addEventListener("pointerdown", resume, { once: true, passive: true });
    window.addEventListener("touchstart", resume, { once: true, passive: true });
    window.addEventListener("keydown", resume, { once: true });
  };

  const pauseAudio = () => {
    fadeAudioVolume({
      from: audio.volume,
      to: 0,
      durationMs: 480,
      onDone: () => {
        audio.muted = true;
        audio.pause();
        audio.volume = 0;
        persistProgress();
      }
    });
  };

  if (started && enabled && body.dataset.audioAutostart === "true") {
    tryPlay();
    armInteractionResume();
    const gestureAt = Number(localStorage.getItem(STORAGE.gestureAt) || "0");
    if (Number.isFinite(gestureAt) && gestureAt > 0 && Date.now() - gestureAt < 12000) {
      const retryDelays = [120, 380, 760];
      retryDelays.forEach((delay) => {
        window.setTimeout(() => {
          if (audio.paused && getBool(STORAGE.enabled, true) && getBool(STORAGE.started, false)) {
            tryPlay();
          }
        }, delay);
      });
    }
    let bootstrapAttempts = 0;
    const bootstrapTimer = window.setInterval(() => {
      if (!getBool(STORAGE.enabled, true) || !getBool(STORAGE.started, false) || !audio.paused) {
        window.clearInterval(bootstrapTimer);
        return;
      }
      tryPlay();
      bootstrapAttempts += 1;
      if (bootstrapAttempts >= 10) {
        window.clearInterval(bootstrapTimer);
      }
    }, 1000);
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

    let toggleGuard = false;
    const playFromUserGesture = () => {
      audio.muted = false;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          armInteractionResume();
        });
      }
    };

    const toggleAudio = () => {
      if (toggleGuard) {
        return;
      }
      toggleGuard = true;
      const currentlyEnabled = getBool(STORAGE.enabled, true);
      if (!currentlyEnabled) {
        setBool(STORAGE.enabled, true);
        fadeAudioVolume({
          from: audio.volume || 0,
          to: 1,
          durationMs: 520,
          onStart: () => {
            audio.muted = false;
            audio.volume = 0;
            playFromUserGesture();
          }
        });
      } else {
        setBool(STORAGE.enabled, false);
        pauseAudio();
      }
      syncUi();
      window.setTimeout(() => {
        toggleGuard = false;
      }, 160);
    };

    btn.addEventListener("pointerup", (event) => {
      event.preventDefault();
      toggleAudio();
    });
    btn.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleAudio();
      }
    });

    audio.addEventListener("play", syncUi);
    audio.addEventListener("pause", syncUi);
    audio.addEventListener("play", () => {
      localStorage.removeItem(STORAGE.gestureAt);
    });
    body.appendChild(btn);
  }

  if (location.pathname === "/") {
    const enterButton = document.querySelector(".intro-button");
    if (enterButton) {
      enterButton.addEventListener("click", (event) => {
        const INTRO_EXIT_MS = 420;
        const href =
          enterButton instanceof HTMLAnchorElement
            ? enterButton.href
            : "/journey/";
        event.preventDefault();
        setBool(STORAGE.started, true);
        localStorage.setItem(STORAGE.gestureAt, String(Date.now()));
        localStorage.setItem(STORAGE.currentTime, "0");
        body.classList.add("is-intro-exiting");
        try {
          audio.currentTime = 0;
        } catch {}
        // Prime playback on the same user gesture before navigation.
        if (getBool(STORAGE.enabled, true)) {
          audio.muted = false;
          audio.volume = 1;
          tryPlay();
          window.setTimeout(() => {
            window.location.href = href;
          }, INTRO_EXIT_MS);
          return;
        }
        window.setTimeout(() => {
          window.location.href = href;
        }, INTRO_EXIT_MS);
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
    stopVolumeFade();
  };

  window.addEventListener("pagehide", handlePageHide, { once: true });
})();
