import { apiBase } from "@/lib/api";

export function mediaUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const base = apiBase("browser");
  return base ? `${base}${path}` : path;
}
