export function formatRelativeTime(due: Date): string {
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const isPast = diffMs < 0;
  const abs = Math.abs(diffMs);
  const minutes = Math.floor(abs / 60_000);
  const hours = Math.floor(abs / 3_600_000);
  const days = Math.floor(abs / 86_400_000);
  if (days === 1) return isPast ? "yesterday" : "tomorrow";
  if (days > 1) return isPast ? `${days}d ago` : `in ${days}d`;
  if (hours >= 1) return isPast ? `${hours}h ago` : `in ${hours}h`;
  return isPast ? `${minutes}m ago` : `in ${minutes}m`;
}
