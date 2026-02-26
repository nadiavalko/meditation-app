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
const burnCanvas = document.querySelector("[data-burn-canvas]");
const burnMask = document.querySelector("[data-burn-mask]");
const burnTitle = document.querySelector("[data-burn-title]");
const journeyBreathingPhaseTitle = document.querySelector("[data-breathing-phase-title]");
const burnInputStack = document.querySelector(".burn-input-stack");
const journeyBreathingStage = document.querySelector("[data-journey-breathing-stage]");
const journeyBreathingCanvas = journeyBreathingStage?.querySelector("[data-breathing-canvas]");
const journeyBodyFigureStage = document.querySelector("[data-journey-body-figure-stage]");
const journeyBodyFigure = document.querySelector("[data-journey-body-figure]");
const journeyGratitudeGradient = document.querySelector("[data-journey-gratitude-gradient]");

const createBurnInputCanvasAnimator = (canvasEl, frameEl, inputEl) => {
  if (!canvasEl || !frameEl || !inputEl || typeof canvasEl.getContext !== "function") {
    return null;
  }
  const ctx = canvasEl.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return null;
  }

  const EFFECT_WIDTH = 360;
  const EFFECT_HEIGHT = 280;
  const EDGE_SEGMENTS = 128;
  const MAX_PARTICLES = 30;

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const smoothstep = (edge0, edge1, x) => {
    const t = clamp01((x - edge0) / Math.max(1e-6, edge1 - edge0));
    return t * t * (3 - 2 * t);
  };
  const lerp = (a, b, t) => a + (b - a) * t;

  const hashNoise = (x, y, z) => {
    const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123;
    return n - Math.floor(n);
  };

  const valueNoise3 = (x, y, z) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const z0 = Math.floor(z);
    const xf = x - x0;
    const yf = y - y0;
    const zf = z - z0;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const w = zf * zf * (3 - 2 * zf);
    const n000 = hashNoise(x0, y0, z0);
    const n100 = hashNoise(x0 + 1, y0, z0);
    const n010 = hashNoise(x0, y0 + 1, z0);
    const n110 = hashNoise(x0 + 1, y0 + 1, z0);
    const n001 = hashNoise(x0, y0, z0 + 1);
    const n101 = hashNoise(x0 + 1, y0, z0 + 1);
    const n011 = hashNoise(x0, y0 + 1, z0 + 1);
    const n111 = hashNoise(x0 + 1, y0 + 1, z0 + 1);
    const x00 = lerp(n000, n100, u);
    const x10 = lerp(n010, n110, u);
    const x01 = lerp(n001, n101, u);
    const x11 = lerp(n011, n111, u);
    return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w);
  };

  const fbmNoise = (x, y, t) => {
    let amp = 0.5;
    let freq = 1;
    let total = 0;
    let norm = 0;
    for (let octave = 0; octave < 3; octave += 1) {
      total += valueNoise3(x * freq, y * freq, t * freq * 0.4) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return norm > 0 ? total / norm : 0;
  };

  const wrapCanvasText = (context, text, maxWidth) => {
    const normalized = (text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const paragraphs = normalized.split("\n");
    const lines = [];
    paragraphs.forEach((paragraph, paragraphIndex) => {
      if (paragraph.length === 0) {
        lines.push("");
      } else {
        const words = paragraph.split(/\s+/);
        let line = "";
        words.forEach((word) => {
          const candidate = line ? `${line} ${word}` : word;
          if (context.measureText(candidate).width <= maxWidth) {
            line = candidate;
            return;
          }
          if (line) {
            lines.push(line);
            line = word;
          } else {
            lines.push(word);
            line = "";
          }
        });
        if (line) {
          lines.push(line);
        }
      }
      if (paragraphIndex < paragraphs.length - 1) {
        lines.push("");
      }
    });
    return lines;
  };

  const roundedRectPath = (context, x, y, width, height, radius) => {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
  };

  const fallbackSnapshotCanvas = () => {
    const offscreen = document.createElement("canvas");
    offscreen.width = EFFECT_WIDTH;
    offscreen.height = EFFECT_HEIGHT;
    const sctx = offscreen.getContext("2d");
    if (!sctx) {
      return offscreen;
    }
    const computedFrame = window.getComputedStyle(frameEl);
    const computedInput = window.getComputedStyle(inputEl);
    const borderRadius = Number.parseFloat(computedFrame.borderTopLeftRadius) || 12;
    const borderWidth = Number.parseFloat(computedFrame.borderTopWidth) || 1;
    const paddingLeft = Number.parseFloat(computedFrame.paddingLeft) || 0;
    const paddingRight = Number.parseFloat(computedFrame.paddingRight) || 0;
    const paddingTop = Number.parseFloat(computedFrame.paddingTop) || 0;
    const fontSize = Number.parseFloat(computedInput.fontSize) || 24;
    const lineHeight = Number.parseFloat(computedInput.lineHeight) || 32;
    const textColor = computedInput.color || "#ffffff";
    const frameBg = computedFrame.backgroundColor || "#1e203b";
    const frameBorder = computedFrame.borderTopColor || "#242960";
    roundedRectPath(sctx, 0.5, 0.5, EFFECT_WIDTH - 1, EFFECT_HEIGHT - 1, borderRadius);
    sctx.fillStyle = frameBg;
    sctx.fill();
    sctx.strokeStyle = frameBorder;
    sctx.lineWidth = borderWidth;
    sctx.stroke();
    sctx.font = `${computedInput.fontStyle} ${computedInput.fontWeight} ${fontSize}px ${computedInput.fontFamily}`;
    sctx.fillStyle = textColor;
    sctx.textBaseline = "top";
    const lines = wrapCanvasText(
      sctx,
      inputEl.value,
      Math.max(0, EFFECT_WIDTH - paddingLeft - paddingRight)
    );
    lines.forEach((line, index) => {
      const y = paddingTop + index * lineHeight;
      if (y + lineHeight <= EFFECT_HEIGHT - 6) {
        sctx.fillText(line, paddingLeft, y);
      }
    });
    return offscreen;
  };

  const makeSnapshot = async (element) => {
    if (typeof window.html2canvas === "function") {
      try {
        return await window.html2canvas(element, {
          backgroundColor: null,
          logging: false,
          scale: 1,
          useCORS: true
        });
      } catch {
        return fallbackSnapshotCanvas();
      }
    }
    return fallbackSnapshotCanvas();
  };

  return ({ element, effectWidth, effectHeight, duration, origin, onComplete }) => {
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reducedMotion) {
      if (inputEl) {
        inputEl.style.visibility = "hidden";
      }
      onComplete?.();
      return { cancel: () => {} };
    }

    const targetElement = element || frameEl;
    const effectW = effectWidth || EFFECT_WIDTH;
    const effectH = effectHeight || EFFECT_HEIGHT;
    const burnDurationMs = duration || 1200;
    const noiseAmplitude = 0.08;
    const edgeSoftness = 0.05;
    const rimWidth = 0.03;
    const frameRect = targetElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvasEl.width = Math.max(1, Math.round(effectW * dpr));
    canvasEl.height = Math.max(1, Math.round(effectH * dpr));
    canvasEl.style.width = `${frameRect.width}px`;
    canvasEl.style.height = `${frameRect.height}px`;

    const ox = origin?.x ?? effectW * 0.5;
    const oy = origin?.y ?? effectH;
    const maxDistance = Math.hypot(Math.max(ox, effectW - ox), Math.max(oy, effectH - oy));

    const pixelCount = effectW * effectH;
    const normalizedDistances = new Float32Array(pixelCount);
    const angleIndexes = new Uint16Array(pixelCount);
    for (let y = 0; y < effectH; y += 1) {
      for (let x = 0; x < effectW; x += 1) {
        const idx = y * effectW + x;
        const dx = x - ox;
        const dy = y - oy;
        normalizedDistances[idx] = Math.hypot(dx, dy) / maxDistance;
        const theta = Math.max(-Math.PI, Math.min(0, Math.atan2(dy, dx)));
        const normalizedAngle = (theta + Math.PI) / Math.PI;
        angleIndexes[idx] = Math.max(0, Math.min(EDGE_SEGMENTS - 1, Math.floor(normalizedAngle * EDGE_SEGMENTS)));
      }
    }

    const renderCanvas = document.createElement("canvas");
    renderCanvas.width = effectW;
    renderCanvas.height = effectH;
    const rctx = renderCanvas.getContext("2d");
    if (!rctx) {
      onComplete?.();
      return { cancel: () => {} };
    }

    let cancelled = false;
    let rafId = 0;
    const particles = [];
    let lastParticleSpawn = 0;
    let baseImageData = null;
    const rimEdges = new Float32Array(EDGE_SEGMENTS);

    const spawnParticles = (elapsedMs) => {
      if (particles.length >= MAX_PARTICLES || elapsedMs - lastParticleSpawn < 55) {
        return;
      }
      lastParticleSpawn = elapsedMs;
      const count = Math.min(2, MAX_PARTICLES - particles.length);
      for (let i = 0; i < count; i += 1) {
        const seg = Math.floor(Math.random() * EDGE_SEGMENTS);
        const theta = -Math.PI + ((seg + 0.5) / EDGE_SEGMENTS) * Math.PI;
        const r = rimEdges[seg] * maxDistance;
        particles.push({
          x: ox + Math.cos(theta) * r,
          y: oy + Math.sin(theta) * r,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -(0.35 + Math.random() * 0.55),
          lifeMs: 420 + Math.random() * 420,
          ageMs: 0,
          size: 1.5 + Math.random() * 2.2
        });
      }
    };

    const updateParticles = (deltaMs) => {
      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i];
        p.ageMs += deltaMs;
        if (p.ageMs >= p.lifeMs) {
          particles.splice(i, 1);
          continue;
        }
        p.x += p.vx * (deltaMs / 16.666);
        p.y += p.vy * (deltaMs / 16.666);
        p.vx *= 0.994;
        p.vy *= 0.996;
      }
    };

    const drawParticles = () => {
      if (particles.length === 0) {
        return;
      }
      rctx.save();
      rctx.globalCompositeOperation = "lighter";
      particles.forEach((p) => {
        const lifeT = clamp01(p.ageMs / p.lifeMs);
        const alpha = (1 - lifeT) * 0.5;
        if (alpha <= 0) {
          return;
        }
        const grad = rctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.5);
        grad.addColorStop(0, `rgba(255, 216, 132, ${alpha})`);
        grad.addColorStop(0.45, `rgba(255, 123, 58, ${alpha * 0.8})`);
        grad.addColorStop(1, "rgba(255, 123, 58, 0)");
        rctx.fillStyle = grad;
        rctx.beginPath();
        rctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
        rctx.fill();
      });
      rctx.restore();
    };

    (async () => {
      const snapshotCanvas = await makeSnapshot(targetElement);
      if (cancelled) {
        return;
      }

      const snapshotSource = document.createElement("canvas");
      snapshotSource.width = effectW;
      snapshotSource.height = effectH;
      const sctx = snapshotSource.getContext("2d", { willReadFrequently: true });
      if (!sctx) {
        onComplete?.();
        return;
      }
      sctx.clearRect(0, 0, effectW, effectH);
      sctx.drawImage(snapshotCanvas, 0, 0, effectW, effectH);
      baseImageData = sctx.getImageData(0, 0, effectW, effectH);

      inputEl.style.visibility = "hidden";
      let startTs = 0;
      let lastTs = 0;

      const frame = (ts) => {
        if (cancelled || !baseImageData) {
          return;
        }
        if (!startTs) {
          startTs = ts;
          lastTs = ts;
        }
        const elapsed = ts - startTs;
        const delta = ts - lastTs;
        lastTs = ts;
        const t = clamp01(elapsed / burnDurationMs);
        const front = easeOutCubic(t);

        const timeNoise = elapsed * 0.0015;
        for (let i = 0; i < EDGE_SEGMENTS; i += 1) {
          const u = i / EDGE_SEGMENTS;
          const n = fbmNoise(u * 6.2, u * 1.8 + 10.3, timeNoise);
          rimEdges[i] = clamp01(front + (n - 0.5) * noiseAmplitude);
        }

        const out = new Uint8ClampedArray(baseImageData.data);
        for (let i = 0; i < pixelCount; i += 1) {
          const edge = rimEdges[angleIndexes[i]];
          const nd = normalizedDistances[i];
          const diff = edge - nd;
          let alphaMul = 1;
          if (diff > edgeSoftness) {
            alphaMul = 0;
          } else if (diff > -edgeSoftness) {
            alphaMul = 1 - smoothstep(-edgeSoftness, edgeSoftness, diff);
          }
          const aIndex = i * 4 + 3;
          out[aIndex] = Math.round(out[aIndex] * alphaMul);
        }

        const imgData = new ImageData(out, effectW, effectH);
        rctx.setTransform(1, 0, 0, 1, 0, 0);
        rctx.clearRect(0, 0, effectW, effectH);
        rctx.putImageData(imgData, 0, 0);

        // Burn rim glow/char.
        rctx.save();
        rctx.lineCap = "round";
        rctx.lineJoin = "round";
        rctx.globalCompositeOperation = "lighter";
        rctx.shadowColor = "rgba(255, 108, 36, 0.45)";
        rctx.shadowBlur = 10;
        rctx.strokeStyle = "rgba(255, 176, 96, 0.28)";
        rctx.lineWidth = Math.max(1.2, effectW * 0.006);
        rctx.beginPath();
        for (let i = 0; i < EDGE_SEGMENTS; i += 1) {
          const theta = -Math.PI + (i / (EDGE_SEGMENTS - 1)) * Math.PI;
          const r = rimEdges[i] * maxDistance;
          const x = ox + Math.cos(theta) * r;
          const y = oy + Math.sin(theta) * r;
          if (i === 0) {
            rctx.moveTo(x, y);
          } else {
            rctx.lineTo(x, y);
          }
        }
        rctx.stroke();

        rctx.shadowBlur = 0;
        rctx.globalCompositeOperation = "source-over";
        rctx.strokeStyle = "rgba(66, 33, 16, 0.45)";
        rctx.lineWidth = Math.max(0.8, effectW * 0.003);
        rctx.beginPath();
        for (let i = 0; i < EDGE_SEGMENTS; i += 1) {
          const theta = -Math.PI + (i / (EDGE_SEGMENTS - 1)) * Math.PI;
          const r = rimEdges[i] * maxDistance;
          const x = ox + Math.cos(theta) * r;
          const y = oy + Math.sin(theta) * r;
          if (i === 0) {
            rctx.moveTo(x, y);
          } else {
            rctx.lineTo(x, y);
          }
        }
        rctx.stroke();
        rctx.restore();

        if (t < 1) {
          spawnParticles(elapsed);
          updateParticles(delta);
          drawParticles();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
          ctx.drawImage(renderCanvas, 0, 0, canvasEl.width, canvasEl.height);
          rafId = window.requestAnimationFrame(frame);
          return;
        }

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
        ctx.drawImage(renderCanvas, 0, 0, canvasEl.width, canvasEl.height);
        particles.length = 0;
        onComplete?.();
      };

      rafId = window.requestAnimationFrame(frame);
    })();

    return {
      cancel: () => {
        cancelled = true;
        if (rafId) {
          window.cancelAnimationFrame(rafId);
        }
      }
    };
  };
};

