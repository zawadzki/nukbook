"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearToken } from "@/lib/auth";
import { apiBase, apiGet, apiSend } from "@/lib/api";
import { getRequiredToken } from "@/lib/adminApi";
import { handleAdminError } from "@/lib/adminErrors";
import { mediaUrl } from "@/lib/media";
import AuthorPicker from "@/components/ui/AuthorPicker";
import TagPicker from "@/components/ui/TagPicker";
import GenrePicker from "@/components/ui/GenrePicker";
import Button from "@/components/ui/Button";
import Panel from "@/components/ui/Panel";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type AuthorOpt = { id: number; name: string };
type TagOpt = { id: number; name: string };
type GenreOpt = { id: number; name: string };

type BookRow = {
  id: number;
  title: string;
  description: string | null;
  published_year: number | null;
  cover_url?: string | null;
  created_at: string;
  authors: AuthorOpt[];
  tags: TagOpt[];
  genres: GenreOpt[];
};

function useDebounce<T>(value: T, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

async function apiGetAdminBooks(params: { q?: string; limit?: number; offset?: number }) {
  const token = getRequiredToken();

  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  search.set("limit", String(params.limit ?? 50));
  search.set("offset", String(params.offset ?? 0));

  const path = `/admin/books?${search.toString()}`;
  return apiGet<{ items: BookRow[]; limit: number; offset: number }>(path, "browser", undefined, token);
}

async function apiCreateAdminBook(payload: {
  title: string;
  description?: string | null;
  published_year?: number | null;
  author_ids: number[];
  tag_ids: number[];
  genre_ids: number[];
}) {
  const token = getRequiredToken();

  return apiSend<BookRow>("/admin/books", "browser", "POST", payload, token);
}

async function apiPatchAdminBook(
  bookId: number,
  patch: {
    title?: string;
    description?: string | null;
    published_year?: number | null;
    author_ids?: number[];
    tag_ids?: number[];
    genre_ids?: number[];
  }
) {
  const token = getRequiredToken();

  return apiSend<BookRow>(`/admin/books/${bookId}`, "browser", "PATCH", patch, token);
}

async function apiDeleteAdminBook(bookId: number) {
  const token = getRequiredToken();

  await apiSend(`/admin/books/${bookId}`, "browser", "DELETE", undefined, token);
}

async function apiUploadBookCover(bookId: number, file: File) {
  const token = getRequiredToken();

  const body = new FormData();
  body.append("file", file);

  const base = apiBase("browser");
  const res = await fetch(`${base}/admin/books/${bookId}/cover`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });

  if (res.status === 401) throw new Error("UNAUTH");
  if (res.status === 403) throw new Error("FORBIDDEN");
  if (!res.ok) throw new Error(`HTTP_${res.status}`);

  return (await res.json()) as { id: number; cover_url: string | null };
}

async function apiCreateTag(name: string) {
  const token = getRequiredToken();

  return apiSend<TagOpt>("/admin/tags", "browser", "POST", { name }, token);
}

async function apiCreateGenre(name: string) {
  const token = getRequiredToken();

  return apiSend<GenreOpt>("/admin/genres", "browser", "POST", { name }, token);
}

