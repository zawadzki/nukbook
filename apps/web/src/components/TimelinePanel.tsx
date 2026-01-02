"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiSend } from "@/lib/api";
import { getToken } from "@/lib/auth";
import Button from "@/components/Button";
import { ChevronRightIcon } from "@heroicons/react/16/solid";
import Panel from "@/components/Panel";
import SurfaceCard from "@/components/SurfaceCard";
import BookCover from "@/components/BookCover";

type TimelineItem = {
  id: number;
  status: "want_to_read" | "reading" | "finished" | "dropped";
  started_at?: string | null;
  finished_at?: string | null;
  updated_at: string;
  book: {
    id: number;
    title: string;
    cover_url?: string | null;
    authors?: { id: number; name: string }[];
  };
};

const STATUS_LABELS: Record<TimelineItem["status"], string> = {
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

export default function TimelinePanel() {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<TimelineItem[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [edits, setEdits] = useState<
    Record<number, { started: string; finished: string; saving: boolean; message?: string }>
  >({});
  const [editingId, setEditingId] = useState<number | null>(null);

  const token = useMemo(() => getToken(), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!token) {
        setItems(null);
        return;
      }

      setStatus(null);
      try {
        const data = await apiGet<TimelineItem[]>("/me/timeline", "browser", undefined, token);
        if (!cancelled) setItems(data);
      } catch (e: any) {
        if (!cancelled) setStatus(e?.message ?? "Failed to load timeline");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  function getEdit(item: TimelineItem) {
    const fallback = {
      started: item.started_at ?? "",
      finished: item.finished_at ?? "",
      saving: false,
      message: undefined as string | undefined,
    };
    return edits[item.id] ?? fallback;
  }

  function updateEdit(itemId: number, patch: Partial<{ started: string; finished: string }>) {
    setEdits((prev) => ({
      ...prev,
      [itemId]: {
        started: prev[itemId]?.started ?? "",
        finished: prev[itemId]?.finished ?? "",
        saving: prev[itemId]?.saving ?? false,
        message: prev[itemId]?.message,
        ...patch,
      },
    }));
  }

  async function saveDates(item: TimelineItem) {
    const current = getEdit(item);
    setEdits((prev) => ({
      ...prev,
      [item.id]: { ...current, saving: true, message: undefined },
    }));

    try {
      const started_at = current.started ? current.started : null;
      const finished_at = current.finished ? current.finished : null;

      await apiSend(
        `/books/${item.book.id}/status`,
        "browser",
        "POST",
        { status: item.status, started_at, finished_at },
        token
      );

      setEdits((prev) => ({
        ...prev,
        [item.id]: { ...current, saving: false, message: "Saved" },
      }));
      setEditingId(null);

      setItems((prev) =>
        (prev ?? []).map((x) =>
          x.id === item.id ? { ...x, started_at: started_at ?? undefined, finished_at: finished_at ?? undefined } : x
        )
      );
    } catch (e: any) {
      setEdits((prev) => ({
        ...prev,
        [item.id]: { ...current, saving: false, message: e?.message ?? "Failed to save" },
      }));
    }
  }

  if (!mounted) {
    return (
      <Panel as="section" padding="lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Your timeline</h2>
          <span className="loading loading-dots loading-md"></span>
        </div>
      </Panel>
    );
  }

  return (
    <Panel as="section" padding="lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Your timeline</h2>
        <a className="btn btn-soft hover:btn-primary btn-sm" href="/books">
          Browse books
          <ChevronRightIcon className="w-5 h-5"/>
        </a>
      </div>

      {!token ? (
        <p className="mt-2 text-sm text-ctp-subtext0">Login to see your reading timeline.</p>
      ) : status ? (
        <p className="mt-2 text-sm text-ctp-subtext0">{status}</p>
      ) : items && items.length === 0 ? (
        <p className="mt-2 text-sm text-ctp-subtext0">No timeline entries yet.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {(items ?? []).map((item) => {
            const started = formatDate(item.started_at);
            const finished = formatDate(item.finished_at);
            const edit = getEdit(item);
            const isEditing = editingId === item.id;
            const showStart = item.status !== "want_to_read";
            const showFinish = item.status === "finished" || item.status === "dropped";
            const authors = item.book.authors ?? [];

            return (
              <SurfaceCard as="li" key={item.id} padding="md">
                <div className="flex flex-wrap items-start gap-4">
                  <BookCover
                    coverUrl={item.book.cover_url}
                    title={item.book.title}
                    className="h-16 w-12"
                    placeholder="No cover"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <a href={`/books/${item.book.id}`} className="text-lg font-semibold hover:underline">
                        {item.book.title}
                      </a>
                      <span className={STATUS_LABELS[item.status] === "Finished" ? "badge badge-outline badge-xs badge-success" : "badge badge-outline badge-xs badge-info"}>
                        {STATUS_LABELS[item.status]}
                      </span>
                    </div>

                    {authors.length ? (
                      <div className="text-sm text-ctp-subtext0">
                        {authors.map((a, index) => (
                          <span key={a.id}>
                            <a href={`/authors/${a.id}`} className="hover:underline">
                              {a.name}
                            </a>
                            {index < authors.length - 1 ? ", " : ""}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {showStart && (started || finished) ? (
                      <div className="mt-2 text-xs text-ctp-subtext0">
                        {started ? <span>Started {started}</span> : null}
                        {showFinish && finished ? <span>{started ? " · " : ""}Finished {finished}</span> : null}
                      </div>
                    ) : null}

                    {item.status !== "want_to_read" ? (
                      <div className="mt-3 flex flex-wrap items-end gap-3 text-xs">
                        {!isEditing ? (
                          <Button
                            type="button"
                            onClick={() => setEditingId(item.id)}
                            variant="outline"
                            size="xs"
                          >
                            Edit dates
                          </Button>
                        ) : (
                          <>
                            {showStart ? (
                              <label className="grid gap-1">
                                <span className="text-ctp-subtext0">Start date</span>
                                <input
                                  type="date"
                                  className="rounded-md border border-ctp-surface1 bg-ctp-base px-2 py-1 text-xs"
                                  value={edit.started}
                                  onChange={(e) => updateEdit(item.id, { started: e.target.value })}
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
                                  onChange={(e) => updateEdit(item.id, { finished: e.target.value })}
                                />
                              </label>
                            ) : null}

                            <Button
                              type="button"
                              onClick={() => saveDates(item)}
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
                          </>
                        )}

                        {edit.message ? <span className="text-ctp-subtext0">{edit.message}</span> : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </SurfaceCard>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
