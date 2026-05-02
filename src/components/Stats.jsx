import { daysUntil } from "../utils/dates";

export default function Stats({ tasks }) {
  const totalTime = tasks.reduce(
    (sum, task) => sum + task.estimatedTime,
    0
  );

  const urgentTasks = tasks.filter((task) => {
    const diff = daysUntil(task.deadline);

    return diff >= 0 && diff <= 2;
  }).length;

  const overdueTasks = tasks.filter(
    (task) => daysUntil(task.deadline) < 0
  ).length;

  const avgPriority =
    tasks.length > 0
      ? (
          tasks.reduce((sum, task) => sum + task.priority, 0) /
          tasks.length
        ).toFixed(1)
      : 0;

  return (
    <div className="card">
      <h2>Stats</h2>

      <p>Total planned time: {totalTime} mins</p>
      <p>Total tasks: {tasks.length}</p>
      <p>Urgent tasks: {urgentTasks}</p>
      <p>Overdue tasks: {overdueTasks}</p>
      <p>Average priority: {avgPriority}</p>
    </div>
  );
}
