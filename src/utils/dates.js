export function parseLocalDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function daysUntil(dateString) {
  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  return (parseLocalDate(dateString) - startOfToday) / (1000 * 60 * 60 * 24);
}
