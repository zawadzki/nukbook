"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/api";
import { getToken } from "@/lib/auth";
import StarRating from "@/components/StarRating";
import Button from "@/components/Button";
import Panel from "@/components/Panel";
import Avatar from "@/components/Avatar";

type RequestItem = {
  id: number;
  requester: { id: number; username: string; avatar_url?: string | null };
  created_at: string;
};

type ActivityItem = {
  type: "status" | "review";
  user: { id: number; username: string; avatar_url?: string | null };
  book: { id: number; title: string };
  status?: "want_to_read" | "reading" | "finished" | "dropped" | null;
  rating?: number | null;
  body?: string | null;
  updated_at: string;
};

type NotificationItem =
  | { kind: "request"; created_at: string; data: RequestItem }
  | { kind: "activity"; created_at: string; data: ActivityItem };

export default function NotificationsPage() {
  const token = useMemo(() => getToken(), []);
  const [mounted, setMounted] = useState(false);

  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const limit = 20;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!token) return;

    (async () => {
      try {
        const req = await apiGet<RequestItem[]>("/me/follow-requests", "browser", undefined, token);
        setRequests(req);
      } catch (e: any) {
        setStatus(e?.message ?? "Failed to load requests");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function loadMore(reset = false) {
    if (!token) return;
    setBusy(true);
    setStatus(null);

    const nextOffset = reset ? 0 : offset;
    try {
      const items = await apiGet<ActivityItem[]>(
        `/me/activity?limit=${limit}&offset=${nextOffset}`,
        "browser",
        undefined,
        token
      );
      setActivity((prev) => (reset ? items : [...prev, ...items]));
      setOffset(nextOffset + items.length);
      if (items.length < limit) setDone(true);
    } catch (e: any) {
      setStatus(e?.message ?? "Failed to load activity");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    loadMore(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!mounted) {
    return (
      <main className="space-y-4">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-ctp-subtext0">Loading…</p>
      </main>
    );
  }

  if (!token) {
    return (
      <main className="space-y-4">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-ctp-subtext0">Login to view notifications.</p>
      </main>
    );
  }

  const merged: NotificationItem[] = [
    ...requests.map((r) => ({ kind: "request" as const, created_at: r.created_at, data: r })),
    ...activity.map((a) => ({ kind: "activity" as const, created_at: a.updated_at, data: a })),
  ].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold">Notifications</h1>

      {status ? <p className="text-ctp-subtext0">{status}</p> : null}

      {merged.length === 0 && !status ? (
        <p className="text-ctp-subtext0">No notifications yet.</p>
      ) : (
        <ul className="space-y-3">
          {merged.map((item, idx) => (
            <Panel as="li" key={`${item.kind}-${idx}`} padding="sm" className="space-y-1">
              {item.kind === "request" ? (
                <div className="flex items-start gap-2 text-sm">
                  <Avatar src={item.data.requester.avatar_url} username={item.data.requester.username} size="xs" />
                  <div>
                    <a className="hover:underline" href={`/users/${item.data.requester.id}`}>
                      @{item.data.requester.username}
                    </a>{" "}
                    requested to follow you.
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-sm">
                  <Avatar src={item.data.user.avatar_url} username={item.data.user.username} size="xxs" />
                  <div>
                    <a className="hover:underline" href={`/users/${item.data.user.id}`}>
                      @{item.data.user.username}
                    </a>{" "}
                    {item.data.type === "review"
                      ? "reviewed"
                      : item.data.status === "finished"
                        ? "finished"
                        : item.data.status === "reading"
                          ? "started reading"
                          : item.data.status === "dropped"
                            ? "dropped"
                            : "wants to read"}{" "}
                    <a className="hover:underline" href={`/books/${item.data.book.id}`}>
                      {item.data.book.title}
                    </a>
                    {item.data.rating ? (
                      <span className="ml-1 inline-flex align-middle">
                        <StarRating value={item.data.rating} size="xs" />
                      </span>
                    ) : null}
                    {item.data.body ? <div className="mt-1 text-xs text-ctp-subtext0">{item.data.body}</div> : null}
                  </div>
                </div>
              )}
              <div className="text-xs text-ctp-subtext0">{new Date(item.created_at).toLocaleString()}</div>
            </Panel>
          ))}
        </ul>
      )}

      {activity.length > 0 ? (
        <div className="flex justify-center">
          <Button
            type="button"
            onClick={() => loadMore(false)}
            disabled={busy || done}
            variant="outline"
          >
            {done ? "No more results" : busy ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </main>
  );
}
