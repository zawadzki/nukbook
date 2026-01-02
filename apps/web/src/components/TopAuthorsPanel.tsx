"use client";

import { useEffect, useState } from "react";
import { HeartIcon } from "@heroicons/react/24/solid";
import { ChevronRightIcon } from "@heroicons/react/16/solid";
import { apiGet } from "@/lib/api";
import Panel from "@/components/Panel";
import SurfaceCard from "@/components/SurfaceCard";
import Avatar from "@/components/Avatar";

type TopAuthor = {
  id: number;
  name: string;
  photo_url?: string | null;
  likes_count: number;
};

function likeLabel(count: number) {
  return count === 1 ? "like" : "likes";
}

export default function TopAuthorsPanel() {
  const [mounted, setMounted] = useState(false);
  const [authors, setAuthors] = useState<TopAuthor[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setStatus(null);
      try {
        const data = await apiGet<TopAuthor[]>("/authors/top?limit=5", "browser");
        if (!cancelled) setAuthors(data);
      } catch (e: any) {
        if (!cancelled) setStatus(e?.message ?? "Failed to load top authors");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!mounted) {
    return (
      <Panel as="section" padding="lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Top authors</h2>
          <span className="text-sm text-ctp-subtext0">Loading…</span>
        </div>
      </Panel>
    );
  }

  return (
    <Panel as="section" padding="lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Top authors</h2>
        <a className="btn btn-soft hover:btn-primary btn-sm" href="/authors">
          See authors
          <ChevronRightIcon className="w-5 h-5"/>
        </a>
      </div>

      {status ? (
        <p className="mt-2 text-sm text-ctp-subtext0">{status}</p>
      ) : authors && authors.length === 0 ? (
        <p className="mt-2 text-sm text-ctp-subtext0">No liked authors yet.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {(authors ?? []).map((author) => (
            <SurfaceCard as="li" key={author.id} padding="sm">
              <div className="flex items-center gap-3">
                <Avatar src={author.photo_url} username={author.name} size="xs" />
                <div className="min-w-0 flex-1">
                  <a className="font-medium hover:underline" href={`/authors/${author.id}`}>
                    {author.name}
                  </a>
                  <div className="mt-1 flex items-center gap-1 text-xs text-ctp-subtext0">
                    <HeartIcon className="h-4 w-4 text-primary" />
                    <span>
                      {author.likes_count} {likeLabel(author.likes_count)}
                    </span>
                  </div>
                </div>
              </div>
            </SurfaceCard>
          ))}
        </ul>
      )}
    </Panel>
  );
}
