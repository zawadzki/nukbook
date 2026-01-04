"use client";

import { useEffect, useRef, useState } from "react";
import { BellIcon } from "@heroicons/react/24/outline";
import { ChevronRightIcon } from "@heroicons/react/16/solid";
import { apiGet, apiSend } from "@/lib/api";
import StarRating from "@/components/ui/StarRating";
import Button from "@/components/ui/Button";
import Panel from "@/components/ui/Panel";
import Avatar from "@/components/ui/Avatar";

type ActivityPreview = {
  type: "status" | "review";
  user: { id: number; username: string; avatar_url?: string | null };
  book: { id: number; title: string };
  status?: string | null;
  rating?: number | null;
};

type RequestPreview = {
  id: number;
  requester: { id: number; username: string; avatar_url?: string | null };
};

type NavNotificationsProps = {
  token: string | null;
  meId: number;
};

export default function NavNotifications({ token, meId }: NavNotificationsProps) {
  const [open, setOpen] = useState(false);
  const [notifCounts, setNotifCounts] = useState<{ requests: number; activity: number } | null>(null);
  const [activityItems, setActivityItems] = useState<ActivityPreview[]>([]);
  const [requestItems, setRequestItems] = useState<RequestPreview[]>([]);
  const notifRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const el = notifRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    }

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    async function loadCounts() {
      if (!token) return;
      try {
        const data = await apiGet<{
          requests: number;
          activity: number;
        }>("/me/notifications", "browser", undefined, token);
        setNotifCounts(data);
        const preview = await apiGet<{
          requests: RequestPreview[];
          activity: ActivityPreview[];
        }>("/me/notifications/preview", "browser", undefined, token);
        setRequestItems(preview.requests);
        setActivityItems(preview.activity);
      } catch {
        setNotifCounts(null);
      }
    }

    if (meId) {
      void loadCounts();
    }
  }, [meId, token]);

  return (
    <div ref={notifRef} className="relative">
      <Button
        type="button"
        onClick={async () => {
          const next = !open;
          setOpen(next);
          if (next && token) {
            try {
              await apiSend("/me/notifications/seen", "browser", "POST", { requests: true, activity: true }, token);
              setNotifCounts((prev) => (prev ? { ...prev, requests: 0, activity: 0 } : prev));
            } catch {
              setNotifCounts(null);
            }
          }
        }}
        variant="ghost"
        size="icon-sm"
        className="btn-circle"
        aria-label="Notifications"
      >
        <div className="indicator">
          <BellIcon className="h-5 w-5" />
          {notifCounts && (notifCounts.requests + notifCounts.activity > 0) ? (
            <span className="badge badge-xs badge-primary indicator-item">
              {notifCounts.requests + notifCounts.activity}
            </span>
          ) : null}
        </div>
      </Button>

      {open ? (
        <Panel className="absolute right-0 z-20 mt-2 w-56 bg-base-100 shadow-sm" padding="xs">
          <div className="space-y-2 text-sm">
            <a className="btn btn-sm btn-ghost w-full justify-between" href="/notifications">
              View all notifications
              <ChevronRightIcon className="w-4 h-4" />
            </a>
            <div className="divider m-0" />
            {requestItems.map((r) => (
              <a key={r.id} className="block rounded-md px-2 py-2 hover:bg-ctp-surface0" href="/notifications">
                <span className="flex items-center gap-2">
                  <Avatar src={r.requester.avatar_url} username={r.requester.username} size="xs" />
                  <span>@{r.requester.username} requested to follow you</span>
                </span>
              </a>
            ))}
            {activityItems.map((a, idx) => (
              <div key={`${a.user.id}-${a.book.id}-${idx}`} className="rounded-md px-2 py-2">
                <span className="flex items-center gap-2">
                  <Avatar src={a.user.avatar_url} username={a.user.username} size="xs" />
                  <span>
                    <a className="hover:underline" href={`/users/${a.user.id}`}>
                      @{a.user.username}
                    </a>{" "}
                    {a.type === "review"
                      ? "reviewed"
                      : a.status === "finished"
                        ? "finished"
                        : a.status === "reading"
                          ? "started reading"
                          : a.status === "dropped"
                            ? "dropped"
                            : "wants to read"}{" "}
                    <a className="hover:underline" href={`/books/${a.book.id}`}>
                      {a.book.title}
                    </a>
                  </span>
                </span>
                {a.rating ? (
                  <span className="ml-6 inline-flex align-middle">
                    <StarRating value={a.rating} size="xs" />
                  </span>
                ) : null}
              </div>
            ))}
            {requestItems.length === 0 && activityItems.length === 0 ? (
              <div className="px-2 py-2 mb-0 text-sm text-ctp-subtext0">No new notifications.</div>
            ) : null}
            <div className="divider m-0" />
            <Button
              type="button"
              onClick={async () => {
                if (!token) return;
                try {
                  await apiSend(
                    "/me/notifications/seen",
                    "browser",
                    "POST",
                    { requests: true, activity: true },
                    token
                  );
                  setNotifCounts((prev) => (prev ? { ...prev, requests: 0, activity: 0 } : prev));
                  setRequestItems([]);
                  setActivityItems([]);
                } catch {
                  setNotifCounts(null);
                }
              }}
              variant="ghost"
              size="sm"
              className="w-full justify-start"
            >
              Clear notifications
            </Button>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
