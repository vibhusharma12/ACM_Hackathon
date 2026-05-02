import { useCallback, useEffect, useMemo, useState } from "react";
import { daysUntil, parseLocalDate } from "./utils/dates";

/* ─── Constants ─────────────────────────────────────────────────────── */
const EMPTY_SUGGESTION = {
  difficulty: "Medium",
  focusMinutes: 25,
  sessions: 2,
<<<<<<< HEAD
  breakMinutes: 15,
  reason: "Plan generated from your task details.",
=======
  breakMinutes: 5,
>>>>>>> 8398810 (my local changes)
};

const FOCUS_QUOTES = [
  "Small wins compound into serious momentum.",
  "The best work is built one focused block at a time.",
  "Progress gets easier when you protect your attention.",
  "You showed up, stayed with it, and moved the task forward.",
];

const DIFFICULTY_WEIGHT = { Easy: 1, Medium: 2, Hard: 3 };

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

const STEPS = ["Task", "Plan", "Adjust", "Timer", "Done"];
const STEP_MAP = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 3, 6: 4 };

const RING_R = 88;
const RING_C = 2 * Math.PI * RING_R; // circumference

/* ─── Helpers ───────────────────────────────────────────────────────── */
function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

<<<<<<< HEAD
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
=======
function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getTaskSuggestion(name, description) {
  const text = `${name} ${description}`.toLowerCase();
  const hardWords = ["build", "project", "exam", "research", "design", "code"];
  const easyWords = ["read", "reply", "email", "review", "clean", "call"];
  const isHard = hardWords.some((w) => text.includes(w));
  const isEasy = easyWords.some((w) => text.includes(w));
>>>>>>> 8398810 (my local changes)
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const daysLeft = daysUntil(deadline);
  const urgencyBoost = daysLeft <= 1 ? 1 : daysLeft <= 3 ? 0 : -1;
  const complexityBoost = needsExtraSession || wordCount > 16 ? 1 : 0;

<<<<<<< HEAD
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
=======
  if (isHard || wordCount > 16) {
    return { difficulty: "Hard", focusMinutes: 50, sessions: 3, breakMinutes: 5 };
  }
  if (isEasy || wordCount < 7) {
    return { difficulty: "Easy", focusMinutes: 25, sessions: 1, breakMinutes: 5 };
  }
  return EMPTY_SUGGESTION;
>>>>>>> 8398810 (my local changes)
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
      oscillator.frequency.setValueAtTime(
        frequency,
        context.currentTime + index * 0.16
      );
      oscillator.connect(gain);
      oscillator.start(context.currentTime + index * 0.16);
      oscillator.stop(context.currentTime + index * 0.16 + 0.22);
    });

    window.setTimeout(() => context.close(), 900);
  } catch {
    // Some browsers block audio; the visual notification still handles feedback.
  }
}