if (burnInput && burnButton && burnFrame && burnTitle) {
  let lastValue = "";
  const runCanvasBurn = createBurnInputCanvasAnimator(burnCanvas, burnFrame, burnInput);

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
    const burnFieldDurationMs = 1200;
    const fadeOutDelay = 400;
    const fadeOutDuration = 1200;
    const revealDuration = 1600;
    const guidanceRevealDuration = 2200;
    const stageRevealDuration = 1600;
    const holdAfterWellDoneMs = 900;
    const holdAfterBodyScanIntroMs = 1200;
    const shortBodyScanStepDurationMs = 15000;
    const longBodyScanStepDurationMs = 15000;
    const longBodyScanMidTextSwapMs = 7000;
    const closingBodyScanStepDurationMs = 4800;
    const gradientFadeLeadMs = 2200;
    let pendingBodyGradientIndexes = [];
    let bodyGradientPulseTimer = 0;

    const clearBodyGradientPulseTimer = () => {
      if (bodyGradientPulseTimer) {
        window.clearTimeout(bodyGradientPulseTimer);
        bodyGradientPulseTimer = 0;
      }
    };

    const ensureBodyGradientPulseStyles = (svgDoc) => {
      if (!svgDoc || svgDoc.getElementById("body-gradient-pulse-style")) {
        return;
      }
      const style = svgDoc.createElementNS("http://www.w3.org/2000/svg", "style");
      style.setAttribute("id", "body-gradient-pulse-style");
      style.textContent = `
        @keyframes bodyGradientPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        ellipse[data-pulse-active="true"] {
          animation: bodyGradientPulse 4.2s ease-in-out infinite;
          animation-delay: var(--pulse-delay, 0s);
        }
      `;
      const root = svgDoc.querySelector("svg");
      root?.appendChild(style);
    };

    const applyBodyGradientVisibility = (indexes, opacity = "1") => {
      if (!journeyBodyFigure || !("contentDocument" in journeyBodyFigure)) {
        return false;
      }
      const svgDoc = journeyBodyFigure.contentDocument;
      if (!svgDoc) {
        return false;
      }
      const ellipses = Array.from(svgDoc.querySelectorAll("ellipse"));
      if (ellipses.length === 0) {
        return false;
      }
      for (const index of indexes) {
        const ellipse = ellipses[index];
        if (!ellipse) {
          continue;
        }
        ellipse.style.transition = "opacity 1.6s ease";
        ellipse.style.opacity = opacity;
      }
      return true;
    };

    const setBodyGradients = (indexes) => {
      if (!journeyBodyFigure || !("contentDocument" in journeyBodyFigure)) {
        pendingBodyGradientIndexes = indexes.slice();
        return;
      }
      const svgDoc = journeyBodyFigure.contentDocument;
      if (!svgDoc) {
        pendingBodyGradientIndexes = indexes.slice();
        return;
      }
      const ellipses = Array.from(svgDoc.querySelectorAll("ellipse"));
      if (ellipses.length === 0) {
        pendingBodyGradientIndexes = indexes.slice();
        return;
      }
      ensureBodyGradientPulseStyles(svgDoc);
      clearBodyGradientPulseTimer();
      const targetSet = new Set(indexes);
      ellipses.forEach((ellipse, idx) => {
        const currentOpacity = window.getComputedStyle(ellipse).opacity;
        ellipse.removeAttribute("data-pulse-active");
        ellipse.style.removeProperty("--pulse-delay");
        // Freeze the current visual opacity before changing targets so pulse shutdown
        // doesn't make fade-outs appear abrupt.
        ellipse.style.transition = "none";
        ellipse.style.opacity = currentOpacity;
      });
      void svgDoc.documentElement?.getBoundingClientRect();
      ellipses.forEach((ellipse, idx) => {
        ellipse.style.transition = "opacity 3.2s ease-in-out";
        ellipse.style.opacity = targetSet.has(idx) ? "1" : "0";
      });
      bodyGradientPulseTimer = window.setTimeout(() => {
        ellipses.forEach((ellipse, idx) => {
          if (!targetSet.has(idx)) {
            ellipse.removeAttribute("data-pulse-active");
            return;
          }
          ellipse.setAttribute("data-pulse-active", "true");
          ellipse.style.setProperty("--pulse-delay", `${(idx % 3) * 0.35}s`);
        });
      }, 3250);
      pendingBodyGradientIndexes = [];
    };

    const revealBodyGradients = (indexes) => {
      if (!applyBodyGradientVisibility(indexes, "1")) {
        pendingBodyGradientIndexes = indexes.slice();
      }
    };

    const fadeOutBodyGradients = () => {
      setBodyGradients([]);
    };

    const resetBodyGradients = () => {
      pendingBodyGradientIndexes = [];
      clearBodyGradientPulseTimer();
      if (!journeyBodyFigure || !("contentDocument" in journeyBodyFigure)) {
        return;
      }
      const svgDoc = journeyBodyFigure.contentDocument;
      if (!svgDoc) {
        return;
      }
      const ellipses = svgDoc.querySelectorAll("ellipse");
      ellipses.forEach((ellipse) => {
        ellipse.removeAttribute("data-pulse-active");
        ellipse.style.removeProperty("--pulse-delay");
        ellipse.style.transition = "";
        ellipse.style.opacity = "0";
      });
    };

    const resetJourneyGratitudeGradient = () => {
      if (!journeyGratitudeGradient) {
        return;
      }
      journeyGratitudeGradient.classList.remove("is-revealing");
      journeyGratitudeGradient.classList.add("is-hidden");
    };

    const revealJourneyGratitudeGradient = () => {
      if (!journeyGratitudeGradient) {
        return;
      }
      journeyGratitudeGradient.classList.remove("is-hidden", "is-revealing");
      void journeyGratitudeGradient.offsetWidth;
      journeyGratitudeGradient.classList.add("is-revealing");
    };

    if (journeyBodyFigure && "addEventListener" in journeyBodyFigure) {
      journeyBodyFigure.addEventListener(
        "load",
        () => {
          if (pendingBodyGradientIndexes.length > 0) {
            applyBodyGradientVisibility(pendingBodyGradientIndexes, "1");
            pendingBodyGradientIndexes = [];
          } else {
            resetBodyGradients();
          }
        },
        { once: true }
      );
    }

    const revealJourneyTitle = (text, revealMs = revealDuration) => {
      burnTitle.textContent = text;
      burnTitle.style.display = "";
      burnTitle.style.setProperty("--seq-fade-duration", `${revealMs}ms`);
      burnTitle.classList.remove(
        "is-phase-label",
        "is-breath-fading",
        "is-breath-revealing",
        "is-fading",
        "is-revealing"
      );
      void burnTitle.offsetWidth;
      burnTitle.classList.add("is-revealing");
      window.setTimeout(() => {
        burnTitle.classList.remove("is-revealing");
        burnTitle.style.removeProperty("--seq-fade-duration");
      }, revealMs);
    };

    const fadeOutJourneyTitle = (delayMs = 0) => {
      window.setTimeout(() => {
        burnTitle.style.removeProperty("--seq-fade-duration");
        burnTitle.classList.remove(
          "is-phase-label",
          "is-breath-fading",
          "is-breath-revealing",
          "is-fading",
          "is-revealing"
        );
        void burnTitle.offsetWidth;
        burnTitle.classList.add("is-fading");
      }, delayMs);
    };
    burnFrame.classList.add("is-burning");
    let burnAnimationController = null;
    if (typeof runCanvasBurn === "function") {
      burnFrame.classList.add("is-burning-canvas");
      burnAnimationController = runCanvasBurn({
        element: burnFrame,
        effectWidth: 360,
        effectHeight: 280,
        duration: burnFieldDurationMs,
        origin: { x: 180, y: 280 },
        onComplete: () => {
          if (burnCanvas) {
            burnCanvas.style.opacity = "0";
          }
        }
      });
    }
    if (!burnAnimationController && burnMask) {
      burnMask.style.height = "0%";
      if (typeof burnMask.animate === "function") {
        burnMask.animate(
          [{ height: "0%" }, { height: "100%" }],
          {
            duration: burnFieldDurationMs,
            easing: "linear",
            fill: "forwards"
          }
        );
      } else {
        burnMask.style.transition = `height ${burnFieldDurationMs}ms linear`;
        requestAnimationFrame(() => {
          burnMask.style.height = "100%";
        });
      }
    }
    burnInput.setAttribute("disabled", "true");
    burnButton.setAttribute("disabled", "true");
    burnTitle.classList.remove("burn-seq", "burn-seq-1", "burn-seq-2", "burn-seq-3");
    if (journeyBodyFigureStage) {
      journeyBodyFigureStage.classList.remove("is-revealing");
      journeyBodyFigureStage.classList.add("is-hidden");
      journeyBodyFigureStage.setAttribute("aria-hidden", "true");
    }
    if (journeyBodyFigure) {
      journeyBodyFigure.classList.remove("is-revealing");
      journeyBodyFigure.style.removeProperty("--seq-fade-duration");
    }
    resetBodyGradients();
    resetJourneyGratitudeGradient();

    setTimeout(() => {
      burnAnimationController?.cancel?.();
      burnFrame.classList.add("is-hidden");
    }, burnFieldDurationMs);

    burnButton.classList.add("is-hidden");
    burnButton.style.display = "none";

    setTimeout(() => {
      burnTitle.classList.remove("is-fading");
      void burnTitle.offsetWidth;
      burnTitle.classList.add("is-fading");
    }, fadeOutDelay);

    setTimeout(() => {
      burnTitle.classList.remove("is-fading");
      revealJourneyTitle("It’s gone forever.");
    }, fadeOutDelay + fadeOutDuration);

    const breathingIntroStart = fadeOutDelay + fadeOutDuration + revealDuration + 900;
    const breathingIntroSwap = breathingIntroStart + fadeOutDuration;
    const breathingStageRevealDelay = breathingIntroSwap + guidanceRevealDuration + 250;
    const breathingGuidanceFadeOutStart = breathingIntroSwap + guidanceRevealDuration + 500;
    const breathingSequenceStartDelay =
      Math.max(
        breathingGuidanceFadeOutStart + fadeOutDuration + 180,
        breathingStageRevealDelay + stageRevealDuration + 120
      );

    setTimeout(() => {
      fadeOutJourneyTitle();
    }, breathingIntroStart);

    setTimeout(() => {
      burnTitle.classList.remove("is-fading");
      revealJourneyTitle("Let’s take three deep breaths together.", guidanceRevealDuration);
    }, breathingIntroSwap);

    setTimeout(() => {
      burnTitle.classList.remove("is-revealing");
      if (burnInputStack) {
        burnInputStack.classList.add("is-hidden");
      }
      if (journeyBreathingStage) {
        journeyBreathingStage.classList.remove("is-hidden");
        journeyBreathingStage.classList.remove("is-revealing");
        void journeyBreathingStage.offsetWidth;
        journeyBreathingStage.classList.add("is-revealing");
      }
    }, breathingStageRevealDelay);

    setTimeout(() => {
      fadeOutJourneyTitle();
    }, breathingGuidanceFadeOutStart);

    if (journeyBreathingCanvas) {
      journeyBreathingCanvas.__onBreathingComplete = () => {
        if (journeyBreathingPhaseTitle) {
          journeyBreathingPhaseTitle.classList.remove("is-breath-revealing", "is-revealing");
          journeyBreathingPhaseTitle.classList.add("is-breath-fading");
        }
        if (journeyBreathingStage) {
          journeyBreathingStage.classList.remove("is-revealing");
          journeyBreathingStage.classList.add("is-fading");
        }

        window.setTimeout(() => {
          if (journeyBreathingPhaseTitle) {
            journeyBreathingPhaseTitle.classList.remove("is-breath-fading");
            journeyBreathingPhaseTitle.classList.add("is-hidden");
            journeyBreathingPhaseTitle.style.display = "none";
            journeyBreathingPhaseTitle.textContent = "";
          }
          if (journeyBreathingStage) {
            journeyBreathingStage.classList.remove("is-fading");
            journeyBreathingStage.classList.add("is-hidden");
            journeyBreathingStage.setAttribute("aria-hidden", "true");
          }

          revealJourneyTitle("Well done.");

          window.setTimeout(() => {
            fadeOutJourneyTitle();
          }, revealDuration + holdAfterWellDoneMs);

          const finalStopRevealAt = revealDuration + holdAfterWellDoneMs + fadeOutDuration;
          window.setTimeout(() => {
            burnTitle.classList.remove("is-fading");
            revealJourneyTitle("Now, last stop.");
          }, finalStopRevealAt);

          window.setTimeout(() => {
            fadeOutJourneyTitle();
          }, finalStopRevealAt + revealDuration + holdAfterWellDoneMs);

          window.setTimeout(() => {
            burnTitle.classList.remove("is-fading");
            revealJourneyTitle("I’ll guide you through a quick body scan.");
          }, finalStopRevealAt + revealDuration + holdAfterWellDoneMs + fadeOutDuration);

          const bodyScanPromptRevealAt =
            finalStopRevealAt + revealDuration + holdAfterWellDoneMs + fadeOutDuration;

          window.setTimeout(() => {
            if (journeyBodyFigureStage) {
              journeyBodyFigureStage.classList.remove("is-hidden", "is-revealing");
              journeyBodyFigureStage.setAttribute("aria-hidden", "false");
            }
            if (journeyBodyFigure) {
              journeyBodyFigure.classList.remove("is-revealing");
              journeyBodyFigure.style.setProperty("--seq-fade-duration", "3200ms");
              void journeyBodyFigure.offsetWidth;
              journeyBodyFigure.classList.add("is-revealing");
            }
          }, bodyScanPromptRevealAt + 950);

          window.setTimeout(() => {
            fadeOutJourneyTitle();
          }, bodyScanPromptRevealAt + revealDuration + holdAfterBodyScanIntroMs);

          const feetPromptRevealAt =
            bodyScanPromptRevealAt +
            revealDuration +
            holdAfterBodyScanIntroMs +
            fadeOutDuration;

          window.setTimeout(() => {
            burnTitle.classList.remove("is-fading");
            revealJourneyTitle("Notice any sensations in your feet.");
            setBodyGradients([9, 10]);
          }, feetPromptRevealAt);

          const legsPromptFadeAt = feetPromptRevealAt + shortBodyScanStepDurationMs;
          window.setTimeout(() => {
            fadeOutBodyGradients();
          }, Math.max(0, legsPromptFadeAt - gradientFadeLeadMs));
          window.setTimeout(() => {
            fadeOutJourneyTitle();
          }, legsPromptFadeAt);

          const legsPromptRevealAt = legsPromptFadeAt + fadeOutDuration;
          window.setTimeout(() => {
            burnTitle.classList.remove("is-fading");
            revealJourneyTitle("Feel your legs grow heavy.");
            setBodyGradients([7, 8]);
          }, legsPromptRevealAt);

          const stomachPromptFadeAt = legsPromptRevealAt + shortBodyScanStepDurationMs;
          window.setTimeout(() => {
            fadeOutBodyGradients();
          }, Math.max(0, stomachPromptFadeAt - gradientFadeLeadMs));
          window.setTimeout(() => {
            fadeOutJourneyTitle();
          }, stomachPromptFadeAt);

          const stomachPromptRevealAt = stomachPromptFadeAt + fadeOutDuration;
          window.setTimeout(() => {
            burnTitle.classList.remove("is-fading");
            revealJourneyTitle("Notice your stomach.");
            setBodyGradients([6]);
          }, stomachPromptRevealAt);

          const stomachMidFadeAt = stomachPromptRevealAt + longBodyScanMidTextSwapMs;
          window.setTimeout(() => {
            fadeOutJourneyTitle();
          }, stomachMidFadeAt);

          window.setTimeout(() => {
            burnTitle.classList.remove("is-fading");
            revealJourneyTitle("Feel its emptiness or fullness.");
          }, stomachMidFadeAt + fadeOutDuration);

          const armsPromptFadeAt = stomachPromptRevealAt + longBodyScanStepDurationMs;
          window.setTimeout(() => {
            fadeOutBodyGradients();
          }, Math.max(0, armsPromptFadeAt - gradientFadeLeadMs));
          window.setTimeout(() => {
            fadeOutJourneyTitle();
          }, armsPromptFadeAt);

          const armsPromptRevealAt = armsPromptFadeAt + fadeOutDuration;
          window.setTimeout(() => {
            burnTitle.classList.remove("is-fading");
            revealJourneyTitle("See if you can relax your arms.");
            setBodyGradients([4, 5]);
          }, armsPromptRevealAt);

          const chestPromptFadeAt = armsPromptRevealAt + shortBodyScanStepDurationMs;
          window.setTimeout(() => {
            fadeOutBodyGradients();
          }, Math.max(0, chestPromptFadeAt - gradientFadeLeadMs));
          window.setTimeout(() => {
            fadeOutJourneyTitle();
          }, chestPromptFadeAt);

          const chestPromptRevealAt = chestPromptFadeAt + fadeOutDuration;
          window.setTimeout(() => {
            burnTitle.classList.remove("is-fading");
            revealJourneyTitle("Feel your chest rise and fall.");
            setBodyGradients([3]);
          }, chestPromptRevealAt);

          const shouldersPromptFadeAt = chestPromptRevealAt + shortBodyScanStepDurationMs;
          window.setTimeout(() => {
            fadeOutBodyGradients();
          }, Math.max(0, shouldersPromptFadeAt - gradientFadeLeadMs));
          window.setTimeout(() => {
            fadeOutJourneyTitle();
          }, shouldersPromptFadeAt);

          const shouldersPromptRevealAt = shouldersPromptFadeAt + fadeOutDuration;
          window.setTimeout(() => {
            burnTitle.classList.remove("is-fading");
            revealJourneyTitle("Allow your shoulders to drop.");
            setBodyGradients([1, 2]);
          }, shouldersPromptRevealAt);

          const shouldersMidFadeAt = shouldersPromptRevealAt + longBodyScanMidTextSwapMs;
          window.setTimeout(() => {
            fadeOutJourneyTitle();
          }, shouldersMidFadeAt);

          window.setTimeout(() => {
            burnTitle.classList.remove("is-fading");
            revealJourneyTitle("Release what they’ve been holding.");
          }, shouldersMidFadeAt + fadeOutDuration);

          const facePromptFadeAt = shouldersPromptRevealAt + longBodyScanStepDurationMs;
          window.setTimeout(() => {
            fadeOutBodyGradients();
          }, Math.max(0, facePromptFadeAt - gradientFadeLeadMs));
          window.setTimeout(() => {
            fadeOutJourneyTitle();
          }, facePromptFadeAt);

          const facePromptRevealAt = facePromptFadeAt + fadeOutDuration;
          window.setTimeout(() => {
            burnTitle.classList.remove("is-fading");
            revealJourneyTitle("Notice any tension in your face.");
            setBodyGradients([0]);
          }, facePromptRevealAt);

          const faceMidFadeAt = facePromptRevealAt + longBodyScanMidTextSwapMs;
          window.setTimeout(() => {
            fadeOutJourneyTitle();
          }, faceMidFadeAt);

          window.setTimeout(() => {
            burnTitle.classList.remove("is-fading");
            revealJourneyTitle("Relax your jaw, eyes, and forehead.");
          }, faceMidFadeAt + fadeOutDuration);

          const wholeBodyPromptFadeAt = facePromptRevealAt + longBodyScanStepDurationMs;
          window.setTimeout(() => {
            fadeOutBodyGradients();
          }, Math.max(0, wholeBodyPromptFadeAt - gradientFadeLeadMs));
          window.setTimeout(() => {
            fadeOutJourneyTitle();
          }, wholeBodyPromptFadeAt);

          const wholeBodyPromptRevealAt = wholeBodyPromptFadeAt + fadeOutDuration;
          window.setTimeout(() => {
            burnTitle.classList.remove("is-fading");
            revealJourneyTitle("Bring awareness to your whole body.");
          }, wholeBodyPromptRevealAt);

          const gratitudePromptFadeAt = wholeBodyPromptRevealAt + closingBodyScanStepDurationMs;
          window.setTimeout(() => {
            fadeOutJourneyTitle();
          }, gratitudePromptFadeAt);

          const gratitudePromptRevealAt = gratitudePromptFadeAt + fadeOutDuration;
          window.setTimeout(() => {
            burnTitle.classList.remove("is-fading");
            revealJourneyTitle("Send gratitude to your vessel, your home.");
            revealJourneyGratitudeGradient();
          }, gratitudePromptRevealAt);

          const completePromptFadeAt = gratitudePromptRevealAt + closingBodyScanStepDurationMs;
          window.setTimeout(() => {
            fadeOutJourneyTitle();
          }, completePromptFadeAt);

          window.setTimeout(() => {
            burnTitle.classList.remove("is-fading");
            revealJourneyTitle("Notice how complete you are.");
          }, completePromptFadeAt + fadeOutDuration);

          window.setTimeout(() => {
            window.location.href = "/finish/";
          }, completePromptFadeAt + fadeOutDuration + closingBodyScanStepDurationMs + fadeOutDuration);
        }, fadeOutDuration);
      };
    }

    setTimeout(() => {
      burnTitle.classList.remove(
        "is-phase-label",
        "is-breath-fading",
        "is-breath-revealing",
        "is-fading",
        "is-revealing"
      );
      burnTitle.style.removeProperty("--seq-fade-duration");
      burnTitle.style.display = "none";
      if (journeyBreathingPhaseTitle) {
        journeyBreathingPhaseTitle.style.display = "";
        journeyBreathingPhaseTitle.classList.remove("is-hidden");
        journeyBreathingPhaseTitle.classList.remove(
          "is-phase-label",
          "is-breath-fading",
          "is-breath-revealing",
          "is-fading",
          "is-revealing"
        );
        journeyBreathingPhaseTitle.textContent = "";
      }
      if (journeyBreathingStage) {
        journeyBreathingStage.setAttribute("aria-hidden", "false");
        journeyBreathingStage.classList.remove("is-revealing");
      }
      const startBreathing = journeyBreathingCanvas?.__startBreathingSequence;
      if (typeof startBreathing === "function") {
        startBreathing();
      }
    }, breathingSequenceStartDelay);
  });
}

