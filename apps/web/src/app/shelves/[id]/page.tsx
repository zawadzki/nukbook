"use client";

import { use, useEffect, useMemo, useState } from "react";
import { getToken } from "@/lib/auth";
import { apiGet, apiSend } from "@/lib/api";
import { TrashIcon } from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
import Panel from "@/components/ui/Panel";
import BookCover from "@/components/ui/BookCover";
import {ChevronLeftIcon} from "@heroicons/react/16/solid";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type Shelf = { id: number; name: string; is_system: boolean; visibility: "public" | "followers" | "private" };
type Book = {
  id: number;
  title: string;
  published_year?: number | null;
  cover_url?: string | null;
  authors: { id: number; name: string }[];
  reading_status?: {
    status: "want_to_read" | "reading" | "finished" | "dropped";
    started_at?: string | null;
    finished_at?: string | null;
  } | null;
};

const LABELS: Record<string, string> = {
  "want-to-read": "Want to read",
  reading: "Reading",
  read: "Read",
  dropped: "Dropped",
};

const STATUS_LABELS: Record<string, string> = {
  want_to_read: "Want to read",
  reading: "Reading",
  finished: "Finished",
  dropped: "Dropped",
};

function formatDate(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(d);
}

export default function ShelfPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const p = typeof (params as any)?.then === "function" ? use(params as Promise<{ id: string }>) : (params as { id: string });
  const shelfId = Number.parseInt(String(p.id), 10);

  const [shelf, setShelf] = useState<Shelf | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [edits, setEdits] = useState<
    Record<number, { started: string; finished: string; saving: boolean; message?: string }>
  >({});
  const [editingId, setEditingId] = useState<number | null>(null);

  const token = useMemo(() => getToken(), []);

  async function load() {
    if (!token) {
      setStatus("Login to view this shelf.");
      return;
    }
    try {
      const data = await apiGet<{ shelf: Shelf; books: Book[] }>(`/shelves/${shelfId}/books`, "browser", undefined, token);
      setShelf(data.shelf);
      setBooks(data.books);
      setStatus(null);
    } catch (e: any) {
      setStatus(e?.message ?? "Failed to load shelf");
    }
  }

  useEffect(() => {
    if (Number.isFinite(shelfId)) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shelfId]);

  function getEdit(book: Book) {
    const fallback = {
      started: book.reading_status?.started_at ?? "",
      finished: book.reading_status?.finished_at ?? "",
      saving: false,
      message: undefined as string | undefined,
    };
    return edits[book.id] ?? fallback;
  }

  function updateEdit(bookId: number, patch: Partial<{ started: string; finished: string }>) {
    setEdits((prev) => ({
      ...prev,
      [bookId]: {
        started: prev[bookId]?.started ?? "",
        finished: prev[bookId]?.finished ?? "",
        saving: prev[bookId]?.saving ?? false,
        message: prev[bookId]?.message,
        ...patch,
      },
    }));
  }

  async function saveDates(book: Book) {
    if (!token || !book.reading_status) return;
    const current = getEdit(book);
    setEdits((prev) => ({
      ...prev,
      [book.id]: { ...current, saving: true, message: undefined },
    }));

    try {
      const started_at = current.started ? current.started : null;
      const finished_at = current.finished ? current.finished : null;

      await apiSend(
        `/books/${book.id}/status`,
        "browser",
        "POST",
        { status: book.reading_status.status, started_at, finished_at },
        token
      );

      setEdits((prev) => ({
        ...prev,
        [book.id]: { ...current, saving: false, message: "Saved" },
      }));
      setEditingId(null);

      setBooks((prev) =>
        prev.map((x) =>
          x.id === book.id
            ? (() => {
                if (!x.reading_status) return x;
                const currentStatus = x.reading_status;
                return {
                  ...x,
                  reading_status: {
                    ...currentStatus,
                    started_at: started_at ?? undefined,
                    finished_at: finished_at ?? undefined,
                  },
                };
              })()
            : x
        )
      );
    } catch (e: any) {
      setEdits((prev) => ({
        ...prev,
        [book.id]: { ...current, saving: false, message: e?.message ?? "Failed to save" },
      }));
    }
  }

  async function removeBook(bookId: number) {
    if (!token) return;

    setBusy(true);
    setStatus(null);

    // optimistic
    const prev = books;
    setBooks(prev.filter((b) => b.id !== bookId));

    try {
      await apiSend(`/shelves/${shelfId}/books/${bookId}`, "browser", "DELETE", undefined, token);
    } catch (e: any) {
      setBooks(prev);
      setStatus(e?.message ?? "Failed to remove book");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <a className="btn btn-outline btn-primary btn-sm rounded-full" href="/shelves">
            <ChevronLeftIcon className="w-5 h-5"/>
            Back to shelves
          </a>
          <h1 className="mt-2 text-2xl font-semibold">
            {shelf ? (LABELS[shelf.name] ?? shelf.name) : "Shelf"}
          </h1>
        </div>

        <a className="btn btn-outline btn-primary btn-sm rounded-full" href="/books">
          Browse books
        </a>
      </div>

      {status ? <p className="text-ctp-text">{status}</p> : null}

      {books.length === 0 && !status ? <p className="text-ctp-text">No books in this shelf yet.</p> : null}

      {books.length > 0 ? (
        <ul className="space-y-3">
          {books.map((b) => (
            <Panel as="li" key={b.id} padding="md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 flex-wrap items-start gap-4">
                  <BookCover
                    coverUrl={b.cover_url}
                    title={b.title}
                    className="h-16 w-12"
                    placeholder="No cover"
                    placeholderVariant="mantle"
                  />

                  <div className="min-w-0 flex-1">
                    <a className="text-lg font-semibold hover:underline" href={`/books/${b.id}`}>
                      {b.title}
                    </a>
                    {b.published_year ? <div className="text-sm text-ctp-subtext0">{b.published_year}</div> : null}
                  {b.authors?.length ? (
                    <div className="text-sm text-ctp-subtext0">
                      <span className="font-medium text-ctp-subtext0">Authors:</span>{" "}
                      {b.authors.map((a, index) => (
                        <span key={a.id}>
                          <a href={`/authors/${a.id}`} className="hover:underline">
                            {a.name}
                          </a>
                          {index < b.authors.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {b.reading_status ? (
                    <div className="mt-1 text-xs text-ctp-subtext0">
                      {(() => {
                        const showStart = b.reading_status.status !== "want_to_read";
                        const showFinish = b.reading_status.status === "finished" || b.reading_status.status === "dropped";
                        const started = formatDate(b.reading_status.started_at);
                        const finished = formatDate(b.reading_status.finished_at);
                        return (
                          <>
                      <span className="font-medium text-ctp-subtext0">
                        {STATUS_LABELS[b.reading_status.status] ?? b.reading_status.status}
                      </span>
                            {showStart && started ? <span> · Started {started}</span> : null}
                            {showFinish && finished ? <span> · Finished {finished}</span> : null}
                          </>
                        );
                      })()}
                    </div>
                  ) : null}

                  {b.reading_status ? (
                    <div className="mt-2 flex flex-wrap items-end gap-3 text-xs">
                      {(() => {
                        const showStart = b.reading_status.status !== "want_to_read";
                        const showFinish = b.reading_status.status === "finished" || b.reading_status.status === "dropped";
                        const canEdit = showStart || showFinish;
                        const edit = getEdit(b);
                        const isEditing = editingId === b.id;
                        if (!canEdit) return null;
                        if (!isEditing) {
                          return (
                            <Button
                              type="button"
                              onClick={() => setEditingId(b.id)}
                              variant="outline"
                              size="xs"
                            >
                              Edit dates
                            </Button>
                          );
                        }

                        return (
                          <>
                            {showStart ? (
                              <label className="grid gap-1">
                                <span className="text-ctp-subtext0">Start date</span>
                                <input
                                  type="date"
                                  className="rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-1 text-xs"
                                  value={edit.started}
                                  onChange={(e) => updateEdit(b.id, { started: e.target.value })}
                                />
                              </label>
                            ) : null}
                            {showFinish ? (
                              <label className="grid gap-1">
                                <span className="text-ctp-subtext0">Finish date</span>
                                <input
                                  type="date"
                                  className="rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-1 text-xs"
                                  value={edit.finished}
                                  onChange={(e) => updateEdit(b.id, { finished: e.target.value })}
                                />
                              </label>
                            ) : null}

                            <Button
                              type="button"
                              onClick={() => saveDates(b)}
                              disabled={edit.saving}
                              variant="outline"
                              size="xs"
                            >
                              {edit.saving ? "Saving…" : "Save"}
                            </Button>
                            <Button
                              type="button"
                              onClick={() => setEditingId(null)}
                              disabled={edit.saving}
                              variant="outline"
                              size="xs"
                            >
                              Cancel
                            </Button>
                            {edit.message ? <span className="text-ctp-subtext0">{edit.message}</span> : null}
                          </>
                        );
                      })()}
                    </div>
                  ) : null}
                </div>
              </div>

                <Button
                  onClick={() => {
                    const el = document.getElementById(`remove-shelf-book-${b.id}`) as HTMLDialogElement | null;
                    el?.showModal();
                  }}
                  disabled={busy}
                  variant="error"
                  size="icon"
                  title="Remove from shelf"
                  aria-label="Remove from shelf"
                >
                  <TrashIcon className="h-5 w-5" />
                </Button>
                <ConfirmDialog
                  id={`remove-shelf-book-${b.id}`}
                  title="Remove from shelf"
                  description={`Remove "${b.title}" from this shelf?`}
                  confirmLabel="Remove"
                  confirmVariant="warning"
                  onConfirmAction={() => removeBook(b.id)}
                  busy={busy}
                />
              </div>
            </Panel>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
