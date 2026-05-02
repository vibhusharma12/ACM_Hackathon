import { useCallback, useEffect, useMemo, useState } from "react";
import { daysUntil, parseLocalDate } from "./utils/dates";

/* ─── Constants ─────────────────────────────────────────────────────── */
const EMPTY_SUGGESTION = {
  difficulty: "Medium",
  focusMinutes: 25,
  sessions: 2,
  breakMinutes: 15,
  reason: "Plan generated from your task details.",
};

const FOCUS_QUOTES = [
  "Small wins compound into serious momentum.",
  "The best work is built one focused block at a time.",
  "Progress gets easier when you protect your attention.",
  "You showed up, stayed with it, and moved the task forward.",
];

const DIFFICULTY_WEIGHT = { Easy: 1, Medium: 2, Hard: 3 };
const RING_R = 88;
const RING_C = 2 * Math.PI * RING_R;

/* ─── Priority algorithm ─────────────────────────────────────────────── */
function getPriorityScore(difficulty, deadline) {
  const days = daysUntil(deadline);
  const urgency = 1 / Math.max(days, 0.1);
  return urgency * (DIFFICULTY_WEIGHT[difficulty] ?? 2);
}

function getPriorityLabel(score) {
  if (score >= 3) return { label: "Critical", cls: "priority-critical" };
  if (score >= 0.8) return { label: "High", cls: "priority-high" };
  if (score >= 0.25) return { label: "Medium", cls: "priority-medium" };
  return { label: "Low", cls: "priority-low" };
}

/* ─── Helpers ────────────────────────────────────────────────────────── */
function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function getDeadlineDateTime(deadline, deadlineTime) {
  const date = parseLocalDate(deadline);
  const [hours, minutes] = deadlineTime.split(":").map(Number);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function getTaskSuggestion(name, description, difficulty, deadline) {
  const text = `${name} ${description}`.toLowerCase();
  const hardWords = ["build", "project", "exam", "research", "design", "code"];
  const needsExtraSession = hardWords.some((word) => text.includes(word));
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const daysLeft = daysUntil(deadline);
  const urgencyBoost = daysLeft <= 1 ? 1 : daysLeft <= 3 ? 0 : -1;
  const complexityBoost = needsExtraSession || wordCount > 16 ? 1 : 0;

  if (difficulty === "Hard") {
    return { difficulty, focusMinutes: 50, sessions: Math.max(2, Math.min(5, 3 + urgencyBoost + complexityBoost)), breakMinutes: 15 };
  }
  if (difficulty === "Easy") {
    return { difficulty, focusMinutes: 25, sessions: Math.max(1, Math.min(3, 1 + urgencyBoost + complexityBoost)), breakMinutes: 10 };
  }
  return { difficulty, focusMinutes: 35, sessions: Math.max(1, Math.min(4, 2 + urgencyBoost + complexityBoost)), breakMinutes: 15 };
}

function getTodayInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function playCompletionChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    const gain = context.createGain();
    gain.connect(context.destination);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.7);
    [660, 880].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, context.currentTime + index * 0.16);
      oscillator.connect(gain);
      oscillator.start(context.currentTime + index * 0.16);
      oscillator.stop(context.currentTime + index * 0.16 + 0.22);
    });
    window.setTimeout(() => context.close(), 900);
  } catch {
    // Some browsers block audio; the visual notification still handles feedback.
  }
}

const EMPTY_FORM = { name: "", description: "", difficulty: "Medium", deadline: "", deadlineTime: "" };

