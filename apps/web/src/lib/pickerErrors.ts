import { ApiError } from "@/lib/api";

export function handlePickerError(
  e: unknown,
  onAuthErrorAction: () => void,
  onForbiddenAction: () => void
) {
  if (e instanceof ApiError && e.status === 401) {
    onAuthErrorAction();
    return null;
  }
  if (e instanceof ApiError && e.status === 403) {
    onForbiddenAction();
    return null;
  }

  const msg = String((e as any)?.message ?? e);
  if (msg === "NO_TOKEN" || msg === "UNAUTH") {
    onAuthErrorAction();
    return null;
  }
  if (msg === "FORBIDDEN") {
    onForbiddenAction();
    return null;
  }

  return msg;
}
