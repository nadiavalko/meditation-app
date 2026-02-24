const STORAGE_KEYS = {
  user: "stillwave_user",
  stats: "stillwave_stats",
  sessions: "stillwave_sessions"
};

const defaultStats = {
  totalMinutes: 320,
  streakDays: 12,
  breathsCompleted: 48,
  calmScore: 86
};

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getStats() {
  return loadFromStorage(STORAGE_KEYS.stats, { ...defaultStats });
}

function updateStats(updateFn) {
  const stats = getStats();
  const updated = updateFn(stats);
  saveToStorage(STORAGE_KEYS.stats, updated);
  return updated;
}

const signupForm = document.querySelector("[data-signup-form]");
const signupStatus = document.querySelector("[data-signup-status]");

if (signupForm) {
  signupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(signupForm);
    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      createdAt: new Date().toISOString()
    };
    saveToStorage(STORAGE_KEYS.user, payload);
    signupStatus.textContent = `Welcome, ${payload.name}! Your space is ready.`;
    signupForm.reset();
  });
}

const statsTarget = document.querySelector("[data-stats]");
if (statsTarget) {
  const stats = getStats();
  statsTarget.querySelector("[data-minutes]").textContent = stats.totalMinutes;
  statsTarget.querySelector("[data-streak]").textContent = `${stats.streakDays} days`;
  statsTarget.querySelector("[data-breaths]").textContent = stats.breathsCompleted;
  statsTarget.querySelector("[data-calm]").textContent = `${stats.calmScore}%`;
}

const breathText = document.querySelector("[data-breath-text]");
const breathTimer = document.querySelector("[data-breath-timer]");

if (breathText && breathTimer) {
  const inhaleSeconds = 4;
  const exhaleSeconds = 6;
  const total = inhaleSeconds + exhaleSeconds;
  let counter = 0;

  setInterval(() => {
    const phaseTime = counter % total;
    const isInhale = phaseTime < inhaleSeconds;
    const remaining = (isInhale ? inhaleSeconds : exhaleSeconds) - (phaseTime % (isInhale ? inhaleSeconds : exhaleSeconds));

    breathText.textContent = isInhale ? "Inhale" : "Exhale";
    breathTimer.textContent = `Slow ${isInhale ? "inhale" : "exhale"} · ${remaining}s`;

    counter += 1;
  }, 1000);
}

const logButton = document.getElementById("log-session");
const sessionStatus = document.getElementById("session-status");

if (logButton && sessionStatus) {
  logButton.addEventListener("click", () => {
    sessionStatus.textContent = "Saving your session...";
    const sessions = loadFromStorage(STORAGE_KEYS.sessions, []);
    const newSession = {
      id: `session_${Date.now()}`,
      durationMinutes: 3,
      breaths: 18,
      createdAt: new Date().toISOString()
    };
    sessions.push(newSession);
    saveToStorage(STORAGE_KEYS.sessions, sessions);

    const stats = updateStats((current) => ({
      totalMinutes: current.totalMinutes + newSession.durationMinutes,
      breathsCompleted: current.breathsCompleted + newSession.breaths,
      streakDays: Math.min(30, current.streakDays + 1),
      calmScore: Math.min(100, current.calmScore + 1)
    }));

    sessionStatus.textContent = `Session saved. Total minutes: ${stats.totalMinutes}`;
  });
}

const settings = document.querySelectorAll("[data-setting]");
settings.forEach((setting) => {
  setting.addEventListener("click", () => {
    const on = setting.getAttribute("data-on") === "true";
    setting.setAttribute("data-on", String(!on));
  });
});

const burnInput = document.querySelector("[data-burn-input]");
const burnButton = document.querySelector("[data-burn-button]");
const burnFrame = document.querySelector("[data-burn-frame]");
const burnTitle = document.querySelector("[data-burn-title]");