/* ─── Session timeline ────────────────────────────────────────────────── */
function SessionTimeline({ focusMinutes, breakMinutes, sessions }) {
  const n = Math.max(1, Math.min(8, sessions));
  const f = Math.max(1, focusMinutes);
  const b = Math.max(1, breakMinutes);
  // Total time for proportional widths
  const total = n * f + (n - 1) * b;
  // Build block list: [focus, break, focus, break, ...focus]
  const blocks = [];
  for (let i = 0; i < n; i++) {
    blocks.push({ type: "focus", mins: f, pct: (f / total) * 100 });
    if (i < n - 1) blocks.push({ type: "break", mins: b, pct: (b / total) * 100 });
  }
  return (
    <div className="session-timeline">
      <p className="session-timeline-label">
        Session plan
        <span className="chart-sub">{n} × {f}min focus{n > 1 ? ` + ${n - 1} × ${b}min break` : ""} = {total}min total</span>
      </p>
      <div className="timeline-track">
        {blocks.map((block, i) => (
          <div
            key={i}
            className={`timeline-block ${block.type}`}
            style={{ flexBasis: `${block.pct}%` }}
            title={`${block.type === "focus" ? "Focus" : "Break"}: ${block.mins}min`}
          >
            {block.pct > 8 && (
              <span className="timeline-block-label">{block.mins}m</span>
            )}
          </div>
        ))}
      </div>
      <div className="timeline-legend">
        <span className="tl-focus">■ Focus</span>
        <span className="tl-break">■ Break</span>
      </div>
    </div>
  );
}

