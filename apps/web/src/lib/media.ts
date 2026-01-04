import { apiBase } from "@/lib/api";

export function mediaUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const base = apiBase("browser");
  return base ? `${base}${path}` : path;
}

export function mediaThumbUrl(path: string | null | undefined, label: string): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const dot = path.lastIndexOf(".");
  if (dot === -1) return mediaUrl(path);
  const thumbPath = `${path.slice(0, dot)}_${label}${path.slice(dot)}`;
  return mediaUrl(thumbPath);
}
