export function formatRelativeTime(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const diffMs = d.getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1000);
  const abs = Math.abs(diffSec);

  if (abs < 60) return "just now";
  if (abs < 3600) {
    const minutes = Math.round(diffSec / 60);
    return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(minutes, "minute");
  }
  if (abs < 86400) {
    const hours = Math.round(diffSec / 3600);
    return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(hours, "hour");
  }

  const days = Math.round(diffSec / 86400);
  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(days, "day");
}
