import { ApiError } from "@/lib/api";

type AdminErrorOptions = {
  ignoreNotFound?: boolean;
};

export function handleAdminError(
  e: unknown,
  onAuthError: () => void,
  onForbidden: () => void,
  options: AdminErrorOptions = {}
): string | null {
  if (e instanceof ApiError) {
    if (e.status === 401) {
      onAuthError();
      return null;
    }
    if (e.status === 403) {
      onForbidden();
      return null;
    }
    if (options.ignoreNotFound && e.status === 404) {
      return null;
    }
  }

  const msg = String((e as any)?.message ?? e);
  if (msg === "NO_TOKEN" || msg === "UNAUTH") {
    onAuthError();
    return null;
  }
  if (msg === "FORBIDDEN") {
    onForbidden();
    return null;
  }
  if (options.ignoreNotFound && msg === "HTTP_404") {
    return null;
  }

  return msg;
}
