"use client";

import { useEffect, useMemo, useState } from "react";
import { getToken } from "@/lib/auth";
import { apiGet, apiSend } from "@/lib/api";
import { pushToast } from "@/lib/toast";
import { TrashIcon, PencilSquareIcon, XMarkIcon, CheckIcon } from "@heroicons/react/24/outline";
import Button from "@/components/Button";
import Panel from "@/components/Panel";

type Shelf = {
  id: number;
  name: string;
  is_system: boolean;
  visibility: "public" | "followers" | "private";
  book_count?: number;
};

const LABELS: Record<string, string> = {
  "want-to-read": "Want to read",
  reading: "Reading",
  read: "Read",
  dropped: "Dropped",
};

function displayName(name: string) {
  return LABELS[name] ?? name;
}

export default function ShelvesPage() {
  const [shelves, setShelves] = useState<Shelf[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newVisibility, setNewVisibility] = useState<"public" | "followers" | "private">("private");
  const [busy, setBusy] = useState(false);

  // rename UI
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editVisibility, setEditVisibility] = useState<"public" | "followers" | "private">("private");

  const token = useMemo(() => getToken(), []);

  async function load() {
    setStatus(null);

    if (!token) {
      setStatus("Login to view your shelves.");
      setShelves(null);
      return;
    }

    try {
      const data = await apiGet<Shelf[]>("/shelves", "browser", undefined, token);
      setShelves(data);
    } catch (e: any) {
      setStatus(e?.message ?? "Failed to load shelves");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createShelf() {
    setStatus(null);
    setBusy(true);
    try {
      if (!token) {
        setStatus("Login first.");
        return;
      }

      const name = newName.trim();
      if (!name) {
        setStatus("Shelf name required.");
        return;
      }

      await apiSend("/shelves", "browser", "POST", {name, visibility: newVisibility}, token);

      setNewName("");
      setNewVisibility("private");
      await load();
    } catch (e: any) {
      setStatus(e?.message ?? "Failed to create shelf");
    } finally {
      setBusy(false);
    }
  }

  async function deleteShelf(id: number) {
    if (!token || !shelves) return;

    setStatus(null);
    setBusy(true);

    // optimistic remove
    const prev = shelves;
    setShelves(prev.filter((s) => s.id !== id));

    try {
      await apiSend(`/shelves/${id}`, "browser", "DELETE", undefined, token);
    } catch (e: any) {
      setShelves(prev); // rollback
      setStatus(e?.message ?? "Failed to delete shelf");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(s: Shelf) {
    setEditingId(s.id);
    setEditName(s.name);
    setEditVisibility(s.visibility);
    setStatus(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditVisibility("private");
  }

  async function saveEdit(id: number) {
    if (!token || !shelves) return;

    const name = editName.trim();
    if (!name) {
      setStatus("Shelf name required.");
      return;
    }

    setStatus(null);
    setBusy(true);

    const prev = shelves;
    // optimistic rename
    setShelves(prev.map((s) => (s.id === id ? {...s, name} : s)));

    try {
      await apiSend(`/shelves/${id}`, "browser", "PATCH", {name, visibility: editVisibility}, token);
      cancelEdit();
      await load();
    } catch (e: any) {
      setShelves(prev);
      setStatus(e?.message ?? "Failed to rename shelf");
    } finally {
      setBusy(false);
    }
  }

  async function updateVisibility(id: number, visibility: "public" | "followers" | "private") {
    if (!token || !shelves) return;

    setStatus(null);
    setBusy(true);

    const prev = shelves;
    setShelves(prev.map((s) => (s.id === id ? {...s, visibility} : s)));

    try {
      await apiSend(`/shelves/${id}`, "browser", "PATCH", {visibility}, token);
      pushToast({ message: "Shelf visibility updated.", variant: "success" });
      await load();
    } catch (e: any) {
      setShelves(prev);
      setStatus(e?.message ?? "Failed to update visibility");
      pushToast({ message: "Failed to update shelf visibility.", variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
      <main className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-2xl font-semibold">My shelves</h1>
          <a className="text-sm text-ctp-subtext0 hover:text-ctp-mauve-500" href="/books">
            Browse books
          </a>
        </div>

        <Panel padding="md">
          <h2 className="text-sm font-semibold text-ctp-text">Create a shelf</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Favorites, Sci-fi, 2026 goals…"
                className="w-80 max-w-full rounded-md border border-ctp-surface0 bg-ctp-mantle px-3 py-2 text-sm outline-none placeholder:text-ctp-text focus:border-ctp-surface1"
            />
            <select
                value={newVisibility}
                onChange={(e) => setNewVisibility(e.target.value as "public" | "followers" | "private")}
                className="rounded-md border border-ctp-surface0 bg-ctp-mantle px-3 py-2 text-sm outline-none"
            >
              <option value="private">Private</option>
              <option value="followers">Followers</option>
              <option value="public">Public</option>
            </select>
            <Button onClick={createShelf} disabled={busy} variant="primary">
              Create
            </Button>
          </div>
          {status ? <p className="mt-2 text-sm text-ctp-subtext0">{status}</p> : null}
        </Panel>

        {shelves ? (
            <ul className="space-y-3">
              {shelves.map((s) => {
                const isEditing = editingId === s.id;
                return (
                    <Panel as="li" key={s.id} padding="md">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {!isEditing ? (
                              <a className="text-lg font-semibold hover:underline" href={`/shelves/${s.id}`}>
                                {displayName(s.name)}
                              </a>
                          ) : (
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-72 max-w-full rounded-md border border-ctp-surface0 bg-ctp-mantle px-3 py-2 text-sm outline-none focus:border-ctp-surface1"
                                    autoFocus
                                />
                                <Button
                                    onClick={() => saveEdit(s.id)}
                                    disabled={busy}
                                    variant="mantle"
                                    size="icon"
                                    title="Save"
                                    aria-label="Save"
                                >
                                  <CheckIcon className="h-5 w-5"/>
                                </Button>
                                <Button
                                    onClick={cancelEdit}
                                    disabled={busy}
                                    variant="mantle"
                                    size="icon"
                                    title="Cancel"
                                    aria-label="Cancel"
                                >
                                  <XMarkIcon className="h-5 w-5"/>
                                </Button>
                              </div>
                          )}

                          {s.is_system ? <div className="mt-1 text-xs text-ctp-subtext0">System shelf</div> : null}
                          <div className="mt-2 text-sm">
                            <label className="text-xs text-ctp-subtext0">Visibility</label>
                            <select
                              value={isEditing ? editVisibility : s.visibility}
                              onChange={(e) => {
                                const value = e.target.value as "public" | "followers" | "private";
                                if (isEditing) {
                                  setEditVisibility(value);
                                } else {
                                  updateVisibility(s.id, value);
                                }
                              }}
                              className="ml-2 rounded-md border border-ctp-surface0 bg-ctp-mantle px-2 py-1 text-xs outline-none"
                              disabled={busy}
                            >
                              <option value="private">Private</option>
                              <option value="followers">Followers</option>
                              <option value="public">Public</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-sm text-ctp-subtext0">{s.book_count ?? 0} books</span>

                          {!s.is_system && !isEditing ? (
                              <Button
                                  onClick={() => startEdit(s)}
                                  disabled={busy}
                                  variant="mantle"
                                  size="icon"
                                  title="Rename shelf"
                                  aria-label="Rename shelf"
                              >
                                <PencilSquareIcon className="h-5 w-5"/>
                              </Button>
                          ) : null}

                          {!s.is_system && !isEditing ? (
                              <Button
                                  onClick={() => deleteShelf(s.id)}
                                  disabled={busy}
                                  variant="mantle"
                                  size="icon"
                                  title="Delete shelf"
                                  aria-label="Delete shelf"
                              >
                                <TrashIcon className="h-5 w-5"/>
                              </Button>
                          ) : null}
                        </div>
                      </div>
                    </Panel>
                );
              })}
            </ul>
        ) : null}
      </main>
  );
}