export default function AdminBooksPage() {
  const router = useRouter();

  const [q, setQ] = useState("");
  const dq = useDebounce(q, 250);

  const [items, setItems] = useState<BookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // create form
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("");
  const [desc, setDesc] = useState("");
  const [authorValue, setAuthorValue] = useState<AuthorOpt[]>([]);
  const [tagValue, setTagValue] = useState<TagOpt[]>([]);
  const [genreValue, setGenreValue] = useState<GenreOpt[]>([]);
  const [newTag, setNewTag] = useState("");
  const [newGenre, setNewGenre] = useState("");
  const [tagBusy, setTagBusy] = useState(false);
  const [genreBusy, setGenreBusy] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverInputKey, setCoverInputKey] = useState(0);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [rowBusyId, setRowBusyId] = useState<number | null>(null);
  const [coverBusyId, setCoverBusyId] = useState<number | null>(null);

  const [editTitle, setEditTitle] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editAuthors, setEditAuthors] = useState<AuthorOpt[]>([]);
  const [editTags, setEditTags] = useState<TagOpt[]>([]);
  const [editGenres, setEditGenres] = useState<GenreOpt[]>([]);

  function handleAuthError(nextPath: string) {
    clearToken();
    router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const data = await apiGetAdminBooks({ q: dq || undefined, limit: 50, offset: 0 });
      setItems(data.items);
    } catch (e: any) {
      const msg = handleAdminError(e, () => handleAuthError("/admin/books"), () => router.replace("/"));
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

    const t = title.trim();
    if (!t) return;

    const y = year.trim() ? Number(year.trim()) : null;
    if (year.trim() && !Number.isFinite(y)) {
      setErr("Published year must be a number.");
      return;
    }

    setSaving(true);
    try {
      let created = await apiCreateAdminBook({
        title: t,
        description: desc.trim() ? desc.trim() : null,
        published_year: y,
        author_ids: authorValue.map((a) => a.id),
        tag_ids: tagValue.map((t) => t.id),
        genre_ids: genreValue.map((g) => g.id),
      });

      setTitle("");
      setYear("");
      setDesc("");
      setAuthorValue([]);
      setTagValue([]);
      setGenreValue([]);
      setNewTag("");
      setNewGenre("");

      if (coverFile) {
        try {
          const uploaded = await apiUploadBookCover(created.id, coverFile);
          created = { ...created, cover_url: uploaded.cover_url };
        } catch (e: any) {
          const msg = handleAdminError(e, () => handleAuthError("/admin/books"), () => router.replace("/"));
          if (msg) setErr(msg);
        }
      }

      setCoverFile(null);
      setCoverInputKey((k) => k + 1);

      // prepend new item
      setItems((prev) => [created, ...prev]);
    } catch (e: any) {
      const msg = handleAdminError(e, () => handleAuthError("/admin/books"), () => router.replace("/"));
      if (msg) setErr(msg);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(b: BookRow) {
    setEditingId(b.id);
    setEditTitle(b.title ?? "");
    setEditYear(b.published_year != null ? String(b.published_year) : "");
    setEditDesc(b.description ?? "");
    setEditAuthors(b.authors ?? []);
    setEditTags(b.tags ?? []);
    setEditGenres(b.genres ?? []);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditYear("");
    setEditDesc("");
    setEditAuthors([]);
    setEditTags([]);
    setEditGenres([]);
  }

  async function saveEdit(bookId: number) {
    setErr(null);
    setRowBusyId(bookId);

    const t = editTitle.trim();
    if (!t) {
      setErr("Title cannot be empty.");
      setRowBusyId(null);
      return;
    }

    const y = editYear.trim() ? Number(editYear.trim()) : null;
    if (editYear.trim() && !Number.isFinite(y)) {
      setErr("Published year must be a number.");
      setRowBusyId(null);
      return;
    }

    try {
      const updated = await apiPatchAdminBook(bookId, {
        title: t,
        description: editDesc.trim() ? editDesc.trim() : null,
        published_year: y,
        author_ids: editAuthors.map((a) => a.id), // always replace authors when saving edit
        tag_ids: editTags.map((t) => t.id),
        genre_ids: editGenres.map((g) => g.id),
      });

      setItems((prev) => prev.map((x) => (x.id === bookId ? updated : x)));
      cancelEdit();
    } catch (e: any) {
      const msg = handleAdminError(e, () => handleAuthError("/admin/books"), () => router.replace("/"));
      if (msg) setErr(msg);
    } finally {
      setRowBusyId(null);
    }
  }

  async function onDelete(b: BookRow) {
    setErr(null);
    setRowBusyId(b.id);

    const prev = items;
    setItems((p) => p.filter((x) => x.id !== b.id));

    try {
      await apiDeleteAdminBook(b.id);
    } catch (e: any) {
      setItems(prev); // revert
      const msg = handleAdminError(e, () => handleAuthError("/admin/books"), () => router.replace("/"), {
        ignoreNotFound: true,
      });
      if (msg) setErr(msg);
    } finally {
      setRowBusyId(null);
    }
  }

  async function onUploadCover(bookId: number, file: File) {
    setErr(null);
    setCoverBusyId(bookId);
    try {
      const updated = await apiUploadBookCover(bookId, file);
      setItems((prev) => prev.map((x) => (x.id === bookId ? { ...x, cover_url: updated.cover_url } : x)));
    } catch (e: any) {
      const msg = handleAdminError(e, () => handleAuthError("/admin/books"), () => router.replace("/"));
      if (msg) setErr(msg);
    } finally {
      setCoverBusyId(null);
    }
  }

  async function onCreateTag() {
    const name = newTag.trim();
    if (!name) return;

    setErr(null);
    setTagBusy(true);
    try {
      const created = await apiCreateTag(name);
      if (!tagValue.some((t) => t.id === created.id)) {
        setTagValue((prev) => [...prev, created]);
      }
      setNewTag("");
    } catch (e: any) {
      const msg = handleAdminError(e, () => handleAuthError("/admin/books"), () => router.replace("/"));
      if (msg) setErr(msg);
    } finally {
      setTagBusy(false);
    }
  }

  async function onCreateGenre() {
    const name = newGenre.trim();
    if (!name) return;

    setErr(null);
    setGenreBusy(true);
    try {
      const created = await apiCreateGenre(name);
      if (!genreValue.some((g) => g.id === created.id)) {
        setGenreValue((prev) => [...prev, created]);
      }
      setNewGenre("");
    } catch (e: any) {
      const msg = handleAdminError(e, () => handleAuthError("/admin/books"), () => router.replace("/"));
      if (msg) setErr(msg);
    } finally {
      setGenreBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap space-y-4 gap-5">
      <div className="flex flex-col w-full">
        <div className="flex items-center">
          <h1 className="text-xl font-semibold">Admin · Books</h1>
        </div>

        <div className="flex items-center">
          <input
            className="input w-full max-w-md"
            placeholder="Search books…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-col flex-1">
        <Panel as="form" onSubmit={onCreate} className="space-y-2 w-full" padding="sm">
          <div className="font-medium">Add book</div>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Title</legend>
            <input
              className="input w-full"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={saving}
            />
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Published year</legend>
            <input
              className="input w-full"
              placeholder="Published year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              disabled={saving}
            />
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Description</legend>
            <textarea
              className="input h-24 w-full"
              placeholder="Description"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              disabled={saving}
            />
            <span className="label">Optional</span>
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Authors</legend>
            <AuthorPicker
              value={authorValue}
              onChangeAction={setAuthorValue}
              onAuthErrorAction={() => handleAuthError("/admin/books")}
              onForbiddenAction={() => router.replace("/")}
            />
          </fieldset>

          <div className="divider"></div>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Tags</legend>
            <TagPicker
              value={tagValue}
              onChangeAction={setTagValue}
              onAuthErrorAction={() => handleAuthError("/admin/books")}
              onForbiddenAction={() => router.replace("/")}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                className="input w-full max-w-sm"
                placeholder="New tag…"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                disabled={tagBusy || saving}
              />
              <Button
                type="button"
                variant="outline"
                onClick={onCreateTag}
                disabled={tagBusy || saving || !newTag.trim()}
              >
                {tagBusy ? "Adding…" : "Add tag"}
              </Button>
            </div>
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Genres</legend>
            <GenrePicker
              value={genreValue}
              onChangeAction={setGenreValue}
              onAuthErrorAction={() => handleAuthError("/admin/books")}
              onForbiddenAction={() => router.replace("/")}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                className="input w-full max-w-sm"
                placeholder="New genre…"
                value={newGenre}
                onChange={(e) => setNewGenre(e.target.value)}
                disabled={genreBusy || saving}
              />
              <Button
                type="button"
                variant="outline"
                onClick={onCreateGenre}
                disabled={genreBusy || saving || !newGenre.trim()}
              >
                {genreBusy ? "Adding…" : "Add genre"}
              </Button>
            </div>
          </fieldset>

          <div className="divider"></div>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Cover image</legend>
            <input
              key={coverInputKey}
              type="file"
              accept="image/*"
              onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
              disabled={saving}
              className="block file-input"
            />
          </fieldset>

          <div className="divider"></div>

          <Button type="submit" variant="outline" className="w-full" disabled={saving || !title.trim()}>
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
        {items.map((b) => {
          const isEditing = editingId === b.id;
          const busy = rowBusyId === b.id;
          const coverBusy = coverBusyId === b.id;

          return (
            <Panel key={b.id} padding="md">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <div className="flex flex-col items-center gap-2">
                    {b.cover_url ? (
                      <img
                        src={mediaUrl(b.cover_url) ?? ""}
                        alt={`${b.title} cover`}
                        className="h-16 w-12 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-12 items-center justify-center rounded border text-[10px] opacity-60">
                        —
                      </div>
                    )}

                    <label className="cursor-pointer text-xs underline">
                      {coverBusy ? "Uploading…" : "Upload"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={coverBusy}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          void onUploadCover(b.id, file);
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="text-xs opacity-60">ID {b.id}</div>
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          className="border rounded px-2 py-1 w-full"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          disabled={busy}
                          placeholder="Title"
                        />
                        <textarea
                          className="border rounded px-2 py-1 w-full min-h-22.5"
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          disabled={busy}
                          placeholder="Description"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="text-lg font-medium">{b.title}</div>
                        {b.description ? <div className="opacity-80">{b.description}</div> : null}
                      </>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button onClick={cancelEdit} disabled={busy} type="button" variant="info" size="sm">
                        Cancel
                      </Button>
                      <Button
                        onClick={() => saveEdit(b.id)}
                        disabled={busy || !editTitle.trim()}
                        type="button"
                        variant="success"
                        size="sm"
                      >
                        {busy ? "Saving…" : "Save"}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button onClick={() => startEdit(b)} disabled={busy} type="button" variant="info" size="sm">
                        Edit
                      </Button>
                      <Button
                        onClick={() => {
                          const el = document.getElementById(`delete-book-${b.id}`) as HTMLDialogElement | null;
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
                        id={`delete-book-${b.id}`}
                        title="Delete book"
                        description={`Delete "${b.title}"? This cannot be undone.`}
                        confirmLabel="Delete"
                        confirmVariant="error"
                        onConfirmAction={() => onDelete(b)}
                        busy={busy}
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm">
                <div>
                  <span className="opacity-70">Published year:</span>{" "}
                  {isEditing ? (
                    <input
                      className="border rounded px-2 py-1 w-35"
                      value={editYear}
                      onChange={(e) => setEditYear(e.target.value)}
                      disabled={busy}
                      placeholder="Year"
                    />
                  ) : (
                    b.published_year ?? "—"
                  )}
                </div>

                <div>
                  <div className="opacity-70">Authors</div>
                  {isEditing ? (
                    <AuthorPicker
                      value={editAuthors}
                      onChangeAction={setEditAuthors}
                      onAuthErrorAction={() => handleAuthError("/admin/books")}
                      onForbiddenAction={() => router.replace("/")}
                    />
                  ) : (
                    <div>{b.authors?.map((a) => a.name).join(", ") || "—"}</div>
                  )}
                </div>

                <div>
                  <div className="opacity-70">Tags</div>
                  {isEditing ? (
                    <TagPicker
                      value={editTags}
                      onChangeAction={setEditTags}
                      onAuthErrorAction={() => handleAuthError("/admin/books")}
                      onForbiddenAction={() => router.replace("/")}
                    />
                  ) : (
                    <div>{b.tags?.map((t) => t.name).join(", ") || "—"}</div>
                  )}
                </div>

                <div>
                  <div className="opacity-70">Genres</div>
                  {isEditing ? (
                    <GenrePicker
                      value={editGenres}
                      onChangeAction={setEditGenres}
                      onAuthErrorAction={() => handleAuthError("/admin/books")}
                      onForbiddenAction={() => router.replace("/")}
                    />
                  ) : (
                    <div>{b.genres?.map((g) => g.name).join(", ") || "—"}</div>
                  )}
                </div>

                <div className="text-xs opacity-60">Created {new Date(b.created_at).toLocaleString()}</div>
              </div>
            </Panel>
          );
        })}

        {!loading && items.length === 0 && (
          <Panel className="text-sm opacity-70" padding="md">
            No books found.
          </Panel>
        )}
      </div>
    </div>
  );
}
