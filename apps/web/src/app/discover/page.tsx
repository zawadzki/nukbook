"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/api";
import { getToken } from "@/lib/auth";
import StarRatingAvg from "@/components/StarRatingAvg";
import Button from "@/components/Button";
import SurfaceCard from "@/components/SurfaceCard";
import BookCover from "@/components/BookCover";

type Book = {
  id: number;
  title: string;
  cover_url?: string | null;
  rating_avg?: number | null;
  rating_count: number;
  authors: { id: number; name: string }[];
};

export default function DiscoverPage() {
  const token = useMemo(() => getToken(), []);
  const [mounted, setMounted] = useState(false);

  const [items, setItems] = useState<Book[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const limit = 12;

  async function load(reset = false) {
    if (!token) return;
    setStatus(null);
    setBusy(true);

    const nextOffset = reset ? 0 : offset;
    try {
      const data = await apiGet<Book[]>(
        `/me/recommendations?limit=${limit}&offset=${nextOffset}`,
        "browser",
        undefined,
        token
      );

      if (reset) {
        setItems(data);
      } else {
        setItems((prev) => [...prev, ...data]);
      }

      setOffset(nextOffset + data.length);
      if (data.length < limit) setDone(true);
    } catch (e: any) {
      setStatus(e?.message ?? "Failed to load recommendations");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (token) load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!mounted) {
    return (
      <main className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Discover</h1>
          <span className="text-sm text-ctp-subtext0">Loading…</span>
        </div>
      </main>
    );
  }

  if (!token) {
    return (
      <main className="space-y-4">
        <h1 className="text-2xl font-semibold">Discover</h1>
        <p className="text-ctp-subtext0">Login to get personalized recommendations.</p>
      </main>
    );
  }

  return (
    <main className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Discover</h1>
        <a className="btn hover:btn-primary btn-sm" href="/books">
          Browse books
        </a>
      </div>

      {status ? <p className="text-ctp-subtext0">{status}</p> : null}

      {items.length === 0 && !status ? (
        <p className="text-ctp-subtext0">Rate and finish books to get recommendations.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-3">
          {items.map((b) => (
            <SurfaceCard as="li" key={b.id} padding="sm">
              <div className="flex gap-3">
                <BookCover
                  coverUrl={b.cover_url}
                  title={b.title}
                  className="h-16 w-12"
                  placeholder="No cover"
                />

                <div className="min-w-0 flex-1">
                  <a className="font-medium hover:underline" href={`/books/${b.id}`}>
                    {b.title}
                  </a>
                  {b.authors?.length ? (
                    <div className="mt-0 text-sm text-ctp-subtext0">
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
                  <div className="mt-2 flex items-center gap-2 text-xs text-ctp-subtext0">
                    {b.rating_count > 0 && b.rating_avg != null ? (
                      <StarRatingAvg value={b.rating_avg} size="xs" />
                    ) : (
                      <span>No ratings</span>
                    )}
                  </div>
                </div>
              </div>
            </SurfaceCard>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <div className="flex justify-center">
          <Button
            type="button"
            onClick={() => load(false)}
            disabled={busy || done}
            variant="outline"
          >
            {done ? "No more results" : busy ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </main>
  );
}
