import { useCallback, useEffect, useMemo, useState } from "react";

const EMPTY_SUGGESTION = {
  difficulty: "Medium",
  focusMinutes: 25,
  sessions: 2,
  breakMinutes: 15,
};

const FOCUS_QUOTES = [
  "Small wins compound into serious momentum.",
  "The best work is built one focused block at a time.",
  "Progress gets easier when you protect your attention.",
  "You showed up, stayed with it, and moved the task forward.",
];

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function getTaskSuggestion(name, description) {
  const text = `${name} ${description}`.toLowerCase();
  const hardWords = ["build", "project", "exam", "research", "design", "code"];
  const easyWords = ["read", "reply", "email", "review", "clean", "call"];
  const isHard = hardWords.some((word) => text.includes(word));
  const isEasy = easyWords.some((word) => text.includes(word));
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  if (isHard || wordCount > 16) {
    return {
      difficulty: "Hard",
      focusMinutes: 50,
      sessions: 3,
      breakMinutes: 15,
    };
  }

  if (isEasy || wordCount < 7) {
    return {
      difficulty: "Easy",
      focusMinutes: 25,
      sessions: 1,
      breakMinutes: 10,
    };
  }

  return EMPTY_SUGGESTION;
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
  const [taskName, setTaskName] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [suggestion, setSuggestion] = useState(EMPTY_SUGGESTION);
  const [hasSuggestion, setHasSuggestion] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState("focus");
  const [remainingSessions, setRemainingSessions] = useState(0);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [workflowStep, setWorkflowStep] = useState(1);
  const [sessionNotice, setSessionNotice] = useState(null);

  const totalFocusMinutes = useMemo(
    () =>
      completedTasks.reduce(
        (sum, task) => sum + task.focusMinutes * task.sessions,
        0
      ),
    [completedTasks]
  );

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
      setStatusMessage("Focus session complete. Break timer started automatically.");
      setRemainingSessions(nextSessions);
      setMode("break");
      setTimerSeconds(activeTask.breakMinutes * 60);
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

  function handleSuggest() {
    const trimmedName = taskName.trim();
    if (!trimmedName) {
      setStatusMessage("Enter a task name first.");
      return;
    }

    setSuggestion(getTaskSuggestion(trimmedName, taskDescription));
    setHasSuggestion(true);
    setStatusMessage("Suggestion ready. Adjust it before starting.");
    setWorkflowStep(2);
  }

  function handleStart() {
    const trimmedName = taskName.trim();
    if (!trimmedName) return;

    const task = {
      id: crypto.randomUUID(),
      name: trimmedName,
      description: taskDescription.trim(),
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
    setHasSuggestion(false);
    setSuggestion(EMPTY_SUGGESTION);
  }

  function handleStopTask() {
    setActiveTask(null);
    setIsRunning(false);
    setTimerSeconds(0);
    setMode("focus");
    setRemainingSessions(0);
    setStatusMessage("Timer stopped.");
    setWorkflowStep(1);
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
    setMode("focus");
    setRemainingSessions(0);
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
              value={taskDescription}
              onChange={(event) => setTaskDescription(event.target.value)}
              placeholder="Add chapter, deadline, difficulty, or goal details"
              rows="4"
            />
          </label>

          <button className="primary-action" onClick={handleSuggest}>
            Get Suggestion
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