if (burnInput && burnButton && burnFrame && burnTitle) {
  let lastValue = "";

  const clampToField = () => {
    if (burnInput.scrollHeight > burnInput.clientHeight) {
      burnInput.value = lastValue;
    } else {
      lastValue = burnInput.value;
    }
  };

  burnInput.addEventListener("input", clampToField);

  burnButton.addEventListener("click", () => {
    if (burnFrame.classList.contains("is-burning")) {
      return;
    }
    const fadeOutDelay = 400;
    const fadeOutDuration = 1200;
    const revealDuration = 1600;
    burnFrame.classList.add("is-burning");
    burnInput.setAttribute("disabled", "true");
    burnButton.setAttribute("disabled", "true");

    setTimeout(() => {
      burnFrame.classList.add("is-hidden");
    }, 1600);

    burnButton.classList.add("is-hidden");
    burnButton.style.display = "none";

    setTimeout(() => {
      burnTitle.classList.remove("is-fading");
      void burnTitle.offsetWidth;
      burnTitle.classList.add("is-fading");
    }, fadeOutDelay);

    setTimeout(() => {
      burnTitle.textContent = "It’s gone forever now.";
      burnTitle.classList.remove("is-fading");
      burnTitle.classList.remove("is-revealing");
      void burnTitle.offsetWidth;
      burnTitle.classList.add("is-revealing");
    }, fadeOutDelay + fadeOutDuration);

    setTimeout(() => {
      burnTitle.classList.remove("is-revealing");
    }, fadeOutDelay + fadeOutDuration + revealDuration);
  });
}

const breathingCanvas = document.querySelector("[data-breathing-canvas]");

