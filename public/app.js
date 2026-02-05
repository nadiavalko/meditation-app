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
