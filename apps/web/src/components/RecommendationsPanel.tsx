"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/api";
import { getToken } from "@/lib/auth";
import Panel from "@/components/Panel";
import SurfaceCard from "@/components/SurfaceCard";
import BookCover from "@/components/BookCover";
import StarRatingAvg from "@/components/StarRatingAvg";
import {ChevronRightIcon} from "@heroicons/react/16/solid";

type Book = {
  id: number;
  title: string;
  cover_url?: string | null;
  rating_avg?: number | null;
  rating_count: number;
  authors: { id: number; name: string }[];
};

type Section = {
  seed: Book;
  items: Book[];
};

export default function RecommendationsPanel() {
  const [mounted, setMounted] = useState(false);
  const [sections, setSections] = useState<Section[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const token = useMemo(() => getToken(), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!token) {
        setSections(null);
        return;
      }

      setStatus(null);
      try {
        const data = await apiGet<Section[]>("/me/recommendations/sections?sections=1&per=2", "browser", undefined, token);
        if (!cancelled) setSections(data);
      } catch (e: any) {
        if (!cancelled) setStatus(e?.message ?? "Failed to load recommendations");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!mounted) {
    return (
      <Panel as="section" padding="lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Recommendations</h2>
          <span className="text-sm text-ctp-subtext0">Loading…</span>
        </div>
      </Panel>
    );
  }

  if (!token) return null;

  const visibleSections = (sections ?? []).filter((section) => section.items.length > 0);

  return (
    <Panel as="section" padding="lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Recommendations</h2>
        <a className="btn btn-soft hover:btn-primary btn-sm" href="/discover">
          Discover
          <ChevronRightIcon className="w-5 h-5"/>
        </a>
      </div>

      {status ? (
        <p className="mt-2 text-sm text-ctp-subtext0">{status}</p>
      ) : sections && sections.length === 0 ? (
        <p className="mt-2 text-sm text-ctp-subtext0">Rate and finish books to get recommendations.</p>
      ) : visibleSections.length === 0 ? (
        <p className="mt-2 text-sm text-ctp-subtext0">Rate and finish books to get recommendations.</p>
      ) : (
        <div className="mt-3 space-y-4">
          {visibleSections.map((section, idx) => (
            <div key={`${section.seed.id}-${idx}`} className="space-y-2">
              <div className="text-sm text-ctp-subtext0">
                Because you liked{" "}
                <a className="text-ctp-text hover:underline" href={`/books/${section.seed.id}`}>
                  {section.seed.title}
                </a>
              </div>

              <ul className="grid gap-3 md:grid-cols-2">
                {section.items.map((b) => (
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
                          <div className="text-xs text-ctp-subtext0">
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
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