if (breathingCanvas instanceof HTMLCanvasElement) {
  const ctx = breathingCanvas.getContext("2d");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (ctx) {
    const config = {
      rounds: 3,
      inhaleMs: 4000,
      exhaleMs: 6000,
      dotCount: 220,
      sphereSizePx: 375,
      baseDotSizePx: 9,
      centerDotSizePx: 18,
      dotColor: "#93BBED",
      dprCap: 2,
      driftSpeed: 0.00028,
      driftTiltSpeed: 0.00017
    };

    const stage = breathingCanvas.parentElement;
    const particles = [];
    const cycleMs = config.inhaleMs + config.exhaleMs;
    const totalMs = cycleMs * config.rounds;
    const state = {
      width: 0,
      height: 0,
      cx: 0,
      cy: 0,
      radius: 0,
      startTime: performance.now(),
      rafId: 0,
      done: false
    };

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const easeInOut = (t) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const hexToRgb = (hex) => {
      const value = hex.replace("#", "");
      return {
        r: Number.parseInt(value.slice(0, 2), 16),
        g: Number.parseInt(value.slice(2, 4), 16),
        b: Number.parseInt(value.slice(4, 6), 16)
      };
    };
    const dotRgb = hexToRgb(config.dotColor);

    const createParticles = () => {
      particles.length = 0;
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));

      for (let i = 0; i < config.dotCount; i += 1) {
        const t = (i + 0.5) / config.dotCount;
        const y = 1 - 2 * t;
        const radial = Math.sqrt(Math.max(0, 1 - y * y));
        const theta = i * goldenAngle;
        const x = Math.cos(theta) * radial;
        const z = Math.sin(theta) * radial;

        const shellJitter = (Math.random() - 0.5) * 0.18;
        const radiusNorm = clamp(0.92 + shellJitter, 0.72, 1.05);
        const curveAngle = Math.random() * Math.PI * 2;

        particles.push({
          x,
          y,
          z,
          radiusNorm,
          speedFactor: 0.86 + Math.random() * 0.34,
          phaseOffset: (Math.random() - 0.5) * 0.14,
          jitterAmp: 0.008 + Math.random() * 0.014,
          jitterFreq: 0.6 + Math.random() * 0.9,
          jitterPhase: Math.random() * Math.PI * 2,
          curveStrength: 0.02 + Math.random() * 0.03,
          curveAngle,
          alphaBase: 0.62 + Math.random() * 0.28,
          sizeJitter: 0.93 + Math.random() * 0.14
        });
      }
    };

    const resizeCanvas = () => {
      if (!stage) {
        return;
      }
      const rect = stage.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, config.dprCap);
      state.width = Math.max(1, Math.round(rect.width));
      state.height = Math.max(1, Math.round(rect.height));
      breathingCanvas.width = Math.round(state.width * dpr);
      breathingCanvas.height = Math.round(state.height * dpr);
      breathingCanvas.style.width = `${state.width}px`;
      breathingCanvas.style.height = `${state.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      state.cx = state.width / 2;
      state.cy = state.height / 2;
      state.radius = Math.min(state.width, state.height) * 0.41;
    };

    const drawCenterDot = (alpha = 1) => {
      ctx.fillStyle = `rgba(${dotRgb.r}, ${dotRgb.g}, ${dotRgb.b}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(
        state.cx,
        state.cy,
        config.centerDotSizePx / 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
    };

    const renderSphere = (elapsedMs) => {
      const cycleIndex = Math.floor(elapsedMs / cycleMs);
      const cycleTime = elapsedMs % cycleMs;
      const phase = cycleTime < config.inhaleMs ? "inhale" : "exhale";
      const phaseTime =
        phase === "inhale" ? cycleTime : cycleTime - config.inhaleMs;
      const phaseDuration = phase === "inhale" ? config.inhaleMs : config.exhaleMs;
      const phaseProgress = clamp(phaseTime / phaseDuration, 0, 1);
      const easedPhase = easeInOut(phaseProgress);
      const breathAmount = phase === "inhale" ? easedPhase : 1 - easedPhase;

      breathingCanvas.dataset.phase = phase;
      breathingCanvas.dataset.round = String(Math.min(cycleIndex + 1, config.rounds));

      ctx.clearRect(0, 0, state.width, state.height);

      if (breathAmount < 0.06) {
        drawCenterDot(1);
      } else {
        drawCenterDot(0.18);
      }

      const time = elapsedMs;
      const yaw = time * config.driftSpeed;
      const pitch = Math.sin(time * config.driftTiltSpeed) * 0.23;
      const cosYaw = Math.cos(yaw);
      const sinYaw = Math.sin(yaw);
      const cosPitch = Math.cos(pitch);
      const sinPitch = Math.sin(pitch);
      const perspective = state.radius * 2.8;
      const renderDots = [];

      for (const p of particles) {
        const localPhase = clamp(phaseProgress * p.speedFactor + p.phaseOffset, 0, 1);
        const localEase = easeInOut(localPhase);
        const localAmount = phase === "inhale" ? localEase : 1 - localEase;
        const amount = localAmount * breathAmount;

        if (amount <= 0.001) {
          continue;
        }

        const jitterTime = time * 0.001 * p.jitterFreq + p.jitterPhase;
        const jitterA = Math.sin(jitterTime);
        const jitterB = Math.cos(jitterTime * 1.37);
        const pathCurve = Math.sin(localPhase * Math.PI) * p.curveStrength * amount;
        const radiusPx = state.radius * p.radiusNorm * amount;

        let x3 =
          p.x * radiusPx +
          Math.cos(p.curveAngle) * pathCurve * state.radius +
          jitterA * p.jitterAmp * state.radius * amount;
        let y3 =
          p.y * radiusPx +
          Math.sin(p.curveAngle) * pathCurve * state.radius +
          jitterB * p.jitterAmp * state.radius * amount;
        let z3 =
          p.z * radiusPx +
          Math.sin(jitterTime * 0.83) * p.jitterAmp * state.radius * amount;

        const xYaw = x3 * cosYaw - z3 * sinYaw;
        const zYaw = x3 * sinYaw + z3 * cosYaw;
        const yPitch = y3 * cosPitch - zYaw * sinPitch;
        const zPitch = y3 * sinPitch + zYaw * cosPitch;

        x3 = xYaw;
        y3 = yPitch;
        z3 = zPitch;

        const scale = perspective / (perspective + z3 + state.radius * 1.2);
        const x2 = state.cx + x3 * scale;
        const y2 = state.cy + y3 * scale;
        const depth = clamp((z3 / (state.radius || 1) + 1) / 2, 0, 1);
        const size =
          (config.baseDotSizePx / 2) *
          p.sizeJitter *
          (0.88 + depth * 0.26) *
          (0.92 + amount * 0.08);
        const alpha = clamp(p.alphaBase * (0.6 + depth * 0.55), 0.18, 1);

        renderDots.push({ x2, y2, z3, size, alpha });
      }

      renderDots.sort((a, b) => a.z3 - b.z3);

      for (const dot of renderDots) {
        ctx.fillStyle = `rgba(${dotRgb.r}, ${dotRgb.g}, ${dotRgb.b}, ${dot.alpha})`;
        ctx.beginPath();
        ctx.arc(dot.x2, dot.y2, dot.size, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const renderReduced = () => {
      breathingCanvas.dataset.phase = "complete";
      breathingCanvas.dataset.round = String(config.rounds);
      ctx.clearRect(0, 0, state.width, state.height);
      drawCenterDot(1);
    };

    const frame = (timestamp) => {
      const elapsed = performance.now() - state.startTime;
      if (elapsed >= totalMs) {
        state.done = true;
        breathingCanvas.dataset.phase = "complete";
        breathingCanvas.dataset.round = String(config.rounds);
        ctx.clearRect(0, 0, state.width, state.height);
        drawCenterDot(1);
        return;
      }

      renderSphere(elapsed);
      state.rafId = window.requestAnimationFrame(frame);
    };

    createParticles();
    resizeCanvas();

    if (reducedMotion) {
      renderReduced();
    } else {
      state.rafId = window.requestAnimationFrame(frame);
    }

    window.addEventListener("resize", resizeCanvas, { passive: true });
  }
}

const roundDisplay = document.querySelector("[data-round-display]");

if (roundDisplay) {
  const inhaleSeconds = 4;
  const exhaleSeconds = 6;
  const roundsTotal = 5;
  const cycleSeconds = inhaleSeconds + exhaleSeconds;
  let currentRound = 1;

  roundDisplay.textContent = `Round ${currentRound} of ${roundsTotal}`;

  const roundInterval = setInterval(() => {
    currentRound += 1;
    if (currentRound > roundsTotal) {
      clearInterval(roundInterval);
      roundDisplay.textContent = "Pause...";
      setTimeout(() => {
        window.location.href = "/body-scan/";
      }, 1200);
      return;
    }
    roundDisplay.textContent = `Round ${currentRound} of ${roundsTotal}`;
  }, cycleSeconds * 1000);
}

const bodyScan = document.querySelector("[data-body-scan]");

if (bodyScan) {
  const bodyText = document.querySelector("[data-body-text]");
  const highlights = Array.from(document.querySelectorAll("[data-highlight]"));

  const steps = [
    { text: "Relax your forehead.", highlight: "forehead" },
    { text: "Soften your eyes.", highlight: "eyes" },
    { text: "Unclench your jaw.", highlight: "jaw" },
    { text: "Notice your neck.", highlight: "neck" },
    { text: "Release your shoulders.", highlight: "shoulders" },
    { text: "Feel your arms.", highlight: "arms" },
    { text: "Warmth in both hands.", highlight: "hands" },
    { text: "Ease into your chest.", highlight: "chest" },
    { text: "Soften your stomach.", highlight: "stomach" },
    { text: "Ground your hips.", highlight: "hips" },
    { text: "Notice your thighs.", highlight: "thighs" },
    { text: "Relax your knees.", highlight: "knees" },
    { text: "Release your calves.", highlight: "calves" },
    { text: "Feel both feet.", highlight: "feet" }
  ];

  const stepDuration = 2600;

  const setHighlight = (name) => {
    highlights.forEach((el) => {
      el.classList.toggle("is-active", el.getAttribute("data-highlight") === name);
    });
  };

  steps.forEach((step, index) => {
    setTimeout(() => {
      if (bodyText) {
        bodyText.textContent = step.text;
      }
      setHighlight(step.highlight);
    }, index * stepDuration);
  });

  const totalDuration = steps.length * stepDuration;
  setTimeout(() => {
    if (bodyText) {
      bodyText.textContent = "Well done.";
    }
    setHighlight(null);
  }, totalDuration + 300);

  setTimeout(() => {
    window.location.href = "/finish/";
  }, totalDuration + 1800);
}
