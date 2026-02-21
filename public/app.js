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
    burnFrame.classList.add("is-burning");
    burnInput.setAttribute("disabled", "true");
    burnButton.setAttribute("disabled", "true");

    setTimeout(() => {
      burnFrame.classList.add("is-hidden");
    }, 1600);

    burnButton.classList.add("is-hidden");

    setTimeout(() => {
      burnTitle.classList.add("is-fading");
    }, 600);

    setTimeout(() => {
      burnTitle.textContent = "It’s gone forever now.";
      burnTitle.classList.remove("is-fading");
    }, 1800);
  });
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
