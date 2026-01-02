"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiSend } from "@/lib/api";
import { CheckIcon } from "@heroicons/react/24/outline";
import { emitShelvesUpdated } from "@/lib/events";
import { useBookShelves, type ShelfState } from "@/hooks/useBookShelves";
import { pushToast } from "@/lib/toast";
import Button from "@/components/Button";
import Panel from "@/components/Panel";

const SYSTEM_LABELS: Record<string, string> = {
  "want-to-read": "Want to read",
  reading: "Reading",
  read: "Read",
  dropped: "Dropped",
};

const SYSTEM_ORDER = ["want-to-read", "reading", "read", "dropped"] as const;

const STATUS_MAP: Record<string, "want_to_read" | "reading" | "finished" | "dropped"> = {
  "want-to-read": "want_to_read",
  reading: "reading",
  read: "finished",
  dropped: "dropped",
};

export default function ShelfPill({ bookId }: { bookId: number }) {
  const { token, shelves, status, setStatus, load } = useBookShelves(bookId);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);

  const systemShelves = useMemo(() => {
    if (!shelves) return [];
    const map = new Map<string, ShelfState>();
    shelves.forEach((s) => map.set(s.name, s));
    return SYSTEM_ORDER.map((k) => map.get(k)).filter(Boolean) as ShelfState[];
  }, [shelves]);

  const customShelves = useMemo(() => {
    return (shelves ?? [])
      .filter((s) => !s.is_system)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [shelves]);

  const activeSystem = useMemo(
    () => systemShelves.find((s) => s.has_book) ?? null,
    [systemShelves]
  );

  // Close on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  async function toggleSystemShelf(s: ShelfState) {
    setStatus(null);
    setBusy(true);
    try {
      if (!token) {
        setStatus("Login to use shelves.");
        return;
      }

      if (s.has_book) {
        await apiSend(`/shelves/${s.id}/books/${bookId}`, "browser", "DELETE", undefined, token);
        await apiSend(`/books/${bookId}/status`, "browser", "DELETE", undefined, token);
        pushToast({ message: `Removed from ${SYSTEM_LABELS[s.name] ?? s.name}.`, variant: "info" });
      } else {
        await apiSend(`/shelves/${s.id}/books/${bookId}`, "browser", "POST", undefined, token);
        await apiSend(`/books/${bookId}/status`, "browser", "POST", { status: STATUS_MAP[s.name] }, token);
        pushToast({ message: `Added to ${SYSTEM_LABELS[s.name] ?? s.name}.`, variant: "success" });
      }

      await load();
      emitShelvesUpdated(bookId);
      setOpen(false);
    } catch (e: any) {
      setStatus(e?.message ?? "Failed to update shelf");
      pushToast({ message: "Failed to update shelf.", variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function toggleCustomShelf(s: ShelfState) {
    setStatus(null);
    setBusy(true);
    try {
      if (!token) {
        setStatus("Login to use shelves.");
        return;
      }

      if (s.has_book) {
        await apiSend(`/shelves/${s.id}/books/${bookId}`, "browser", "DELETE", undefined, token);
      } else {
        await apiSend(`/shelves/${s.id}/books/${bookId}`, "browser", "POST", undefined, token);
      }

      await load();
      emitShelvesUpdated(bookId);
    } catch (e: any) {
      setStatus(e?.message ?? "Failed to update shelf");
      pushToast({ message: "Failed to update shelf.", variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  const customCount = useMemo(() => {
    if (!shelves) return 0;
    return shelves.filter((s) => !s.is_system && s.has_book).length;
  }, [shelves]);

  const baseLabel = activeSystem ? (SYSTEM_LABELS[activeSystem.name] ?? activeSystem.name) : "Shelf";
  const pillLabel = customCount > 0 ? `${baseLabel} · +${customCount}` : baseLabel;

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        onClick={() => setOpen((v) => !v)}
        variant="neutral"
        size="xs"
        radius="full"
        className={[
          activeSystem
            ? "btn-primary"
            : "btn-outline",
        ].join(" ")}
        title="Change shelf"
      >
        {pillLabel}
      </Button>

      {open ? (
        <Panel className="absolute right-0 z-20 mt-2 w-72 shadow-lg" padding="xs">
          {!shelves ? (
            <div className="p-2 text-xs text-ctp-subtext0">
              Login to use shelves.{" "}
              <a className="text-ctp-text hover:underline" href="/login">
                Login
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              {/* System shelf */}
              <div className="px-2 pt-1 text-xs font-semibold text-ctp-subtext0">System shelf</div>
              <div className="space-y-1">
                {systemShelves.map((s) => {
                  const isActive = s.has_book;
                  const text = SYSTEM_LABELS[s.name] ?? s.name;

                  return (
                    <Button
                      key={s.id}
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        void toggleSystemShelf(s);
                      }}
                      variant="basic"
                      size="md"
                      className={[
                        "btn w-full justify-start",
                        isActive ? "btn-primary" : "btn-ghost",
                        busy ? "opacity-60" : "",
                      ].join(" ")}
                    >
                      <span>{text}</span>
                    </Button>
                  );
                })}

                <div className="my-2 h-px bg-ctp-surface1" />

                <Button
                  type="button"
                  disabled={busy || !activeSystem}
                  onClick={() => {
                    if (!activeSystem) return;
                    void toggleSystemShelf(activeSystem);
                  }}
                  variant="ghost"
                  size="md"
                  className="w-full text-left"
                >
                  Clear system shelf
                </Button>
              </div>

              <div className="my-2 h-px bg-ctp-surface1" />

              {/* Custom shelves */}
              <div className="flex items-center justify-between px-2 pt-1">
                <div className="text-xs font-semibold text-ctp-subtext0">Custom shelves</div>
                <a className="btn btn-sm btn-ghost" href="/shelves">
                  Manage
                </a>
              </div>

              {customShelves.length === 0 ? (
                <div className="px-2 py-2 text-xs text-ctp-subtext0">
                  No custom shelves yet.{" "}
                  <a className="text-ctp-text hover:underline" href="/shelves">
                    Create one →
                  </a>
                </div>
              ) : (
                <div className="max-h-64 space-y-1 overflow-auto px-1">
                  {customShelves.map((s) => (
                    <Button
                      key={s.id}
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        void toggleCustomShelf(s);
                      }}
                      variant="ghost"
                      size="md"
                      className={[
                        "btn flex w-full items-center justify-between",
                        busy ? "opacity-60" : "",
                      ].join(" ")}
                      title={s.name}
                    >
                      <span className="truncate">{s.name}</span>

                      <span
                        className={[
                          "ml-2 inline-flex h-5 w-5 items-center justify-center rounded border",
                          s.has_book ? "border-ctp-text bg-ctp-text text-ctp-base" : "border-ctp-surface0 bg-ctp-base text-transparent",
                        ].join(" ")}
                        aria-hidden="true"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </span>
                    </Button>
                  ))}
                </div>
              )}

              {status ? <div className="px-2 py-1 text-xs text-ctp-subtext0">{status}</div> : null}
            </div>
          )}
        </Panel>
      ) : null}
    </div>
  );
}
