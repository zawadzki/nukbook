"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { SHELVES_UPDATED } from "@/lib/events";

export type ShelfState = {
  id: number;
  name: string;
  is_system: boolean;
  has_book: boolean;
};

type ShelvesForBook = {
  book_id: number;
  shelves: ShelfState[];
};

export function useBookShelves(bookId: number) {
  const token = useMemo(() => getToken(), []);

  const [shelves, setShelves] = useState<ShelfState[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus(null);

    if (!token) {
      setShelves(null);
      return;
    }

    try {
      const data = await apiGet<ShelvesForBook>(`/shelves/book/${bookId}`, "browser", undefined, token);
      setShelves(data.shelves);
    } catch {
      setShelves(null);
    }
  }, [bookId, token]);

  useEffect(() => {
    if (!Number.isFinite(bookId)) return;
    load();
  }, [bookId, load]);

  // react to global shelves updates (e.g. other component toggled)
  useEffect(() => {
    function onUpdated(e: Event) {
      const ce = e as CustomEvent<{ bookId: number }>;
      if (ce.detail?.bookId === bookId) load();
    }
    window.addEventListener(SHELVES_UPDATED, onUpdated);
    return () => window.removeEventListener(SHELVES_UPDATED, onUpdated);
  }, [bookId, load]);

  return { token, shelves, setShelves, status, setStatus, load };
}
