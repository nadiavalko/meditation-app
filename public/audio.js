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
  audio.addEventListener("loadedmetadata", () => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
      return;
    }
    // If persisted time is at/near the end after a track trim, restart cleanly.
    if (audio.currentTime >= audio.duration - 0.25) {
      audio.currentTime = 0;
      persistProgress();
    }
  });

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
    const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));
    stopVolumeFade();
    if (typeof onStart === "function") {
      onStart();
    }
    const safeFrom = clamp01(from);
    const safeTo = clamp01(to);
    if (durationMs <= 0 || safeFrom === safeTo) {
      audio.volume = safeTo;
      onDone?.();
      return;
    }
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, Math.max(0, (now - start) / durationMs));
      const eased = 1 - Math.pow(1 - t, 3);
      const nextVolume = clamp01(safeFrom + (safeTo - safeFrom) * eased);
      audio.volume = nextVolume;
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

  const ensurePlayback = () => {
    if (
      body.dataset.audioAutostart === "true" &&
      getBool(STORAGE.enabled, true) &&
      getBool(STORAGE.started, false) &&
      audio.paused
    ) {
      tryPlay();
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
    window.addEventListener("pageshow", ensurePlayback);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        ensurePlayback();
      }
    });
    window.addEventListener("focus", ensurePlayback);
  }

  if (body.dataset.audioUi === "true") {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "audio-toggle";
    const icons = document.createElement("span");
    icons.className = "audio-toggle-icons";
    icons.setAttribute("aria-hidden", "true");

    const iconOn = document.createElement("img");
    iconOn.className = "audio-toggle-icon audio-toggle-icon--on";
    iconOn.src = "/assets/volume-high-stroke-rounded.svg";
    iconOn.alt = "";

    const iconOff = document.createElement("img");
    iconOff.className = "audio-toggle-icon audio-toggle-icon--off";
    iconOff.src = "/assets/volume-mute-02-stroke-rounded.svg";
    iconOff.alt = "";

    icons.append(iconOn, iconOff);
    btn.appendChild(icons);

    const syncUi = () => {
      const isOn = getBool(STORAGE.enabled, true);
      btn.classList.toggle("is-sound-on", isOn);
      btn.setAttribute("aria-label", isOn ? "Turn sound off" : "Turn sound on");
    };
    syncUi();

    let toggleVersion = 0;
    const playFromUserGesture = () => {
      audio.muted = false;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          armInteractionResume();
        });
      }
    };

    const turnSoundOn = () => {
      toggleVersion += 1;
      setBool(STORAGE.started, true);
      setBool(STORAGE.enabled, true);
      stopVolumeFade();
      audio.muted = false;
      if (audio.paused) {
        audio.volume = 0;
        playFromUserGesture();
      }
      fadeAudioVolume({
        from: audio.volume || 0,
        to: 1,
        durationMs: 420
      });
    };

    const turnSoundOff = () => {
      toggleVersion += 1;
      const version = toggleVersion;
      setBool(STORAGE.enabled, false);
      fadeAudioVolume({
        from: audio.volume,
        to: 0,
        durationMs: 360,
        onDone: () => {
          if (version !== toggleVersion) {
            return;
          }
          audio.muted = true;
          audio.pause();
          audio.volume = 0;
          persistProgress();
        }
      });
    };

    const toggleAudio = () => {
      const currentlyEnabled = getBool(STORAGE.enabled, true);
      if (!currentlyEnabled) {
        turnSoundOn();
      } else {
        turnSoundOff();
      }
      syncUi();
    };

    btn.addEventListener("click", toggleAudio);
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
        const INTRO_EXIT_MS = 140;
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