/* ─── Chart components ──────────────────────────────────────────────── */
function ProductivityChart({ completedTasks }) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toDateString());
  }
  const data = days.map((day) =>
    Number(
      completedTasks
        .filter((t) => new Date(t.completedAt).toDateString() === day)
        .reduce((s, t) => s + t.focusMinutes * t.sessions, 0)
        .toFixed(1)
    )
  );
  const maxVal = Math.max(...data, 1);
  const W = 340, H = 150, PAD = 24;
  const plotW = W - PAD * 2;
  const plotH = H - PAD * 2;
  const pts = data.map((v, i) => ({
    x: PAD + (i / (data.length - 1)) * plotW,
    y: PAD + plotH - (v / maxVal) * plotH,
  }));
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${(PAD + plotH).toFixed(1)} L${pts[0].x.toFixed(1)},${(PAD + plotH).toFixed(1)} Z`;
  const dayLabels = days.map((d) => new Date(d).toLocaleDateString("en", { weekday: "short" }));
  return (
    <div className="chart-card">
      <p className="chart-title">📈 Productivity Trend <span className="chart-sub">Last 7 days · focus minutes</span></p>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" aria-label="Productivity trend chart">
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b7cf6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#8b7cf6" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((t) => (
          <line key={t} x1={PAD} y1={PAD + plotH * (1 - t)} x2={W - PAD} y2={PAD + plotH * (1 - t)}
            stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        ))}
        <path d={areaPath} fill="url(#trendGrad)" />
        <path d={linePath} fill="none" stroke="#8b7cf6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="#8b7cf6" stroke="#10172a" strokeWidth="2" />
        ))}
        {pts.map((p, i) => data[i] > 0 && (
          <text key={`v${i}`} x={p.x} y={p.y - 9} textAnchor="middle" fontSize="9" fill="#a78bfa" fontWeight="700">{data[i]}m</text>
        ))}
        {pts.map((p, i) => (
          <text key={`d${i}`} x={p.x} y={H - 5} textAnchor="middle" fontSize="9" fill="#8a97b0">{dayLabels[i]}</text>
        ))}
      </svg>
    </div>
  );
}

function DifficultyDonut({ completedTasks }) {
  const counts = { Easy: 0, Medium: 0, Hard: 0 };
  completedTasks.forEach((t) => { if (counts[t.difficulty] !== undefined) counts[t.difficulty]++; });
  const total = completedTasks.length;
  const colors = { Easy: "#22c55e", Medium: "#60a5fa", Hard: "#e05a20" };
  const cx = 70, cy = 70, R = 52, ri = 34;
  function arc(startAngle, angle) {
    if (angle >= 2 * Math.PI) angle = 2 * Math.PI - 0.001;
    const x1 = cx + R * Math.cos(startAngle), y1 = cy + R * Math.sin(startAngle);
    const x2 = cx + R * Math.cos(startAngle + angle), y2 = cy + R * Math.sin(startAngle + angle);
    const xi1 = cx + ri * Math.cos(startAngle + angle), yi1 = cy + ri * Math.sin(startAngle + angle);
    const xi2 = cx + ri * Math.cos(startAngle), yi2 = cy + ri * Math.sin(startAngle);
    const large = angle > Math.PI ? 1 : 0;
    return `M${x1},${y1} A${R},${R} 0 ${large} 1 ${x2},${y2} L${xi1},${yi1} A${ri},${ri} 0 ${large} 0 ${xi2},${yi2} Z`;
  }
  let cursor = -Math.PI / 2;
  const slices = Object.entries(counts).map(([diff, count]) => {
    const angle = total > 0 ? (count / total) * 2 * Math.PI : 0;
    const s = { diff, count, cursor, angle, color: colors[diff] };
    cursor += angle;
    return s;
  });
  return (
    <div className="chart-card">
      <p className="chart-title">🎯 Difficulty Split <span className="chart-sub">By completed tasks</span></p>
      <div className="donut-layout">
        <svg viewBox="0 0 140 140" className="donut-svg" aria-label="Difficulty distribution donut chart">
          {total === 0 ? (
            <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="18" />
          ) : (
            slices.map((s) => s.angle > 0 && (
              <path key={s.diff} d={arc(s.cursor, s.angle)} fill={s.color} opacity="0.88" />
            ))
          )}
          <text x={cx} y={cy - 5} textAnchor="middle" fontSize="18" fontWeight="900" fill="#eef4ff">{total}</text>
          <text x={cx} y={cy + 11} textAnchor="middle" fontSize="9" fill="#8a97b0">tasks</text>
        </svg>
        <div className="donut-legend">
          {Object.entries(counts).map(([diff, count]) => (
            <div key={diff} className="legend-item">
              <span className="legend-dot" style={{ background: colors[diff] }} />
              <span className="legend-label">{diff}</span>
              <span className="legend-count">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FocusBreakRatio({ completedTasks }) {
  const totalFocus = completedTasks.reduce((s, t) => s + t.focusMinutes * t.sessions, 0);
  const totalBreak = completedTasks.reduce((s, t) => s + t.breakMinutes * Math.max(t.sessions - 1, 0), 0);
  const grand = totalFocus + totalBreak || 1;
  const focusPct = Math.round((totalFocus / grand) * 100);
  const breakPct = 100 - focusPct;
  return (
    <div className="chart-card">
      <p className="chart-title">⏱ Focus vs Break <span className="chart-sub">Total time distribution</span></p>
      <div className="ratio-bars">
        <div className="ratio-row">
          <span className="ratio-label">Focus</span>
          <div className="ratio-track">
            <div className="ratio-fill ratio-focus" style={{ width: `${focusPct}%` }} />
          </div>
          <span className="ratio-value">{Number(totalFocus.toFixed(1))}m</span>
        </div>
        <div className="ratio-row">
          <span className="ratio-label">Break</span>
          <div className="ratio-track">
            <div className="ratio-fill ratio-break" style={{ width: `${Math.max(breakPct, totalBreak > 0 ? 3 : 0)}%` }} />
          </div>
          <span className="ratio-value">{Number(totalBreak.toFixed(1))}m</span>
        </div>
      </div>
      <div className="ratio-summary">
        <span style={{ color: "#8b7cf6" }}>{focusPct}% focus</span>
        <span style={{ color: "#8a97b0" }}>·</span>
        <span style={{ color: "#2dd4bf" }}>{breakPct}% break</span>
      </div>
    </div>
  );
}

/* ─── App ────────────────────────────────────────────────────────────── */
function App() {
  const [taskForm, setTaskForm] = useState(EMPTY_FORM);
  const [taskQueue, setTaskQueue] = useState([]);
  const [planningTask, setPlanningTask] = useState(null);
  const [suggestion, setSuggestion] = useState(EMPTY_SUGGESTION);
  const [hasSuggestion, setHasSuggestion] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [totalTimerSeconds, setTotalTimerSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState("focus");
  const [remainingSessions, setRemainingSessions] = useState(0);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [workflowStep, setWorkflowStep] = useState(1);
  const [sessionNotice, setSessionNotice] = useState(null);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const todayInputValue = getTodayInputValue();

  const prioritizedQueue = useMemo(
    () =>
      [...taskQueue].sort(
        (a, b) =>
          getPriorityScore(b.difficulty, b.deadline) -
          getPriorityScore(a.difficulty, a.deadline)
      ),
    [taskQueue]
  );

  const totalFocusMinutes = useMemo(
    () => completedTasks.reduce((sum, t) => sum + t.focusMinutes * t.sessions, 0),
    [completedTasks]
  );

  /* Timer ring */
  const timerProgress = totalTimerSeconds > 0 ? timerSeconds / totalTimerSeconds : 0;
  const ringOffset = RING_C * (1 - timerProgress);

  const updateForm = (key, value) => setTaskForm((f) => ({ ...f, [key]: value }));

  function handleAddToQueue() {
    const name = taskForm.name.trim();
    if (!name) { setStatusMessage("Enter a task name first."); return; }
    if (!taskForm.deadline) { setStatusMessage("Add a deadline date."); return; }
    if (daysUntil(taskForm.deadline) < 0) { setStatusMessage("Deadline cannot be before today."); return; }
    if (!taskForm.deadlineTime) { setStatusMessage("Add a deadline time."); return; }
    if (getDeadlineDateTime(taskForm.deadline, taskForm.deadlineTime) < new Date()) {
      setStatusMessage("Deadline time cannot be in the past."); return;
    }
    setTaskQueue((q) => [...q, { id: crypto.randomUUID(), ...taskForm, name }]);
    setTaskForm(EMPTY_FORM);
    setStatusMessage("");
  }

  function handleRemoveFromQueue(id) {
    setTaskQueue((q) => q.filter((t) => t.id !== id));
  }

  async function handlePlanTask(task) {
    setPlanningTask(task);
    setIsSuggesting(true);
    setStatusMessage("Generating AI plan...");
    setWorkflowStep(2);

    const localSuggestion = getTaskSuggestion(task.name, task.description, task.difficulty, task.deadline);

    try {
      const response = await fetch("/api/suggest-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskName: task.name,
          taskDescription: task.description,
          taskDifficulty: task.difficulty,
          taskDeadline: task.deadline,
          taskDeadlineTime: task.deadlineTime,
        }),
      });
      if (!response.ok) throw new Error("AI server unavailable.");
      const aiSuggestion = await response.json();
      setSuggestion({ ...localSuggestion, ...aiSuggestion, difficulty: task.difficulty });
      setStatusMessage("AI suggestion ready. Adjust before starting.");
    } catch {
      setSuggestion(localSuggestion);
      setStatusMessage("Using local planner. Start the API server for AI suggestions.");
    } finally {
      setIsSuggesting(false);
    }
    setHasSuggestion(true);
  }

  const completeTimerSegment = useCallback(() => {
    if (!activeTask) return;
    setIsRunning(false);

    if (mode === "focus") {
      const nextSessions = remainingSessions - 1;
      const quote = FOCUS_QUOTES[(completedTasks.length + remainingSessions) % FOCUS_QUOTES.length];
      playCompletionChime();

      if (nextSessions <= 0) {
        setSessionNotice({ title: "Task complete!", message: `Great work. You completed ${activeTask.name}.`, quote });
        setCompletedTasks((tasks) => [{ ...activeTask, completedAt: new Date().toISOString() }, ...tasks]);
        setStatusMessage("Task complete. Dashboard updated.");
        setActiveTask(null);
        setRemainingSessions(0);
        setMode("focus");
        setWorkflowStep(prioritizedQueue.length > 0 ? 1 : 6);
        return;
      }

      setSessionNotice({
        title: "Session complete!",
        message: `Great work on ${activeTask.name}. Break has started automatically.`,
        quote,
      });
      setStatusMessage("Focus session complete. Break timer started.");
      setRemainingSessions(nextSessions);
      setMode("break");
      const breakSecs = activeTask.breakMinutes * 60;
      setTimerSeconds(breakSecs);
      setTotalTimerSeconds(breakSecs);
      setIsRunning(true);
      setWorkflowStep(5);
      return;
    }

    setStatusMessage("Break complete. Next focus session ready.");
    setMode("focus");
    const focusSecs = activeTask.focusMinutes * 60;
    setTimerSeconds(focusSecs);
    setTotalTimerSeconds(focusSecs);
    setWorkflowStep(4);
  }, [activeTask, completedTasks.length, mode, remainingSessions, prioritizedQueue.length]);

  useEffect(() => {
    let interval = null;

    if (isRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (isRunning && timerSeconds === 0) {
      // Trigger completion cleanly on the next tick without state updater side effects
      window.setTimeout(completeTimerSegment, 0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timerSeconds, completeTimerSegment]);

  function handleStart() {
    if (!planningTask) return;
    const task = { ...planningTask, ...suggestion };
    setActiveTask(task);
    setTaskQueue((q) => q.filter((t) => t.id !== planningTask.id));
    setPlanningTask(null);
    setRemainingSessions(task.sessions);
    setMode("focus");
    const focusSecs = task.focusMinutes * 60;
    setTimerSeconds(focusSecs);
    setTotalTimerSeconds(focusSecs);
    setIsRunning(false);
    setStatusMessage("Focus timer ready.");
    setWorkflowStep(4);
    setHasSuggestion(false);
    setSuggestion(EMPTY_SUGGESTION);
  }

  function handleStopTask() {
    setActiveTask(null);
    setIsRunning(false);
    setTimerSeconds(0);
    setTotalTimerSeconds(0);
    setMode("focus");
    setRemainingSessions(0);
    setStatusMessage("Timer stopped.");
    setWorkflowStep(1);
  }

  function updateSuggestion(key, value) {
    setSuggestion((current) => ({ ...current, [key]: key === "difficulty" ? value : Number(value) }));
  }

  function handleNewTask() {
    setActiveTask(null);
    setIsRunning(false);
    setTimerSeconds(0);
    setTotalTimerSeconds(0);
    setMode("focus");
    setRemainingSessions(0);
    setStatusMessage("");
    setWorkflowStep(1);
  }

  function handleViewDashboard() { setWorkflowStep(6); }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">FocusFlow</p>
          <h1>Plan the task, tune the session, start the timer.</h1>
          <div className="hero-actions">
            <button onClick={handleViewDashboard}>View Dashboard</button>
            {activeTask && (
              <button className="primary-action" onClick={() => setWorkflowStep(4)}>
                Back To Timer
              </button>
            )}
          </div>
        </div>
        <div className="hero-stats" aria-label="Session summary">
          <span>{completedTasks.length}</span>
          <p>tasks done</p>
          <span>{Number(totalFocusMinutes.toFixed(1))}</span>
          <p>focus minutes</p>
          <span>{taskQueue.length}</span>
          <p>queued</p>
        </div>
      </section>

      <section className="stage-shell">

        {workflowStep === 1 && (
          <div className="panel task-panel stage-panel">
            <div className="panel-heading">
              <div>
                <h2>Task Queue</h2>
                <p>Add all your tasks — FocusFlow will rank them by priority.</p>
              </div>
            </div>

            <div className="add-task-form">
              <label>
                Task name
                <input
                  type="text"
                  value={taskForm.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddToQueue()}
                  placeholder="Prepare database notes"
                />
              </label>

              <label>
                Description
                <textarea
                  value={taskForm.description}
                  onChange={(e) => updateForm("description", e.target.value)}
                  placeholder="Add context, goals, or scope"
                  rows="2"
                />
              </label>

              <div className="control-grid">
                <label>
                  Difficulty
                  <select value={taskForm.difficulty} onChange={(e) => updateForm("difficulty", e.target.value)}>
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                  </select>
                </label>
                <label>
                  Deadline
                  <input type="date" min={todayInputValue} value={taskForm.deadline} onChange={(e) => updateForm("deadline", e.target.value)} />
                </label>
                <label>
                  Deadline time
                  <input type="time" value={taskForm.deadlineTime} onChange={(e) => updateForm("deadlineTime", e.target.value)} />
                </label>
              </div>

              {statusMessage && <p className="status-line">{statusMessage}</p>}

              <button className="primary-action" onClick={handleAddToQueue}>
                + Add to Queue
              </button>
            </div>

            {prioritizedQueue.length > 0 && (
              <div className="queue-section">
                <p className="queue-label">Priority Queue — {prioritizedQueue.length} task{prioritizedQueue.length !== 1 ? "s" : ""}</p>
                <div className="queue-list">
                  {prioritizedQueue.map((task, index) => {
                    const score = getPriorityScore(task.difficulty, task.deadline);
                    const { label, cls } = getPriorityLabel(score);
                    const days = Math.round(daysUntil(task.deadline));
                    return (
                      <div key={task.id} className="queue-item">
                        <div className="queue-rank">#{index + 1}</div>
                        <div className="queue-info">
                          <div className="queue-top">
                            <strong>{task.name}</strong>
                            <span className={`priority-badge ${cls}`}>{label}</span>
                          </div>
                          <div className="queue-meta">
                            <span>{task.difficulty}</span>
                            <span>·</span>
                            <span>{days === 0 ? "Due today" : days === 1 ? "Due tomorrow" : `${days}d left`}</span>
                            {task.description && <><span>·</span><span className="queue-desc">{task.description}</span></>}
                          </div>
                        </div>
                        <div className="queue-actions">
                          <button className="primary-action plan-btn" onClick={() => handlePlanTask(task)} disabled={isSuggesting}>
                            Plan
                          </button>
                          <button className="remove-btn" onClick={() => handleRemoveFromQueue(task.id)} title="Remove task">✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {workflowStep === 2 && planningTask && (
          <div className="panel suggestion-panel stage-panel">
            <div className="panel-heading">
              <div>
                <h2>AI Suggests</h2>
                <p>Structured plan generated for <strong>{planningTask.name}</strong>.</p>
              </div>
            </div>

            {isSuggesting ? (
              <div className="generating-state">
                <div className="spinner" />
                <p>Generating your focus plan…</p>
              </div>
            ) : (
              <>
                <div className="plan-card">
                  <div>
                    <span>Plan</span>
                    <strong>
                      {suggestion.sessions} focus session{suggestion.sessions === 1 ? "" : "s"} for a{" "}
                      {suggestion.difficulty.toLowerCase()} task
                    </strong>
                  </div>
                  <ul>
                    <li>Total workload: {suggestion.sessions} sessions</li>
                    <li>Focus rhythm: {suggestion.focusMinutes} min work + {suggestion.breakMinutes} min break</li>
                    <li>
                      Recommendation:{" "}
                      {suggestion.difficulty === "Hard"
                        ? "start this while your energy is highest"
                        : suggestion.difficulty === "Easy"
                        ? "complete this quickly before deeper work"
                        : "keep it steady and avoid switching tasks"}
                    </li>
                    <li>
                      Deadline pressure:{" "}
                      {daysUntil(planningTask.deadline) <= 1 ? "urgent" : daysUntil(planningTask.deadline) <= 3 ? "soon" : "flexible"}
                    </li>
                    <li>Reason: {suggestion.reason}</li>
                  </ul>
                </div>

                <div className="suggestion-grid">
                  <div><span>Difficulty</span><strong>{suggestion.difficulty}</strong></div>
                  <div><span>Focus</span><strong>{suggestion.focusMinutes} min</strong></div>
                  <div><span>Sessions</span><strong>{suggestion.sessions}</strong></div>
                  <div><span>Deadline</span><strong>{planningTask.deadline} at {planningTask.deadlineTime}</strong></div>
                  <div><span>Break</span><strong>{suggestion.breakMinutes} min</strong></div>
                </div>

                {statusMessage && <p className="status-line">{statusMessage}</p>}

                <div className="stage-actions">
                  <button onClick={() => setWorkflowStep(1)}>Back to Queue</button>
                  <button className="primary-action" onClick={() => setWorkflowStep(3)}>Adjust Plan</button>
                </div>
              </>
            )}
          </div>
        )}

        {workflowStep === 3 && (
          <div className="panel adjust-panel stage-panel">
            <div className="panel-heading">
              <div>
                <h2>Adjust Plan</h2>
                <p>Change the plan before starting.</p>
              </div>
            </div>

            <div className="control-grid">
              <label>
                Difficulty
                <select value={suggestion.difficulty} onChange={(e) => updateSuggestion("difficulty", e.target.value)}>
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                </select>
              </label>
              <label>
                Focus minutes
                <input type="number" min="5" max="90" value={suggestion.focusMinutes} onChange={(e) => updateSuggestion("focusMinutes", e.target.value)} />
              </label>
              <label>
                Sessions
                <input type="number" min="1" max="8" value={suggestion.sessions} onChange={(e) => updateSuggestion("sessions", e.target.value)} />
              </label>
              <label>
                Break minutes
                <input type="number" min="1" max="45" value={suggestion.breakMinutes} onChange={(e) => updateSuggestion("breakMinutes", e.target.value)} />
              </label>
            </div>

            <SessionTimeline
              focusMinutes={suggestion.focusMinutes}
              breakMinutes={suggestion.breakMinutes}
              sessions={suggestion.sessions}
            />

            <div className="stage-actions">
              <button onClick={() => setWorkflowStep(2)}>Back</button>
              <button className="primary-action" onClick={handleStart} disabled={!hasSuggestion}>
                Confirm &amp; Start
              </button>
            </div>
          </div>
        )}

        {(workflowStep === 4 || workflowStep === 5) && (
          <div className="panel timer-panel stage-panel">
            <div className="panel-heading">
              <div>
                <h2>{mode === "break" ? "Break Timer" : "Focus Timer"}</h2>
                <p>{activeTask ? activeTask.name : "Start a task to activate the countdown."}</p>
              </div>
              {taskQueue.length > 0 && (
                <div className="queue-count-badge">{taskQueue.length} task{taskQueue.length !== 1 ? "s" : ""} queued</div>
              )}
            </div>

            <div className={`timer-display ${mode}`}>
              <div className="timer-ring-container">
                <svg className="timer-ring" viewBox="0 0 220 220">
                  <circle className="ring-track" cx="110" cy="110" r={RING_R} />
                  <circle
                    className={`ring-progress${isRunning ? " running" : ""}`}
                    cx="110"
                    cy="110"
                    r={RING_R}
                    strokeDasharray={RING_C}
                    strokeDashoffset={ringOffset}
                  />
                </svg>
                <div className="timer-text">
                  <span className={isRunning ? "running" : ""}>{formatTime(timerSeconds)}</span>
                  <p>
                    {activeTask
                      ? `${remainingSessions} session${remainingSessions === 1 ? "" : "s"} left`
                      : "No active task"}
                  </p>
                </div>
              </div>
            </div>

            <div className="timer-actions">
              <button className="primary-action" onClick={() => setIsRunning(true)} disabled={!activeTask || isRunning || timerSeconds === 0}>
                Start
              </button>
              <button onClick={() => setIsRunning(false)} disabled={!isRunning}>Pause</button>
              <button onClick={handleStopTask} disabled={!activeTask}>Stop</button>
            </div>

            {statusMessage && <p className="status-line">{statusMessage}</p>}
          </div>
        )}

        {workflowStep === 6 && (
          <div className="panel dashboard-panel stage-panel">
            <div className="panel-heading">
              <div>
                <h2>Dashboard</h2>
                <p>Summary and a simple focus tip.</p>
              </div>
            </div>

            <div className="dashboard-metrics">
              <div><span>{completedTasks.length}</span><p>tasks done</p></div>
              <div><span>{Number(totalFocusMinutes.toFixed(1))}</span><p>focus minutes</p></div>
              <div>
                <span>{completedTasks.length ? (totalFocusMinutes / completedTasks.length).toFixed(1) : 0}</span>
                <p>avg minutes</p>
              </div>
            </div>

            {/* ─ Analytics Charts ─ */}
            <div className="charts-grid">
              <ProductivityChart completedTasks={completedTasks} />
              <DifficultyDonut completedTasks={completedTasks} />
              <FocusBreakRatio completedTasks={completedTasks} />
            </div>

            <div className="tip-box">
              Start hard tasks while your energy is highest, then use breaks to reset before the next session.
            </div>

            {prioritizedQueue.length > 0 && (
              <div className="dashboard-queue">
                <p className="queue-label">Up Next — {prioritizedQueue.length} task{prioritizedQueue.length !== 1 ? "s" : ""} remaining</p>
                <div className="queue-list compact">
                  {prioritizedQueue.slice(0, 5).map((task, index) => {
                    const score = getPriorityScore(task.difficulty, task.deadline);
                    const { label, cls } = getPriorityLabel(score);
                    return (
                      <div key={task.id} className="queue-item">
                        <div className="queue-rank">#{index + 1}</div>
                        <div className="queue-info">
                          <div className="queue-top">
                            <strong>{task.name}</strong>
                            <span className={`priority-badge ${cls}`}>{label}</span>
                          </div>
                          <div className="queue-meta">
                            <span>{task.difficulty}</span>
                            <span>·</span>
                            <span>{Math.round(daysUntil(task.deadline))}d left</span>
                          </div>
                        </div>
                        <button className="primary-action plan-btn" onClick={() => { setWorkflowStep(1); handlePlanTask(task); }}>
                          Plan
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="task-history">
              {completedTasks.length === 0 && (
                <p className="task-history-empty">No completed tasks yet — finish your first session!</p>
              )}
              {completedTasks.slice(0, 3).map((task) => (
                <article key={task.id}>
                  <strong>{task.name}</strong>
                  <span>{task.sessions} × {task.focusMinutes} min</span>
                </article>
              ))}
            </div>

            <div className="stage-actions">
              {activeTask && (
                <button onClick={() => setWorkflowStep(mode === "break" ? 5 : 4)}>Back To Timer</button>
              )}
              <button className="primary-action" onClick={handleNewTask}>Plan Next Task</button>
            </div>
          </div>
        )}
      </section>

      {sessionNotice && (
        <div className="notice-backdrop" role="dialog" aria-modal="true">
          <div className="notice-card">
            <p className="eyebrow">Congratulations</p>
            <h2>{sessionNotice.title}</h2>
            <p>{sessionNotice.message}</p>
            <blockquote>{sessionNotice.quote}</blockquote>
            {prioritizedQueue.length > 0 && (
              <p className="next-task-hint">
                Next up: <strong>{prioritizedQueue[0].name}</strong>
              </p>
            )}
            <button className="primary-action" onClick={() => setSessionNotice(null)}>
              {mode === "break" ? "Continue Break" : "Back to Queue"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
