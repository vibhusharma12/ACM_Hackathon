import { useCallback, useEffect, useMemo, useState } from "react";
import "./index.css";

const EMPTY_SUGGESTION = {
  difficulty: "Medium",
  focusMinutes: 25,
  sessions: 2,
  breakMinutes: 15,
};

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

  const totalFocusMinutes = useMemo(
    () =>
      completedTasks.reduce(
        (sum, task) => sum + task.focusMinutes * task.sessions,
        0
      ),
    [completedTasks]
  );

  const activeStep = activeTask ? (mode === "break" ? 5 : 4) : hasSuggestion ? 3 : 1;

  const completeTimerSegment = useCallback(() => {
    if (!activeTask) return;
    setIsRunning(false);

    if (mode === "focus") {
      setStatusMessage("Focus session complete. Break timer is ready.");
      setMode("break");
      setTimerSeconds(activeTask.breakMinutes * 60);
      return;
    }

    const nextSessions = remainingSessions - 1;
    setRemainingSessions(nextSessions);

    if (nextSessions > 0) {
      setStatusMessage("Break complete. Next focus session is ready.");
      setMode("focus");
      setTimerSeconds(activeTask.focusMinutes * 60);
      return;
    }

    setCompletedTasks((tasks) => [
      {
        ...activeTask,
        completedAt: new Date().toISOString(),
      },
      ...tasks,
    ]);
    setStatusMessage("Task complete. Dashboard updated.");
    setActiveTask(null);
    setMode("focus");
  }, [activeTask, mode, remainingSessions]);

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
  }

  function updateSuggestion(key, value) {
    setSuggestion((current) => ({
      ...current,
      [key]: key === "difficulty" ? value : Number(value),
    }));
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">FocusFlow</p>
          <h1>Plan the task, tune the session, start the timer.</h1>
        </div>
        <div className="hero-stats" aria-label="Session summary">
          <span>{completedTasks.length}</span>
          <p>tasks done</p>
          <span>{totalFocusMinutes}</span>
          <p>focus minutes</p>
        </div>
      </section>

      <section className="workspace-grid">
        <div className="panel task-panel">
          <div className="panel-heading">
            <span className="step-pill">1</span>
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

        <div className="panel suggestion-panel">
          <div className="panel-heading">
            <span className="step-pill">2</span>
            <div>
              <h2>AI Suggests</h2>
              <p>Difficulty, focus time, sessions, and break length.</p>
            </div>
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
        </div>

        <div className="panel adjust-panel">
          <div className="panel-heading">
            <span className="step-pill">3</span>
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

        <div className="panel timer-panel">
          <div className="panel-heading">
            <span className="step-pill">{mode === "break" ? "5" : "4"}</span>
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

        <div className="panel dashboard-panel">
          <div className="panel-heading">
            <span className="step-pill">6</span>
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
        </div>
      </section>

      <section className="flow-map" aria-label="Flow progress">
        {["Task Input", "AI Call", "Adjust", "Timer", "Break", "Dashboard"].map(
          (label, index) => (
            <div
              className={activeStep >= index + 1 ? "flow-step active" : "flow-step"}
              key={label}
            >
              <span>{index + 1}</span>
              <p>{label}</p>
            </div>
          )
        )}
      </section>
    </main>
  );
}

export default App;
