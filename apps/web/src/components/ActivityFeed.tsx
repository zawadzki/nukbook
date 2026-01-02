"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/api";
import { getToken } from "@/lib/auth";
import StarRating from "@/components/StarRating";
import Panel from "@/components/Panel";
import SurfaceCard from "@/components/SurfaceCard";
import BookCover from "@/components/BookCover";
import Avatar from "@/components/Avatar";
import {ChevronRightIcon} from "@heroicons/react/16/solid";

type ActivityItem = {
  type: "status" | "review";
  user: { id: number; username: string; avatar_url?: string | null };
  book: { id: number; title: string; cover_url?: string | null; authors?: { id: number; name: string }[] };
  status?: "want_to_read" | "reading" | "finished" | "dropped" | null;
  rating?: number | null;
  body?: string | null;
  updated_at: string;
};

const STATUS_LABELS: Record<string, string> = {
  want_to_read: "wants to read",
  reading: "started reading",
  finished: "finished",
  dropped: "dropped",
};

export default function ActivityFeed() {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);

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
        const data = await apiGet<ActivityItem[]>("/me/activity?limit=5&offset=0", "browser", undefined, token);
        if (!cancelled) setItems(data);
      } catch (e: any) {
        if (!cancelled) setStatus(e?.message ?? "Failed to load activity");
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
          <h2 className="text-lg font-semibold">Activity</h2>
          <span className="text-sm text-ctp-subtext0">Loading…</span>
        </div>
      </Panel>
    );
  }

  if (!token) return null;

  return (
    <Panel as="section" padding="lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Activity</h2>
        <a className="btn btn-soft hover:btn-primary btn-sm" href="/notifications">
          All notifications
          <ChevronRightIcon className="w-5 h-5"/>
        </a>
      </div>

      {status ? (
        <p className="mt-2 text-sm text-ctp-subtext0">{status}</p>
      ) : items && items.length === 0 ? (
        <p className="mt-2 text-sm text-ctp-subtext0">No activity yet.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {(items ?? []).map((item, idx) => (
            <SurfaceCard as="li" key={`${item.type}-${item.user.id}-${item.book.id}-${idx}`} padding="sm">
              <div className="flex gap-3">
                <BookCover
                  coverUrl={item.book.cover_url}
                  title={item.book.title}
                  className="h-12 w-9"
                />

                <div className="min-w-0 flex-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Avatar src={item.user.avatar_url} username={item.user.username} size="xxs" />
                    <a href={`/users/${item.user.id}`} className="font-medium hover:underline">
                      @{item.user.username}
                    </a>
                    {item.type === "status" ? (
                      <>
                        <span className="text-ctp-subtext0">{STATUS_LABELS[item.status ?? "reading"]}</span>
                        <a href={`/books/${item.book.id}`} className="font-medium hover:underline">
                          {item.book.title}
                        </a>
                      </>
                    ) : (
                      <>
                        <span className="text-ctp-subtext0">reviewed</span>
                        <a href={`/books/${item.book.id}`} className="font-medium hover:underline">
                          {item.book.title}
                        </a>
                      </>
                    )}
                  </div>

                  {item.rating ? (
                    <div className="mt-1 text-xs text-ctp-subtext0">
                      <StarRating value={item.rating} size="xs" />
                    </div>
                  ) : null}

                  {item.body ? <div className="mt-1 text-xs text-ctp-subtext0">{item.body}</div> : null}
                </div>
              </div>
            </SurfaceCard>
          ))}
        </ul>
      )}
    </Panel>
  );
}
