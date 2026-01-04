"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearToken } from "@/lib/auth";
import { apiGet, apiSend } from "@/lib/api";
import { getRequiredToken } from "@/lib/adminApi";
import { handleAdminError } from "@/lib/adminErrors";
import Button from "@/components/Button";
import Panel from "@/components/Panel";
import ConfirmDialog from "@/components/ConfirmDialog";

type Item = { id: number; name: string };

function useDebounce<T>(value: T, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

async function apiGetItems(kind: "tags" | "genres", params: { q?: string; limit?: number; offset?: number }) {
  const token = getRequiredToken();

  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  search.set("limit", String(params.limit ?? 50));
  search.set("offset", String(params.offset ?? 0));

  const path = `/admin/${kind}?${search.toString()}`;
  return apiGet<{ items: Item[]; limit: number; offset: number }>(path, "browser", undefined, token);
}

async function apiCreateItem(kind: "tags" | "genres", name: string) {
  const token = getRequiredToken();

  return apiSend<Item>(`/admin/${kind}`, "browser", "POST", { name }, token);
}

async function apiUpdateItem(kind: "tags" | "genres", id: number, name: string) {
  const token = getRequiredToken();

  return apiSend<Item>(`/admin/${kind}/${id}`, "browser", "PATCH", { name }, token);
}

async function apiDeleteItem(kind: "tags" | "genres", id: number) {
  const token = getRequiredToken();

  await apiSend(`/admin/${kind}/${id}`, "browser", "DELETE", undefined, token);
}

export default function AdminTagsGenresPage() {
  const router = useRouter();

  const [tagQ, setTagQ] = useState("");
  const [genreQ, setGenreQ] = useState("");
  const dqTag = useDebounce(tagQ, 250);
  const dqGenre = useDebounce(genreQ, 250);

  const [tags, setTags] = useState<Item[]>([]);
  const [genres, setGenres] = useState<Item[]>([]);
  const [loadingTags, setLoadingTags] = useState(true);
  const [loadingGenres, setLoadingGenres] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [newTag, setNewTag] = useState("");
  const [newGenre, setNewGenre] = useState("");
  const [savingTag, setSavingTag] = useState(false);
  const [savingGenre, setSavingGenre] = useState(false);

  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [editingGenreId, setEditingGenreId] = useState<number | null>(null);
  const [editTagName, setEditTagName] = useState("");
  const [editGenreName, setEditGenreName] = useState("");
  const [busyTagId, setBusyTagId] = useState<number | null>(null);
  const [busyGenreId, setBusyGenreId] = useState<number | null>(null);

  function handleAuthError(nextPath: string) {
    clearToken();
    router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  useEffect(() => {
    let cancelled = false;
    setLoadingTags(true);
    setErr(null);

    (async () => {
      try {
        const data = await apiGetItems("tags", { q: dqTag || undefined, limit: 50, offset: 0 });
        if (!cancelled) setTags(data.items);
      } catch (e: any) {
        const msg = handleAdminError(
          e,
          () => handleAuthError("/admin/tags-genres"),
          () => router.replace("/")
        );
        if (msg && !cancelled) setErr(msg);
      } finally {
        if (!cancelled) setLoadingTags(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dqTag, router]);

  useEffect(() => {
    let cancelled = false;
    setLoadingGenres(true);
    setErr(null);

    (async () => {
      try {
        const data = await apiGetItems("genres", { q: dqGenre || undefined, limit: 50, offset: 0 });
        if (!cancelled) setGenres(data.items);
      } catch (e: any) {
        const msg = handleAdminError(
          e,
          () => handleAuthError("/admin/tags-genres"),
          () => router.replace("/")
        );
        if (msg && !cancelled) setErr(msg);
      } finally {
        if (!cancelled) setLoadingGenres(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dqGenre, router]);

  async function onCreateTag() {
    const name = newTag.trim();
    if (!name) return;

    setErr(null);
    setSavingTag(true);
    try {
      const created = await apiCreateItem("tags", name);
      setTags((prev) => [created, ...prev]);
      setNewTag("");
    } catch (e: any) {
      const msg = handleAdminError(
        e,
        () => handleAuthError("/admin/tags-genres"),
        () => router.replace("/")
      );
      if (msg) setErr(msg);
    } finally {
      setSavingTag(false);
    }
  }

  async function onCreateGenre() {
    const name = newGenre.trim();
    if (!name) return;

    setErr(null);
    setSavingGenre(true);
    try {
      const created = await apiCreateItem("genres", name);
      setGenres((prev) => [created, ...prev]);
      setNewGenre("");
    } catch (e: any) {
      const msg = handleAdminError(
        e,
        () => handleAuthError("/admin/tags-genres"),
        () => router.replace("/")
      );
      if (msg) setErr(msg);
    } finally {
      setSavingGenre(false);
    }
  }

  function startEditTag(t: Item) {
    setEditingTagId(t.id);
    setEditTagName(t.name);
  }

  function cancelEditTag() {
    setEditingTagId(null);
    setEditTagName("");
  }

  async function saveEditTag(id: number) {
    const name = editTagName.trim();
    if (!name) return;

    setErr(null);
    setBusyTagId(id);
    try {
      const updated = await apiUpdateItem("tags", id, name);
      setTags((prev) => prev.map((t) => (t.id === id ? updated : t)));
      cancelEditTag();
    } catch (e: any) {
      const msg = handleAdminError(
        e,
        () => handleAuthError("/admin/tags-genres"),
        () => router.replace("/")
      );
      if (msg) setErr(msg);
    } finally {
      setBusyTagId(null);
    }
  }

  async function onDeleteTag(t: Item) {
    setErr(null);
    setBusyTagId(t.id);
    const prev = tags;
    setTags((p) => p.filter((x) => x.id !== t.id));

    try {
      await apiDeleteItem("tags", t.id);
    } catch (e: any) {
      setTags(prev);
      const msg = handleAdminError(
        e,
        () => handleAuthError("/admin/tags-genres"),
        () => router.replace("/"),
        { ignoreNotFound: true }
      );
      if (msg) setErr(msg);
    } finally {
      setBusyTagId(null);
    }
  }

  function startEditGenre(g: Item) {
    setEditingGenreId(g.id);
    setEditGenreName(g.name);
  }

  function cancelEditGenre() {
    setEditingGenreId(null);
    setEditGenreName("");
  }

  async function saveEditGenre(id: number) {
    const name = editGenreName.trim();
    if (!name) return;

    setErr(null);
    setBusyGenreId(id);
    try {
      const updated = await apiUpdateItem("genres", id, name);
      setGenres((prev) => prev.map((g) => (g.id === id ? updated : g)));
      cancelEditGenre();
    } catch (e: any) {
      const msg = handleAdminError(
        e,
        () => handleAuthError("/admin/tags-genres"),
        () => router.replace("/")
      );
      if (msg) setErr(msg);
    } finally {
      setBusyGenreId(null);
    }
  }

  async function onDeleteGenre(g: Item) {
    setErr(null);
    setBusyGenreId(g.id);
    const prev = genres;
    setGenres((p) => p.filter((x) => x.id !== g.id));

    try {
      await apiDeleteItem("genres", g.id);
    } catch (e: any) {
      setGenres(prev);
      const msg = handleAdminError(
        e,
        () => handleAuthError("/admin/tags-genres"),
        () => router.replace("/"),
        { ignoreNotFound: true }
      );
      if (msg) setErr(msg);
    } finally {
      setBusyGenreId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Admin · Tags & Genres</h1>
      </div>

      {err && (
        <Panel className="text-sm" padding="sm">
          Error: {err}
        </Panel>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Tags</h2>
          <Panel className="space-y-2" padding="sm">
            <input
              className="input w-full"
              placeholder="New tag name"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              disabled={savingTag}
            />
            <Button type="button" variant="outline" onClick={onCreateTag} disabled={savingTag || !newTag.trim()}>
              {savingTag ? "Saving…" : "Create tag"}
            </Button>
          </Panel>

          <input
            className="input w-full"
            placeholder="Search tags…"
            value={tagQ}
            onChange={(e) => setTagQ(e.target.value)}
          />

          {loadingTags && <div className="text-sm opacity-70">Loading…</div>}
          <div className="space-y-2">
            {tags.map((t) => (
              <Panel key={t.id} padding="sm">
                <div className="text-xs opacity-60">ID {t.id}</div>
                {editingTagId === t.id ? (
                  <div className="mt-2 space-y-2">
                    <input
                      className="input w-full"
                      value={editTagName}
                      onChange={(e) => setEditTagName(e.target.value)}
                      disabled={busyTagId === t.id}
                    />
                    <div className="flex gap-2">
                      <Button type="button" variant="info" size="sm" onClick={cancelEditTag} disabled={busyTagId === t.id}>
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="success"
                        size="sm"
                        onClick={() => saveEditTag(t.id)}
                        disabled={busyTagId === t.id || !editTagName.trim()}
                      >
                        {busyTagId === t.id ? "Saving…" : "Save"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="font-medium">{t.name}</div>
                    <div className="mt-2 flex gap-2 text-sm">
                      <Button type="button" variant="info" size="sm" onClick={() => startEditTag(t)}>
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="error"
                        size="sm"
                        onClick={() => {
                          const el = document.getElementById(`delete-tag-${t.id}`) as HTMLDialogElement | null;
                          el?.showModal();
                        }}
                        disabled={busyTagId === t.id}
                      >
                        {busyTagId === t.id ? "…" : "Delete"}
                      </Button>
                      <ConfirmDialog
                        id={`delete-tag-${t.id}`}
                        title="Delete tag"
                        description={`Delete "${t.name}"? This cannot be undone.`}
                        confirmLabel="Delete"
                        confirmVariant="error"
                        onConfirmAction={() => onDeleteTag(t)}
                        busy={busyTagId === t.id}
                      />
                    </div>
                  </>
                )}
              </Panel>
            ))}
            {!loadingTags && tags.length === 0 && (
              <Panel className="text-sm opacity-70" padding="sm">
                No tags found.
              </Panel>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Genres</h2>
          <Panel className="space-y-2" padding="sm">
            <input
              className="input w-full"
              placeholder="New genre name"
              value={newGenre}
              onChange={(e) => setNewGenre(e.target.value)}
              disabled={savingGenre}
            />
            <Button type="button" variant="outline" onClick={onCreateGenre} disabled={savingGenre || !newGenre.trim()}>
              {savingGenre ? "Saving…" : "Create genre"}
            </Button>
          </Panel>

          <input
            className="input w-full"
            placeholder="Search genres…"
            value={genreQ}
            onChange={(e) => setGenreQ(e.target.value)}
          />

          {loadingGenres && <div className="text-sm opacity-70">Loading…</div>}
          <div className="space-y-2">
            {genres.map((g) => (
              <Panel key={g.id} padding="sm">
                <div className="text-xs opacity-60">ID {g.id}</div>
                {editingGenreId === g.id ? (
                  <div className="mt-2 space-y-2">
                    <input
                      className="border rounded px-2 py-1 w-full"
                      value={editGenreName}
                      onChange={(e) => setEditGenreName(e.target.value)}
                      disabled={busyGenreId === g.id}
                    />
                    <div className="flex gap-2">
                      <Button type="button" variant="info" size="sm" onClick={cancelEditGenre} disabled={busyGenreId === g.id}>
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="success"
                        size="sm"
                        onClick={() => saveEditGenre(g.id)}
                        disabled={busyGenreId === g.id || !editGenreName.trim()}
                      >
                        {busyGenreId === g.id ? "Saving…" : "Save"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="font-medium">{g.name}</div>
                    <div className="mt-2 flex gap-2 text-sm">
                      <Button type="button" variant="info" size="sm" onClick={() => startEditGenre(g)}>
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="error"
                        size="sm"
                        onClick={() => {
                          const el = document.getElementById(`delete-genre-${g.id}`) as HTMLDialogElement | null;
                          el?.showModal();
                        }}
                        disabled={busyGenreId === g.id}
                      >
                        {busyGenreId === g.id ? "…" : "Delete"}
                      </Button>
                      <ConfirmDialog
                        id={`delete-genre-${g.id}`}
                        title="Delete genre"
                        description={`Delete "${g.name}"? This cannot be undone.`}
                        confirmLabel="Delete"
                        confirmVariant="error"
                        onConfirmAction={() => onDeleteGenre(g)}
                        busy={busyGenreId === g.id}
                      />
                    </div>
                  </>
                )}
              </Panel>
            ))}
            {!loadingGenres && genres.length === 0 && (
              <Panel className="text-sm opacity-70" padding="sm">
                No genres found.
              </Panel>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