function App() {
  const [taskForm, setTaskForm] = useState(EMPTY_FORM);
  const [taskQueue, setTaskQueue] = useState([]);
  const [planningTask, setPlanningTask] = useState(null); // task being planned from queue
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
<<<<<<< HEAD
  const [isSuggesting, setIsSuggesting] = useState(false);

  const todayInputValue = getTodayInputValue();
=======
  // tracks whether the current break is a post-task break (go to dashboard when done)
  const [isPostTaskBreak, setIsPostTaskBreak] = useState(false);
>>>>>>> 8398810 (my local changes)

  const totalFocusMinutes = useMemo(
    () =>
      completedTasks.reduce(
        (sum, task) => sum + task.focusMinutes * task.sessions,
        0
      ),
    [completedTasks]
  );

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

    setTaskQueue((q) => [
      ...q,
      { id: crypto.randomUUID(), ...taskForm, name },
    ]);
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

  /* Timer ring progress (1.0 → 0.0 as timer counts down) */
  const timerProgress = totalTimerSeconds > 0 ? timerSeconds / totalTimerSeconds : 0;
  const ringOffset = RING_C * (1 - timerProgress);

  /* ── completeTimerSegment ─────────────────────────────────────────── */
  const completeTimerSegment = useCallback(() => {
    if (!activeTask) return;
    setIsRunning(false);

    if (mode === "focus") {
      const nextSessions = remainingSessions - 1;
      const quote =
        FOCUS_QUOTES[(completedTasks.length + remainingSessions) % FOCUS_QUOTES.length];

      playCompletionChime();

      if (nextSessions <= 0) {
        setSessionNotice({
          title: "Task complete!",
          message: `Great work. You completed ${activeTask.name}.`,
          quote,
        });
        setCompletedTasks((tasks) => [
          {
            ...activeTask,
            completedAt: new Date().toISOString(),
          },
          ...tasks,
        ]);
        setStatusMessage("Task complete. Dashboard updated.");
        setActiveTask(null);
        setRemainingSessions(0);
        setMode("focus");
        setWorkflowStep(6);
        return;
      }

      setSessionNotice({
        title: "Session complete!",
        message: `Great work on ${activeTask.name}. Your break has started automatically.`,
        quote,
      });
      setStatusMessage("Focus session complete. Break timer started.");
      setRemainingSessions(nextSessions);
      setMode("break");
      const interBreakSecs = activeTask.breakMinutes * 60;
      setTimerSeconds(interBreakSecs);
      setTotalTimerSeconds(interBreakSecs);
      setIsRunning(true);
      setWorkflowStep(5);
      return;
    }

    setStatusMessage("Break complete. Next focus session is ready.");
    setMode("focus");
    setTimerSeconds(activeTask.focusMinutes * 60);
    setWorkflowStep(4);
  }, [activeTask, completedTasks.length, mode, remainingSessions]);

  useEffect(() => {
    if (!isRunning || timerSeconds <= 0) return;

    const interval = setInterval(() => {
      setTimerSeconds((seconds) => {
        if (seconds <= 1) {
          window.setTimeout(completeTimerSegment, 0);
          return 0;
        }

        return seconds - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [completeTimerSegment, isRunning, timerSeconds]);

  async function handleSuggest() {
    const trimmedName = taskName.trim();
    if (!trimmedName) {
      setStatusMessage("Enter a task name first.");
      return;
    }

    if (!taskDeadline) {
      setStatusMessage("Add a deadline date so FocusFlow can plan the sessions.");
      return;
    }

    if (daysUntil(taskDeadline) < 0) {
      setStatusMessage("Deadline date cannot be before today.");
      return;
    }

    if (!taskDeadlineTime) {
      setStatusMessage("Add a deadline time for that date.");
      return;
    }

    if (getDeadlineDateTime(taskDeadline, taskDeadlineTime) < new Date()) {
      setStatusMessage("Deadline time cannot be in the past.");
      return;
    }

    setIsSuggesting(true);
    setStatusMessage("Generating AI plan...");

    const localSuggestion = getTaskSuggestion(
      trimmedName,
      taskDescription,
      taskDifficulty,
      taskDeadline
    );

    try {
      const response = await fetch("/api/suggest-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskName: trimmedName,
          taskDescription,
          taskDifficulty,
          taskDeadline,
          taskDeadlineTime,
        }),
      });

      if (!response.ok) {
        throw new Error("AI server unavailable.");
      }

      const aiSuggestion = await response.json();
      setSuggestion({
        ...localSuggestion,
        ...aiSuggestion,
        difficulty: taskDifficulty,
      });
      setStatusMessage("AI suggestion ready. Adjust it before starting.");
    } catch {
      setSuggestion(localSuggestion);
      setStatusMessage(
        "Using local planner. Start the API server for real AI suggestions."
      );
    } finally {
      setIsSuggesting(false);
    }

    setHasSuggestion(true);
    setWorkflowStep(2);
  }

  function handleStart() {
    const trimmedName = taskName.trim();
    if (!trimmedName) return;

    const task = {
      id: crypto.randomUUID(),
      name: trimmedName,
      description: taskDescription.trim(),
      deadline: taskDeadline,
      deadlineTime: taskDeadlineTime,
      ...suggestion,
    };

    setActiveTask(task);
    setRemainingSessions(task.sessions);
    setMode("focus");
    setTimerSeconds(task.focusMinutes * 60);
    setIsRunning(false);
    setStatusMessage("Focus timer ready.");
    setWorkflowStep(4);
    setTaskName("");
    setTaskDescription("");
    setTaskDifficulty("Medium");
    setTaskDeadline("");
    setTaskDeadlineTime("");
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
      setIsPostTaskBreak(false);
      setStatusMessage("Timer stopped.");
      setWorkflowStep(1);
    }

    function handleStartBreak() {
      if (!activeTask) return;
      const breakSecs = 5 * 60;
      setMode("break");
      setTimerSeconds(breakSecs);
      setTotalTimerSeconds(breakSecs);
      setIsRunning(true);
      setIsPostTaskBreak(false);
      setStatusMessage("5-minute break started.");
      setWorkflowStep(5);
    }

  function updateSuggestion(key, value) {
    setSuggestion((current) => ({
      ...current,
      [key]: key === "difficulty" ? value : Number(value),
    }));
  }

    function handleNewTask() {
      setActiveTask(null);
      setIsRunning(false);
      setTimerSeconds(0);
      setTotalTimerSeconds(0);
      setMode("focus");
      setRemainingSessions(0);
      setIsPostTaskBreak(false);
      setStatusMessage("");
      setWorkflowStep(1);
    }

  function handleViewDashboard() {
    setWorkflowStep(6);
  }

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
          <span>{totalFocusMinutes}</span>
          <p>focus minutes</p>
        </div>
      </section>

      <section className="stage-shell">
        {workflowStep === 1 && (
        <div className="panel task-panel stage-panel">
          <div className="panel-heading">
            <div>
              <h2>Enter Task</h2>
              <p>Type the task and any useful context.</p>
            </div>
          </div>

          <label>
            Task name
            <input
              type="text"
              value={taskName}
              onChange={(event) => setTaskName(event.target.value)}
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

          <button className="primary-action" onClick={handleSuggest}>
            {isSuggesting ? "Generating..." : "Get Suggestion"}
          </button>
        </div>
        )}

        {workflowStep === 2 && (
        <div className="panel suggestion-panel stage-panel">
          <div className="panel-heading">
            <div>
              <h2>AI Suggests</h2>
              <p>Structured plan generated from your task details.</p>
            </div>
          </div>

          <div className="plan-card">
            <div>
              <span>Plan</span>
              <strong>
                {suggestion.sessions} focus session
                {suggestion.sessions === 1 ? "" : "s"} for a{" "}
                {suggestion.difficulty.toLowerCase()} task
              </strong>
            </div>
            <ul>
              <li>Total workload: {suggestion.sessions} sessions</li>
              <li>
                Focus rhythm: {suggestion.focusMinutes} min work +{" "}
                {suggestion.breakMinutes} min break
              </li>
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
                {daysUntil(taskDeadline) <= 1
                  ? "urgent"
                  : daysUntil(taskDeadline) <= 3
                    ? "soon"
                    : "flexible"}
              </li>
              <li>Reason: {suggestion.reason}</li>
            </ul>
          </div>

          <div className="suggestion-grid">
            <div>
              <span>Difficulty</span>
              <strong>{suggestion.difficulty}</strong>
            </div>
            <div>
              <span>Focus</span>
              <strong>{suggestion.focusMinutes} min</strong>
            </div>
            <div>
              <span>Sessions</span>
              <strong>{suggestion.sessions}</strong>
            </div>
            <div>
              <span>Deadline</span>
              <strong>
                {taskDeadline} at {taskDeadlineTime}
              </strong>
            </div>
            <div>
              <span>Break</span>
              <strong>{suggestion.breakMinutes} min</strong>
            </div>
          </div>

          <div className="stage-actions">
            <button onClick={() => setWorkflowStep(1)}>Edit Task</button>
            <button className="primary-action" onClick={() => setWorkflowStep(3)}>
              Adjust Plan
            </button>
          </div>
        </div>
        )}

        {workflowStep === 3 && (
        <div className="panel adjust-panel stage-panel">
          <div className="panel-heading">
            <div>
              <h2>User Adjusts</h2>
              <p>Change the plan before starting.</p>
            </div>
          </div>

          <div className="control-grid">
            <label>
              Difficulty
              <select
                value={suggestion.difficulty}
                onChange={(event) =>
                  updateSuggestion("difficulty", event.target.value)
                }
              >
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </label>

            <label>
              Focus minutes
              <input
                type="number"
                min="5"
                max="90"
                value={suggestion.focusMinutes}
                onChange={(event) =>
                  updateSuggestion("focusMinutes", event.target.value)
                }
              />
            </label>

            <label>
              Sessions
              <input
                type="number"
                min="1"
                max="8"
                value={suggestion.sessions}
                onChange={(event) =>
                  updateSuggestion("sessions", event.target.value)
                }
              />
            </label>

            <label>
              Break minutes
              <input
                type="number"
                min="1"
                max="45"
                value={suggestion.breakMinutes}
                onChange={(event) =>
                  updateSuggestion("breakMinutes", event.target.value)
                }
              />
            </label>
          </div>

          <button
            className="primary-action"
            onClick={handleStart}
            disabled={!hasSuggestion && !taskName.trim()}
          >
            Confirm To Start
          </button>
        </div>
        )}

        {(workflowStep === 4 || workflowStep === 5) && (
        <div className="panel timer-panel stage-panel">
          <div className="panel-heading">
            <div>
              <h2>{mode === "break" ? "Break Timer" : "Focus Timer"}</h2>
              <p>
                {activeTask
                  ? activeTask.name
                  : "Start a task to activate the countdown."}
              </p>
            </div>
          </div>

          <div className={`timer-display ${mode}`}>
            <span>{formatTime(timerSeconds)}</span>
            <p>
              {activeTask
                ? `${remainingSessions} session${
                    remainingSessions === 1 ? "" : "s"
                  } left`
                : "No active task"}
            </p>
          </div>

          <div className="timer-actions">
            <button
              className="primary-action"
              onClick={() => setIsRunning(true)}
              disabled={!activeTask || isRunning || timerSeconds === 0}
            >
              Start
            </button>
            <button onClick={() => setIsRunning(false)} disabled={!isRunning}>
              Pause
            </button>
            <button onClick={handleStopTask} disabled={!activeTask}>
              Stop
            </button>
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
            <div>
              <span>{completedTasks.length}</span>
              <p>tasks done</p>
            </div>
            <div>
              <span>{totalFocusMinutes}</span>
              <p>focus minutes</p>
            </div>
            <div>
              <span>
                {completedTasks.length
                  ? Math.round(totalFocusMinutes / completedTasks.length)
                  : 0}
              </span>
              <p>avg minutes</p>
            </div>
          </div>

          <div className="tip-box">
            Start hard tasks while your energy is highest, then use breaks to
            reset before the next session.
          </div>

          <div className="task-history">
            {completedTasks.slice(0, 3).map((task) => (
              <article key={task.id}>
                <strong>{task.name}</strong>
                <span>
                  {task.sessions} x {task.focusMinutes} min
                </span>
              </article>
            ))}
          </div>

          <div className="stage-actions">
            {activeTask && (
              <button onClick={() => setWorkflowStep(mode === "break" ? 5 : 4)}>
                Back To Timer
              </button>
            )}
            <button className="primary-action" onClick={handleNewTask}>
              Plan Next Task
            </button>
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
            <button
              className="primary-action"
              onClick={() => setSessionNotice(null)}
            >
              Continue Break
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
