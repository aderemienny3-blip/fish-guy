export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  return `${m}:${String(Math.max(0, seconds % 60)).padStart(2, "0")}`;
}
