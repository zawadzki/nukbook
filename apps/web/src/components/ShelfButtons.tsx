"use client";

import { useMemo, useState } from "react";
import { apiSend } from "@/lib/api";
import { emitShelvesUpdated } from "@/lib/events";
import { useBookShelves, type ShelfState } from "@/hooks/useBookShelves";
import { pushToast } from "@/lib/toast";
import Button from "@/components/Button";
import Panel from "@/components/Panel";

const LABELS: Record<string, string> = {
  "want-to-read": "Want to read",
  reading: "Reading",
  read: "Read",
  dropped: "Dropped",
};

function displayName(name: string) {
  return LABELS[name] ?? name;
}

const STATUS_MAP: Record<string, "want_to_read" | "reading" | "finished" | "dropped"> = {
  "want-to-read": "want_to_read",
  reading: "reading",
  read: "finished",
  dropped: "dropped",
};

export default function ShelfButtons({bookId}: { bookId: number }) {
  const {token, shelves, setShelves, status, setStatus} = useBookShelves(bookId);
  const [busyId, setBusyId] = useState<number | null>(null);

  const sorted = useMemo(() => {
    if (!shelves) return null;
    return [...shelves].sort((a, b) => {
      if (a.is_system !== b.is_system) return a.is_system ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [shelves]);

  async function toggleShelf(shelf: ShelfState) {
    if (!token || !sorted) return;

    setStatus(null);
    setBusyId(shelf.id);

    const prev = sorted;
    const turningOn = !shelf.has_book;

    // optimistic update
    let next = prev.map((s) => (s.id === shelf.id ? {...s, has_book: turningOn} : s));

    // system exclusivity: if turning on a system shelf, turn off other system shelves
    const systemToTurnOff: number[] = [];
    if (turningOn && shelf.is_system) {
      next = next.map((s) => {
        if (s.is_system && s.id !== shelf.id && s.has_book) {
          systemToTurnOff.push(s.id);
          return {...s, has_book: false};
        }
        return s;
      });
    }

    // write back to shared shelves state
    setShelves(next);

    try {
      if (turningOn) {
        await apiSend(`/shelves/${shelf.id}/books/${bookId}`, "browser", "POST", undefined, token);

        // optional explicit deletes
        if (systemToTurnOff.length > 0) {
          await Promise.all(
              systemToTurnOff.map((sid) =>
                  apiSend(`/shelves/${sid}/books/${bookId}`, "browser", "DELETE", undefined, token).catch(() => null)
              )
          );
        }

        if (shelf.is_system && STATUS_MAP[shelf.name]) {
          await apiSend(`/books/${bookId}/status`, "browser", "POST", { status: STATUS_MAP[shelf.name] }, token);
        }
        pushToast({ message: `Added to ${displayName(shelf.name)}.`, variant: "success" });
      } else {
        await apiSend(`/shelves/${shelf.id}/books/${bookId}`, "browser", "DELETE", undefined, token);

        if (shelf.is_system) {
          await apiSend(`/books/${bookId}/status`, "browser", "DELETE", undefined, token);
        }
        pushToast({ message: `Removed from ${displayName(shelf.name)}.`, variant: "info" });
      }

      emitShelvesUpdated(bookId);
    } catch (e: any) {
      // rollback
      setShelves(prev);
      setStatus(e?.message ?? "Failed to update shelves");
      pushToast({ message: "Failed to update shelf.", variant: "error" });
    } finally {
      setBusyId(null);
    }
  }

  if (!sorted) {
    return status ? (
        <Panel as="section" padding="lg">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Shelves</h2>
            <a className="btn btn-soft hover:btn-primary btn-sm" href="/shelves">
              Manage shelves
            </a>
          </div>
          <p className="mt-2 text-sm text-ctp-subtext0">{status}</p>
        </Panel>
    ) : null;
  }

  return (
      <Panel as="section" padding="lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Shelves</h2>
          <a className="btn btn-soft hover:btn-primary btn-sm" href="/shelves">
            Manage shelves
          </a>
        </div>

        <div className="flex gap-2 mt-4">
          {sorted.map((s) => {
            const active = s.has_book;
            const busy = busyId === s.id;

            return (
                <Button
                    key={s.id}
                    onClick={() => toggleShelf(s)}
                    disabled={busyId != null}
                    variant="neutral"
                    size="none"
                    radius="md"
                    className={[
                      "join-item",
                      active
                          ? "btn-primary"
                          : "btn-neutral",
                    ].join(" ")}
                    title={s.is_system ? "System shelf (only one can be active)" : "Custom shelf"}
                    aria-pressed={active}
                >
              <span className="inline-flex items-center gap-2">
                {displayName(s.name)}
              </span>
                </Button>
            );
          })}
        </div>

        {status ? <p className="mt-2 text-sm text-ctp-subtext0">{status}</p> : null}
      </Panel>
  );
}
