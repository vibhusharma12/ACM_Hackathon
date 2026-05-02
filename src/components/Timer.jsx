import { useEffect, useState } from "react";

export default function Timer({ currentTask }) {
  const initialTime = currentTask ? currentTask.estimatedTime * 60 : 0;
  const [time, setTime] = useState(initialTime);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || time <= 0) return;

    const interval = setInterval(() => {
      setTime((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [running, time]);

  const minutes = Math.floor(time / 60);
  const seconds = String(time % 60).padStart(2, "0");

  return (
    <div className="card">
      <h2>Timer</h2>

      {currentTask ? (
        <p style={{ marginBottom: "10px" }}>
          Working on: <b>{currentTask.name}</b>
        </p>
      ) : (
        <p style={{ marginBottom: "10px", opacity: 0.7 }}>
          Select a task to begin
        </p>
      )}

      <div className="timer">
        {minutes}:{seconds}
      </div>

      <div style={{ marginTop: "10px" }}>
        <button
          onClick={() => setRunning(true)}
          disabled={!currentTask || time === 0}
        >
          Start
        </button>

        <button
          onClick={() => setRunning(false)}
          disabled={!running}
          style={{ marginLeft: "8px" }}
        >
          Pause
        </button>

        <button
          onClick={() => {
            setTime(initialTime);
            setRunning(false);
          }}
          disabled={!currentTask}
          style={{ marginLeft: "8px" }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
