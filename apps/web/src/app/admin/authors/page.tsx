"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearToken } from "@/lib/auth";
import { apiBase, apiGet, apiSend } from "@/lib/api";
import { getRequiredToken } from "@/lib/adminApi";
import { handleAdminError } from "@/lib/adminErrors";
import { mediaThumbUrl, mediaUrl } from "@/lib/media";
import Button from "@/components/ui/Button";
import Panel from "@/components/ui/Panel";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type AuthorRow = {
  id: number;
  name: string;
  bio: string | null;
  photo_url?: string | null;
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

async function apiGetAdminAuthors(params: { q?: string; limit?: number; offset?: number }) {
  const token = getRequiredToken();

  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  search.set("limit", String(params.limit ?? 50));
  search.set("offset", String(params.offset ?? 0));

  const path = `/admin/authors?${search.toString()}`;
  return apiGet<{ items: AuthorRow[]; limit: number; offset: number }>(path, "browser", undefined, token);
}

async function apiCreateAdminAuthor(payload: { name: string; bio?: string | null }) {
  const token = getRequiredToken();

  return apiSend<AuthorRow>("/admin/authors", "browser", "POST", payload, token);
}

async function apiPatchAdminAuthor(authorId: number, patch: { name?: string; bio?: string | null }) {
  const token = getRequiredToken();

  return apiSend<AuthorRow>(`/admin/authors/${authorId}`, "browser", "PATCH", patch, token);
}

async function apiDeleteAdminAuthor(authorId: number) {
  const token = getRequiredToken();

  await apiSend(`/admin/authors/${authorId}`, "browser", "DELETE", undefined, token);
}

async function apiUploadAuthorPhoto(authorId: number, file: File) {
  const token = getRequiredToken();

  const body = new FormData();
  body.append("file", file);

  const base = apiBase("browser");
  const res = await fetch(`${base}/admin/authors/${authorId}/photo`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });

  if (res.status === 401) throw new Error("UNAUTH");
  if (res.status === 403) throw new Error("FORBIDDEN");
  if (!res.ok) throw new Error(`HTTP_${res.status}`);

  return (await res.json()) as { id: number; photo_url: string | null };
}

