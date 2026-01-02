export type ApiMode = "server" | "browser";

/**
 * Picks the correct API base URL depending on where code runs.
 * - server: uses internal Docker URL (fast, no TLS)
 * - browser: uses public HTTPS URL
 */
export function apiBase(mode: ApiMode): string {
  if (mode === "server") {
    return process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "";
  }
  return process.env.NEXT_PUBLIC_API_URL ?? "";
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function readError(res: Response): Promise<string> {
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    try {
      const data = await res.json();
      if (typeof data?.detail === "string") return data.detail;
      return JSON.stringify(data);
    } catch {
      return "";
    }
  }
  return await res.text().catch(() => "");
}

export async function apiGet<T>(
  path: string,
  mode: ApiMode,
  init?: RequestInit,
  token?: string | null
): Promise<T> {
  const base = apiBase(mode);
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const msg = await readError(res);
    throw new ApiError(res.status, `GET ${path} failed: ${res.status}${msg ? ` ${msg}` : ""}`);
  }

  // Allow empty responses
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return {} as T;

  return (await res.json()) as T;
}

export async function apiSend<T>(
  path: string,
  mode: ApiMode,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
  token?: string | null
): Promise<T> {
  const base = apiBase(mode);
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const msg = await readError(res);
    throw new ApiError(res.status, `${method} ${path} failed: ${res.status}${msg ? ` ${msg}` : ""}`);
  }

  // 204 / no content
  if (res.status === 204) return {} as T;

  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return {} as T;

  return (await res.json()) as T;
}
