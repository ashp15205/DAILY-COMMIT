
const STORAGE_KEY = "dailycommit-data";

/* ================= DOM ================= */
const calendarEl = document.getElementById("calendar");
const input = document.getElementById("questionInput");
const btn = document.getElementById("checkInBtn");

const currentEl = document.getElementById("currentStreak");
const maxEl = document.getElementById("maxStreak");
const totalDaysEl = document.getElementById("totalDays");
const totalQuestionsEl = document.getElementById("totalQuestions");
const updatedEl = document.getElementById("lastUpdated");
const statusEl = document.getElementById("inputStatus");

const downloadBtn = document.getElementById("downloadBtn");
const card = document.querySelector(".card");
const actionSection = document.querySelector(".action");

const heatmapBtn = document.getElementById("heatmapView");
const chartBtn = document.getElementById("chartView");
const chartEl = document.getElementById("dailyChart");
let chart;

function renderChart(data) {
  const ctx = document.getElementById("dailyChart");
  if (!ctx) return;

  const entries = Object.entries(data)
    .filter(([_, v]) => v.questions > 0)
    .sort(([a], [b]) => new Date(a) - new Date(b));

  if (entries.length === 0) return;

  const labels = entries.map(([date]) =>
    new Date(date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric"
    })
  );

  const values = entries.map(([_, v]) => v.questions);

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: "#22c55e",
        backgroundColor: "rgba(34,197,94,0.18)",
        tension: 0.35,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 5
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 }
        }
      }
    }
  });
}

heatmapBtn.addEventListener("click", () => {
  heatmapBtn.classList.add("active");
  chartBtn.classList.remove("active");

  calendarEl.classList.remove("hidden");
  chartEl.classList.add("hidden");
});

chartBtn.addEventListener("click", () => {
  chartBtn.classList.add("active");
  heatmapBtn.classList.remove("active");

  calendarEl.classList.add("hidden");
  chartEl.classList.remove("hidden");

  renderChart(load()); // render ONLY when needed
});


downloadBtn.addEventListener("click", async () => {
  try {
    // 🔥 Hide elements you don't want in the image
    actionSection.style.display = "none";
    downloadBtn.style.display = "none";

    // Enable export-safe styles
    document.body.classList.add("export-mode");

    // Allow repaint
    await new Promise(r => setTimeout(r, 150));

    const canvas = await html2canvas(card, {
      backgroundColor: "#020617",
      scale: 2
    });

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/jpeg", 0.95);
    link.download = `dailycommit-${todayKey()}.jpg`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  } catch (err) {
    console.error("Download failed:", err);
    alert("Download failed. See console.");
  } finally {
    // 🔥 Restore UI
    document.body.classList.remove("export-mode");
    actionSection.style.display = "flex";
    downloadBtn.style.display = "flex";
  }
});




/* ================= DATE HELPERS (LOCAL TIME) ================= */
function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getYesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate();
}

/* ================= STORAGE ================= */
const load = () =>
  JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};

const save = (d) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(d));

/* ================= HEATMAP INTENSITY ================= */
function getLevel(q) {
  if (q >= 15) return "level-4";
  if (q >= 10) return "level-3";
  if (q >= 6) return "level-2";
  if (q >= 3) return "level-1";
  return "";
}

/* ================= STREAK LOGIC ================= */
function calculateStreaks(data) {
  const dates = Object.keys(data).sort();
  let max = 0;
  let cur = 0;
  let prev = null;

  for (const d of dates) {
    if (!data[d].questions) continue;

    if (prev && new Date(d) - new Date(prev) === 86400000) {
      cur++;
    } else {
      cur = 1;
    }

    max = Math.max(max, cur);
    prev = d;
  }

  // Current streak (from today backwards)
  let current = 0;
  let t = new Date();

  while (data[formatDate(t)]?.questions > 0) {
    current++;
    t.setDate(t.getDate() - 1);
  }

  return { current, max };
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* ================= STREAK BREAK ANIMATION ================= */
function checkStreakBreak(data) {
  const yesterday = getYesterdayKey();
  const today = todayKey();

  if (data[yesterday]?.questions > 0 && !data[today]) {
    currentEl.classList.add("streak-break");
    setTimeout(() => {
      currentEl.classList.remove("streak-break");
    }, 450);
  }
}

/* ================= CALENDAR ================= */
function renderCalendar(data) {
  calendarEl.innerHTML = "";

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  const monthWrapper = document.createElement("div");
  monthWrapper.className = "month";

  const grid = document.createElement("div");
  grid.className = "month-grid";

  const firstDay = new Date(y, m, 1).getDay();
  const totalDays = daysInMonth(y, m);

  // Empty leading cells
  for (let i = 0; i < firstDay; i++) {
    grid.appendChild(document.createElement("div"));
  }

  for (let d = 1; d <= totalDays; d++) {
    const cell = document.createElement("div");
    const dateKey = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const q = data[dateKey]?.questions || 0;

    cell.className = "day " + getLevel(q);
    cell.dataset.tooltip = `${dateKey}: ${q} questions`;

    grid.appendChild(cell);
  }

  const label = document.createElement("div");
  label.className = "month-label";
  label.textContent = now.toLocaleString("default", { month: "long" });

  monthWrapper.appendChild(grid);
  monthWrapper.appendChild(label);
  calendarEl.appendChild(monthWrapper);
}
function calculateWeeklyConsistency(data) {
  let count = 0;
  const d = new Date();

  for (let i = 0; i < 7; i++) {
    const key = formatDate(d);
    if (data[key]?.questions > 0) count++;
    d.setDate(d.getDate() - 1);
  }

  return count;
}


/* ================= RENDER ================= */
function render() {
  const data = load();

  renderCalendar(data);

  const streaks = calculateStreaks(data);
  currentEl.textContent = streaks.current;
  maxEl.textContent = streaks.max;
  const weeklyEl = document.getElementById("weeklyConsistency");
const weeklyCount = calculateWeeklyConsistency(data);
weeklyEl.textContent = `Weekly progress: ${weeklyCount} / 7 ${weeklyCount === 1 ? 'day' : 'days'}`;

  let totalDays = 0;
  let totalQ = 0;

  for (const d in data) {
    if (data[d].questions) {
      totalDays++;
      totalQ += data[d].questions;
    }
  }

  totalDaysEl.textContent = totalDays;
  totalQuestionsEl.textContent = totalQ;

  updatedEl.textContent = `Last updated: ${todayKey()}`;

  const doneToday = !!data[todayKey()];
  if (doneToday) {
    statusEl.textContent = "Input submitted already";
  } else {
    statusEl.textContent = "";
  }

  input.disabled = doneToday;
  btn.disabled = doneToday || Number(input.value) <= 0;

  checkStreakBreak(data);
}

/* ================= EVENTS ================= */
input.addEventListener("input", () => {
  btn.disabled = !!load()[todayKey()] || Number(input.value) <= 0;
});

btn.addEventListener("click", () => {
  const q = Number(input.value);
  if (q <= 0) return;

  const data = load();
  data[todayKey()] = { questions: q };
  save(data);

  input.value = "";
  render();
});

/* Keyboard shortcuts */
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !btn.disabled) btn.click();
  if (e.key === "Escape") input.value = "";
});

/* ================= MIDNIGHT AUTO-RESET ================= */
function scheduleMidnightRefresh() {
  const now = new Date();
  const nextDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0, 0, 1
  );

  setTimeout(() => {
    render();
    scheduleMidnightRefresh();
  }, nextDay - now);
}

/* ================= INIT ================= */
scheduleMidnightRefresh();
render();
/* ================= THEME TOGGLE ================= */