export default function AdminAuthorsPage() {
  const router = useRouter();

  const [q, setQ] = useState("");
  const dq = useDebounce(q, 250);

  const [items, setItems] = useState<AuthorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // create form
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoInputKey, setPhotoInputKey] = useState(0);
  const [saving, setSaving] = useState(false);

  // edit row
  const [editingId, setEditingId] = useState<number | null>(null);
  const [rowBusyId, setRowBusyId] = useState<number | null>(null);
  const [photoBusyId, setPhotoBusyId] = useState<number | null>(null);

  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");

  function handleAuthError(nextPath: string) {
    clearToken();
    router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const data = await apiGetAdminAuthors({ q: dq || undefined, limit: 50, offset: 0 });
      setItems(data.items);
    } catch (e: any) {
      const msg = handleAdminError(e, () => handleAuthError("/admin/authors"), () => router.replace("/"));
      if (msg) setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const n = name.trim();
    if (!n) return;

    setSaving(true);
    try {
      let created = await apiCreateAdminAuthor({
        name: n,
        bio: bio.trim() ? bio.trim() : null,
      });

      setName("");
      setBio("");

      if (photoFile) {
        try {
          const uploaded = await apiUploadAuthorPhoto(created.id, photoFile);
          created = { ...created, photo_url: uploaded.photo_url };
        } catch (e: any) {
          const msg = handleAdminError(e, () => handleAuthError("/admin/authors"), () => router.replace("/"));
          if (msg) setErr(msg);
        }
      }

      setPhotoFile(null);
      setPhotoInputKey((k) => k + 1);

      setItems((prev) => [created, ...prev]);
    } catch (e: any) {
      const msg = handleAdminError(e, () => handleAuthError("/admin/authors"), () => router.replace("/"));
      if (msg) setErr(msg);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(a: AuthorRow) {
    setEditingId(a.id);
    setEditName(a.name ?? "");
    setEditBio(a.bio ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditBio("");
  }

  async function saveEdit(authorId: number) {
    setErr(null);
    setRowBusyId(authorId);

    const n = editName.trim();
    if (!n) {
      setErr("Name cannot be empty.");
      setRowBusyId(null);
      return;
    }

    try {
      const updated = await apiPatchAdminAuthor(authorId, {
        name: n,
        bio: editBio.trim() ? editBio.trim() : null,
      });

      setItems((prev) => prev.map((x) => (x.id === authorId ? updated : x)));
      cancelEdit();
    } catch (e: any) {
      const msg = handleAdminError(e, () => handleAuthError("/admin/authors"), () => router.replace("/"));
      if (msg) setErr(msg);
    } finally {
      setRowBusyId(null);
    }
  }

  async function onDelete(a: AuthorRow) {
    setErr(null);
    setRowBusyId(a.id);

    const prev = items;
    setItems((p) => p.filter((x) => x.id !== a.id));

    try {
      await apiDeleteAdminAuthor(a.id);
    } catch (e: any) {
      setItems(prev); // revert
      const msg = handleAdminError(e, () => handleAuthError("/admin/authors"), () => router.replace("/"));
      if (msg) setErr(msg);
    } finally {
      setRowBusyId(null);
    }
  }

  async function onUploadPhoto(authorId: number, file: File) {
    setErr(null);
    setPhotoBusyId(authorId);

    try {
      const updated = await apiUploadAuthorPhoto(authorId, file);
      setItems((prev) => prev.map((x) => (x.id === authorId ? { ...x, photo_url: updated.photo_url } : x)));
    } catch (e: any) {
      const msg = handleAdminError(e, () => handleAuthError("/admin/authors"), () => router.replace("/"));
      if (msg) setErr(msg);
    } finally {
      setPhotoBusyId(null);
    }
  }

  return (
    <div className="flex flex-wrap space-y-4 gap-5">
      <div className="flex flex-col w-full">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Admin · Authors</h1>
        </div>

        <div className="flex items-center gap-3 max-w-2xl">
          <input
            className="input w-full"
            placeholder="Search authors…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-col flex-1">
        <Panel as="form" onSubmit={onCreate} className="space-y-2 w-full" padding="sm">
          <div className="font-medium">Add author</div>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Name</legend>
            <input
              className="input w-full"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
            />
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Author's bio</legend>
            <textarea
              className="textarea h-24 w-full"
              placeholder="Bio (optional)"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={saving}
            />
          </fieldset>

          <div className="divider"></div>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Photo</legend>
            <input
              key={photoInputKey}
              type="file"
              accept="image/*"
              className="file-input w-full"
              onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              disabled={saving}
            />
          </fieldset>

          <div className="divider"></div>

          <Button type="submit" variant="outline" className="w-full" disabled={saving || !name.trim()}>
            {saving ? "Saving…" : "Create"}
          </Button>
        </Panel>
      </div>

      {loading && <div className="text-sm opacity-70">Loading…</div>}
      {err && (
        <Panel className="text-sm" padding="sm">
          Error: {err}
        </Panel>
      )}

      <div className="flex flex-col flex-1 space-y-3">
        {items.map((a) => {
          const isEditing = editingId === a.id;
          const busy = rowBusyId === a.id;
          const photoBusy = photoBusyId === a.id;

          return (
            <Panel key={a.id} padding="md">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <div className="flex flex-col items-center gap-2">
                    {a.photo_url ? (
                      <img
                        src={mediaThumbUrl(a.photo_url, "xs") ?? mediaUrl(a.photo_url) ?? ""}
                        alt={`${a.name} portrait`}
                        className="h-12 w-12 rounded object-cover"
                        onError={(e) => {
                          const fallback = mediaUrl(a.photo_url);
                          if (fallback && e.currentTarget.src !== fallback) {
                            e.currentTarget.src = fallback;
                          }
                        }}
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded border text-[10px] opacity-60">
                        —
                      </div>
                    )}

                    <label className="cursor-pointer text-xs underline">
                      {photoBusy ? "Uploading…" : "Upload"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={photoBusy}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          void onUploadPhoto(a.id, file);
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="text-xs opacity-60">ID {a.id}</div>
                    {isEditing ? (
                      <input
                        className="border rounded px-2 py-1 w-full"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        disabled={busy}
                        placeholder="Name"
                      />
                    ) : (
                      <div className="text-lg font-medium">{a.name}</div>
                    )}

                    <div>
                      <div className="opacity-70 text-sm">Bio</div>
                      {isEditing ? (
                        <textarea
                          className="border rounded px-2 py-1 w-full min-h-17.5"
                          value={editBio}
                          onChange={(e) => setEditBio(e.target.value)}
                          disabled={busy}
                          placeholder="Bio"
                        />
                      ) : (
                        <div className="text-sm">{a.bio ?? "—"}</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button onClick={cancelEdit} disabled={busy} type="button" variant="info" size="sm">
                        Cancel
                      </Button>
                      <Button onClick={() => saveEdit(a.id)} disabled={busy || !editName.trim()} type="button" variant="success" size="sm">
                        {busy ? "Saving…" : "Save"}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button onClick={() => startEdit(a)} disabled={busy} type="button" variant="info" size="sm">
                        Edit
                      </Button>
                      <Button
                        onClick={() => {
                          const el = document.getElementById(`delete-author-${a.id}`) as HTMLDialogElement | null;
                          el?.showModal();
                        }}
                        disabled={busy}
                        type="button"
                        variant="error"
                        size="sm"
                      >
                        {busy ? "…" : "Delete"}
                      </Button>
                      <ConfirmDialog
                        id={`delete-author-${a.id}`}
                        title="Delete author"
                        description={`Delete "${a.name}"? This cannot be undone.`}
                        confirmLabel="Delete"
                        confirmVariant="error"
                        onConfirmAction={() => onDelete(a)}
                        busy={busy}
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="mt-3 text-xs opacity-60">Created {new Date(a.created_at).toLocaleString()}</div>
            </Panel>
          );
        })}

        {!loading && items.length === 0 && (
          <Panel className="text-sm opacity-70" padding="md">
            No authors found.
          </Panel>
        )}
      </div>
    </div>
  );
}
