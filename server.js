import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = path.join(__dirname, "data.json");

const defaultData = {
  users: [],
  sessions: [],
  stats: {
    totalMinutes: 320,
    streakDays: 12,
    breathsCompleted: 48,
    calmScore: 86
  }
};

function loadData() {
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(defaultData, null, 2));
    return structuredClone(defaultData);
  }
  return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
}

function saveData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/signup", (req, res) => {
  const { name, email } = req.body || {};
  if (!name || !email) {
    return res.status(400).json({ ok: false, message: "Name and email are required." });
  }
  const data = loadData();
  const exists = data.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    return res.status(409).json({ ok: false, message: "Account already exists." });
  }
  const newUser = {
    id: `user_${Date.now()}`,
    name,
    email,
    createdAt: new Date().toISOString()
  };
  data.users.push(newUser);
  saveData(data);
  res.json({ ok: true, user: newUser });
});

app.get("/api/stats", (_req, res) => {
  const data = loadData();
  res.json({ ok: true, stats: data.stats });
});

app.post("/api/breathing/session", (req, res) => {
  const { durationMinutes = 5, breaths = 30 } = req.body || {};
  const data = loadData();
  const session = {
    id: `session_${Date.now()}`,
    durationMinutes,
    breaths,
    createdAt: new Date().toISOString()
  };
  data.sessions.push(session);
  data.stats.totalMinutes += Number(durationMinutes) || 0;
  data.stats.breathsCompleted += Number(breaths) || 0;
  data.stats.streakDays = Math.min(30, data.stats.streakDays + 1);
  data.stats.calmScore = Math.min(100, data.stats.calmScore + 1);
  saveData(data);
  res.json({ ok: true, session, stats: data.stats });
});

app.get("/stats", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "stats.html"));
});

app.get("/breathing", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "breathing.html"));
});

app.get("/settings", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "settings.html"));
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Meditation app running on http://localhost:${PORT}`);
});
