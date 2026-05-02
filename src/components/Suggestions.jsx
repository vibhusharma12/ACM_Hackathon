export default function Suggestions({ tasks }) {
  const totalSessions = tasks.reduce(
    (sum, task) => sum + (task.sessions ?? Math.ceil(task.estimatedTime / 25)),
    0
  );

  return (
    <div className="card">
      <h2>Suggestions</h2>

      <p>You need {totalSessions} focus sessions today</p>

      {totalSessions > 5 && (
        <p>Take a longer break after a few sessions</p>
      )}

      {tasks.some((t) => t.difficulty === "hard") && (
        <p>Start with high-focus tasks first</p>
      )}
    </div>
  );
}
