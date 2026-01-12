const TRAY_DAYS = 10;

const startDateInput = document.getElementById("startDate");
const saveBtn = document.getElementById("saveBtn");
const saveStatus = document.getElementById("saveStatus");
const authHint = document.getElementById("authHint");

const trayNumEl = document.getElementById("trayNum");
const nextChangeEl = document.getElementById("nextChange");
const countdownEl = document.getElementById("countdown");

let startDateIso = null;

function pad(n) { return String(n).padStart(2, "0"); }

function formatDuration(ms) {
  if (!Number.isFinite(ms)) return "—";
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function toLocalDatetimeValue(isoString) {
  const d = new Date(isoString);
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

function compute() {
  if (!startDateIso) {
    trayNumEl.textContent = "—";
    nextChangeEl.textContent = "—";
    countdownEl.textContent = "—";
    return;
  }

  const start = new Date(startDateIso);
  const now = new Date();

  const trayMs = TRAY_DAYS * 24 * 60 * 60 * 1000;
  const elapsedMs = now - start;

  // If start date is in the future, treat as tray 1 not started yet.
  const currentTray = elapsedMs < 0 ? 1 : Math.floor(elapsedMs / trayMs) + 1;
  const nextChange = new Date(start.getTime() + currentTray * trayMs);
  const remaining = nextChange - now;

  trayNumEl.textContent = String(currentTray);
  nextChangeEl.textContent = nextChange.toLocaleString();
  countdownEl.textContent = formatDuration(remaining);
}

async function loadSettings() {
  authHint.textContent = "";
  try {
    const res = await fetch("/api/settings", { method: "GET" });
    if (res.status === 401) {
      authHint.textContent = "Login to save & sync across devices.";
      compute();
      return;
    }
    if (!res.ok) throw new Error(`GET /api/settings failed: ${res.status}`);

    const data = await res.json();
    if (data?.startDateIso) {
      startDateIso = data.startDateIso;
      startDateInput.value = toLocalDatetimeValue(startDateIso);
    }
    compute();
  } catch (e) {
    console.warn(e);
    authHint.textContent = "Could not load settings (check deployment/API).";
    compute();
  }
}

async function saveSettings() {
  const localValue = startDateInput.value;
  if (!localValue) return;

  // datetime-local is interpreted as local time on this device.
  const localDate = new Date(localValue);
  const iso = localDate.toISOString();

  saveStatus.textContent = "Saving...";
  try {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDateIso: iso, trayDays: TRAY_DAYS })
    });

    if (res.status === 401) {
      saveStatus.textContent = "Login first to save.";
      return;
    }
    if (!res.ok) throw new Error(`POST /api/settings failed: ${res.status}`);

    const saved = await res.json();
    startDateIso = saved.startDateIso;

    saveStatus.textContent = "Saved ✅";
  } catch (e) {
    console.error(e);
    saveStatus.textContent = "Save failed.";
  } finally {
    setTimeout(() => (saveStatus.textContent = ""), 2000);
    compute();
  }
}

// tick every second (in the browser)
setInterval(compute, 1000);

saveBtn.addEventListener("click", saveSettings);

// initial load
loadSettings();
