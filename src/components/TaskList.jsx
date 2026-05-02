import { useState } from "react";
import { daysUntil } from "../utils/dates";

export default function TaskList({
  tasks,
  setTasks,
  setCurrentTask,
  currentTask,
}) {
  const [taskName, setTaskName] = useState("");
  const [difficulty, setDifficulty] = useState("easy");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [deadline, setDeadline] = useState("");

  function calculatePriority(task) {
    let score = 0;

    if (task.difficulty === "easy") score += 1;
    else if (task.difficulty === "medium") score += 2;
    else score += 3;

    const diffDays = daysUntil(task.deadline);

    if (diffDays <= 1) score += 5;
    else if (diffDays <= 3) score += 3;
    else score += 1;

    if (task.estimatedTime > 120) score += 2;
    else score += 1;

    return score;
  }

  function addTask() {
    const trimmedName = taskName.trim();
    const minutes = Number(estimatedTime);

    if (!trimmedName || !Number.isFinite(minutes) || minutes <= 0 || !deadline) {
      return;
    }

    const newTask = {
      id: crypto.randomUUID(),
      name: trimmedName,
      difficulty,
      estimatedTime: minutes,
      deadline,
      sessions: Math.ceil(minutes / 25),
    };

    newTask.priority = calculatePriority(newTask);

    setTasks([...tasks, newTask]);
    setTaskName("");
    setEstimatedTime("");
    setDeadline("");
  }

  const sortedTasks = [...tasks].sort((a, b) => b.priority - a.priority);

  return (
    <div className="card">
      <h2>Add Task</h2>

      <input
        type="text"
        placeholder="Task name"
        value={taskName}
        onChange={(e) => setTaskName(e.target.value)}
      />

      <select
        value={difficulty}
        onChange={(e) => setDifficulty(e.target.value)}
      >
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>

      <input
        type="number"
        min="1"
        placeholder="Time (mins)"
        value={estimatedTime}
        onChange={(e) => setEstimatedTime(e.target.value)}
      />

      <input
        type="date"
        value={deadline}
        onChange={(e) => setDeadline(e.target.value)}
      />

      <button onClick={addTask}>Add</button>

      <ul style={{ marginTop: "10px" }}>
        {sortedTasks.map((task, index) => (
          <li
            key={task.id}
            onClick={() => setCurrentTask(task)}
            style={{
              cursor: "pointer",
              marginTop: "8px",
              fontWeight: currentTask === task ? "bold" : "normal",
              border: index === 0 ? "2px solid gold" : "none",
              padding: "5px",
              borderRadius: "6px",
            }}
          >
            {task.name} ({task.difficulty}) - {task.estimatedTime} min - due{" "}
            {task.deadline} - priority {task.priority}
          </li>
        ))}
      </ul>
    </div>
  );
}