const breathingCanvas = document.querySelector("[data-breathing-canvas]");

if (breathingCanvas instanceof HTMLCanvasElement) {
  const ctx = breathingCanvas.getContext("2d");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const breathingTitle =
    document.querySelector("[data-breathing-phase-title]") ||
    document.querySelector("[data-breathing-title]");
  const breathingAutoStart = breathingCanvas.dataset.breathingAutostart !== "false";

  if (ctx) {
    const config = {
      rounds: 3,
      inhaleMs: 4000,
      exhaleMs: 6000,
      introDotHoldMs: 120,
      introDotFadeInMs: 420,
      phaseLabelLagMs: 180,
      dotCount: 220,
      sphereSizePx: 400,
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
      startTime: 0,
      sequenceKickoffTime: 0,
      rafId: 0,
      done: false,
      started: false,
      completeNotified: false
    };
    const titleTimers = [];

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
    const parseCssTimeMs = (value) => {
      if (!value) {
        return 0;
      }
      const first = value.split(",")[0].trim();
      if (first.endsWith("ms")) {
        return Number.parseFloat(first);
      }
      if (first.endsWith("s")) {
        return Number.parseFloat(first) * 1000;
      }
      return 0;
    };
    const genericTitleFadeOutMs = 1200;
    const genericTitleRevealMs = 1600;
    const phaseTitleFadeOutMs = 550;
    const phaseTitleRevealMs = 800;
    let titleTransitionToken = 0;

    const transitionBreathingTitle = (nextText) => {
      if (!breathingTitle) {
        return;
      }
      const currentText = breathingTitle.textContent.trim();
      const currentIsPhaseLabel =
        currentText === "Inhale" || currentText === "Exhale";
      const nextIsPhaseLabel = nextText === "Inhale" || nextText === "Exhale";
      const fadeOutMs = currentIsPhaseLabel ? phaseTitleFadeOutMs : genericTitleFadeOutMs;
      const revealMs = nextIsPhaseLabel ? phaseTitleRevealMs : genericTitleRevealMs;
      if (
        currentText === nextText &&
        !breathingTitle.classList.contains("is-breath-fading") &&
        !breathingTitle.classList.contains("is-fading")
      ) {
        return;
      }

      titleTransitionToken += 1;
      const token = titleTransitionToken;
      breathingTitle.classList.remove("burn-seq", "burn-seq-1", "burn-seq-2", "burn-seq-3");
      breathingTitle.classList.toggle("is-phase-label", currentIsPhaseLabel);
      breathingTitle.classList.remove(
        "is-breath-fading",
        "is-breath-revealing",
        "is-fading",
        "is-revealing"
      );
      void breathingTitle.offsetWidth;
      breathingTitle.classList.add(
        currentIsPhaseLabel ? "is-breath-fading" : "is-fading"
      );

      const swapTimer = window.setTimeout(() => {
        if (token !== titleTransitionToken) {
          return;
        }
        breathingTitle.textContent = nextText;
        breathingTitle.classList.toggle("is-phase-label", nextIsPhaseLabel);
        breathingTitle.classList.remove(
          "is-breath-fading",
          "is-breath-revealing",
          "is-fading",
          "is-revealing"
        );
        void breathingTitle.offsetWidth;
        breathingTitle.classList.add(
          nextIsPhaseLabel ? "is-breath-revealing" : "is-revealing"
        );

        const revealCleanupTimer = window.setTimeout(() => {
          if (token !== titleTransitionToken) {
            return;
          }
          breathingTitle.classList.remove("is-breath-revealing", "is-revealing");
        }, revealMs);
        titleTimers.push(revealCleanupTimer);
      }, fadeOutMs);
      titleTimers.push(swapTimer);
    };

    const scheduleTitleBoundarySwap = (nextText, swapAtMs, leadMs) => {
      if (!breathingTitle) {
        return;
      }
      const delay = Math.max(0, swapAtMs - leadMs - performance.now());
      const timer = window.setTimeout(() => {
        transitionBreathingTitle(nextText);
      }, delay);
      titleTimers.push(timer);
    };

    const createParticles = () => {
      particles.length = 0;

      for (let i = 0; i < config.dotCount; i += 1) {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const sinPhi = Math.sin(phi);
        const x = Math.cos(theta) * sinPhi;
        const y = Math.cos(phi);
        const z = Math.sin(theta) * sinPhi;

        const shellHeavy = Math.random() < 0.82;
        const radiusNorm = shellHeavy
          ? clamp(0.88 + Math.pow(Math.random(), 2.8) * 0.2, 0.82, 1.08)
          : clamp(0.48 + Math.pow(Math.random(), 1.5) * 0.34, 0.42, 0.86);
        const curveAngle = Math.random() * Math.PI * 2;

        particles.push({
          x,
          y,
          z,
          radiusNorm,
          speedFactor: 0.92 + Math.random() * 0.18,
          phaseOffset: (Math.random() - 0.5) * 0.07,
          jitterAmp: 0.006 + Math.random() * 0.012,
          jitterFreq: 0.6 + Math.random() * 0.9,
          jitterPhase: Math.random() * Math.PI * 2,
          curveStrength: 0.03 + Math.random() * 0.045,
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
      state.radius = Math.min(state.width, state.height) * 0.45;
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
      const centerAlpha =
        breathAmount >= 0.7
          ? 0
          : clamp(Math.pow(1 - breathAmount / 0.7, 1.6), 0, 1);
      breathingCanvas.dataset.centerAlpha = centerAlpha.toFixed(3);
      drawCenterDot(centerAlpha);

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
        const envelope = Math.sin(phaseProgress * Math.PI);
        const localPhase = clamp(
          phaseProgress * p.speedFactor + envelope * p.phaseOffset,
          0,
          1
        );
        const localEase = easeInOut(localPhase);
        const amount = phase === "inhale" ? localEase : 1 - localEase;
        const amountVisual = Math.pow(amount, 0.82);

        if (amountVisual <= 0.0001) {
          continue;
        }

        const jitterTime = time * 0.001 * p.jitterFreq + p.jitterPhase;
        const jitterA = Math.sin(jitterTime);
        const jitterB = Math.cos(jitterTime * 1.37);
        const pathCurve =
          Math.sin(localPhase * Math.PI) * p.curveStrength * amountVisual;
        const radiusPx = state.radius * p.radiusNorm * amountVisual;

        let x3 =
          p.x * radiusPx +
          Math.cos(p.curveAngle) * pathCurve * state.radius +
          jitterA * p.jitterAmp * state.radius * amountVisual;
        let y3 =
          p.y * radiusPx +
          Math.sin(p.curveAngle) * pathCurve * state.radius +
          jitterB * p.jitterAmp * state.radius * amountVisual;
        let z3 =
          p.z * radiusPx +
          Math.sin(jitterTime * 0.83) * p.jitterAmp * state.radius * amountVisual;

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
          (0.9 + amountVisual * 0.1);
        const alpha = clamp(
          p.alphaBase * (0.55 + depth * 0.5) * (0.35 + amountVisual * 0.65),
          0.06,
          1
        );

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
      breathingCanvas.dataset.centerAlpha = "1.000";
      ctx.clearRect(0, 0, state.width, state.height);
      drawCenterDot(1);
    };

    const frame = (timestamp) => {
      const now = performance.now();
      const elapsed = now - state.startTime;
      if (elapsed < 0) {
        const introElapsed = Math.max(0, now - state.sequenceKickoffTime);
        const introAlpha = easeInOut(
          clamp(introElapsed / config.introDotFadeInMs, 0, 1)
        );
        breathingCanvas.dataset.phase = "intro";
        breathingCanvas.dataset.round = "1";
        breathingCanvas.dataset.centerAlpha = introAlpha.toFixed(3);
        ctx.clearRect(0, 0, state.width, state.height);
        drawCenterDot(introAlpha);
        state.rafId = window.requestAnimationFrame(frame);
        return;
      }
      if (elapsed >= totalMs) {
        state.done = true;
        breathingCanvas.dataset.phase = "complete";
        breathingCanvas.dataset.round = String(config.rounds);
        ctx.clearRect(0, 0, state.width, state.height);
        drawCenterDot(1);
        if (!state.completeNotified) {
          state.completeNotified = true;
          const onComplete = breathingCanvas.__onBreathingComplete;
          if (typeof onComplete === "function") {
            onComplete();
          }
        }
        return;
      }

      renderSphere(elapsed);
      state.rafId = window.requestAnimationFrame(frame);
    };

    createParticles();
    resizeCanvas();
    const clearTitleTimers = () => {
      while (titleTimers.length > 0) {
        const timer = titleTimers.pop();
        if (timer) {
          window.clearTimeout(timer);
        }
      }
    };

    const startBreathingSequence = () => {
      if (state.started) {
        return;
      }
      state.started = true;
      state.done = false;
      state.completeNotified = false;
      state.sequenceKickoffTime = performance.now();
      resizeCanvas();
      clearTitleTimers();
      titleTransitionToken += 1;

      if (stage) {
        const stageStyles = window.getComputedStyle(stage);
        const stageDelayMs = parseCssTimeMs(stageStyles.animationDelay);
        const stageDurationMs = parseCssTimeMs(stageStyles.animationDuration);
        const now = performance.now();
        state.sequenceKickoffTime = now;
        const firstInhaleStartMs =
          now + stageDelayMs + stageDurationMs + config.introDotHoldMs + genericTitleFadeOutMs;
        state.startTime = firstInhaleStartMs;

        scheduleTitleBoundarySwap(
          "Inhale",
          firstInhaleStartMs + config.phaseLabelLagMs,
          genericTitleFadeOutMs
        );
        for (let roundIndex = 0; roundIndex < config.rounds; roundIndex += 1) {
          const inhaleStartMs = firstInhaleStartMs + roundIndex * cycleMs;
          const exhaleStartMs = inhaleStartMs + config.inhaleMs;
          if (roundIndex > 0) {
            scheduleTitleBoundarySwap(
              "Inhale",
              inhaleStartMs + config.phaseLabelLagMs,
              phaseTitleFadeOutMs
            );
          }
          scheduleTitleBoundarySwap(
            "Exhale",
            exhaleStartMs + config.phaseLabelLagMs,
            phaseTitleFadeOutMs
          );
        }
      } else {
        state.startTime = performance.now();
      }

      if (reducedMotion) {
        renderReduced();
        return;
      }
      state.rafId = window.requestAnimationFrame(frame);
    };

    breathingCanvas.__startBreathingSequence = startBreathingSequence;

    if (breathingAutoStart) {
      startBreathingSequence();
    } else {
      breathingCanvas.dataset.phase = "idle";
      breathingCanvas.dataset.round = "0";
      breathingCanvas.dataset.centerAlpha = "0.000";
      ctx.clearRect(0, 0, state.width, state.height);
      if (breathingTitle?.matches("[data-breathing-phase-title]")) {
        breathingTitle.classList.add("is-hidden");
      }
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
