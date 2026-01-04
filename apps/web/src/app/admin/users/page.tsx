"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearToken } from "@/lib/auth";
import { apiGet, apiSend } from "@/lib/api";
import { getRequiredToken } from "@/lib/adminApi";
import { handleAdminError } from "@/lib/adminErrors";
import Panel from "@/components/Panel";

type UserRow = {
  id: number;
  email: string;
  username: string;
  role: string;
  is_active: boolean;
  created_at: string;
};

function useDebounce<T>(value: T, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

async function apiGetAdminUsers(params: { q?: string; limit?: number; offset?: number }) {
  const token = getRequiredToken();

  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  search.set("limit", String(params.limit ?? 50));
  search.set("offset", String(params.offset ?? 0));

  const path = `/admin/users?${search.toString()}`;
  return apiGet<{ items: UserRow[]; limit: number; offset: number }>(path, "browser", undefined, token);
}

async function apiPatchAdminUser(userId: number, patch: Partial<Pick<UserRow, "role" | "is_active">>) {
  const token = getRequiredToken();

  return apiSend<UserRow>(`/admin/users/${userId}`, "browser", "PATCH", patch, token);
}

export default function AdminUsersPage() {
  const router = useRouter();

  const [q, setQ] = useState("");
  const dq = useDebounce(q, 250);

  const [items, setItems] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  function handleAuthError() {
    clearToken();
    router.replace("/login?next=/admin/users");
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        const data = await apiGetAdminUsers({ q: dq || undefined, limit: 50, offset: 0 });
        if (!cancelled) setItems(data.items);
      } catch (e: any) {
        const msg = handleAdminError(e, handleAuthError, () => router.replace("/"));
        if (msg && !cancelled) setErr(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dq, router]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Admin · Users</h1>
      </div>

      <div className="flex items-center gap-3">
        <input
          className="input w-full max-w-md"
          placeholder="Search email / username…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading && <div className="text-sm opacity-70">Loading…</div>}
      {err && (
        <Panel className="text-sm" padding="sm">
          Error: <span className="font-mono">{err}</span>
        </Panel>
      )}

      <div className="space-y-3">
        {items.map((u) => (
          <Panel key={u.id} padding="md">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <div className="text-xs opacity-60">ID {u.id}</div>
                <div className="text-lg font-medium">{u.username}</div>
                <div className="text-sm">{u.email}</div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm">
                <label className="flex items-center gap-2">
                  <span className="opacity-70">Role</span>
                  <select
                    className="select select-xs"
                    value={u.role}
                    onChange={async (e) => {
                      const nextRole = e.target.value;
                      setItems((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: nextRole } : x)));

                      try {
                        await apiPatchAdminUser(u.id, { role: nextRole });
                      } catch (err: any) {
                        setItems((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: u.role } : x)));
                        const msg = handleAdminError(err, handleAuthError, () => router.replace("/"));
                        if (msg) setErr(msg);
                      }
                    }}
                  >
                    <option value="user">user</option>
                    <option value="staff">staff</option>
                    <option value="admin">admin</option>
                  </select>
                </label>

                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    className={u.is_active ? "toggle toggle-success" : "toggle"}
                    checked={u.is_active}
                    onChange={async (e) => {
                      const next = e.target.checked;
                      setItems((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_active: next } : x)));

                      try {
                        await apiPatchAdminUser(u.id, { is_active: next });
                      } catch (err: any) {
                        setItems((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_active: u.is_active } : x)));
                        const msg = handleAdminError(err, handleAuthError, () => router.replace("/"));
                        if (msg) setErr(msg);
                      }
                    }}
                  />
                  <span>{u.is_active ? "Active" : "Inactive"}</span>
                </label>
              </div>
            </div>

            <div className="mt-3 text-xs opacity-60">Created {new Date(u.created_at).toLocaleString()}</div>
          </Panel>
        ))}

        {!loading && items.length === 0 && (
          <Panel className="text-sm opacity-70" padding="md">
            No users found.
          </Panel>
        )}
      </div>
    </div>
  );
}
