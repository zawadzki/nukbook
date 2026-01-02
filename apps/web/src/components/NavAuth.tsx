"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { clearToken, getToken } from "@/lib/auth";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/16/solid";
import { BellIcon } from "@heroicons/react/24/outline";
import { apiGet, apiSend } from "@/lib/api";
import StarRating from "@/components/StarRating";
import Button from "@/components/Button";
import Panel from "@/components/Panel";
import Avatar from "@/components/Avatar";
import { usePendingRequestCount } from "@/hooks/usePendingRequestCount";

type Me = { id: number; email: string; username: string; role: string; avatar_url?: string | null };

function isAdminRole(role: string | undefined | null) {
  return role === "admin" || role === "staff";
}

export function NavAuth() {
  const token = useMemo(() => getToken(), []);
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [notifCounts, setNotifCounts] = useState<{ requests: number; activity: number } | null>(null);
  const [activityItems, setActivityItems] = useState<
    {
      type: "status" | "review";
      user: { id: number; username: string; avatar_url?: string | null };
      book: { id: number; title: string };
      status?: string | null;
      rating?: number | null;
    }[]
  >([]);
  const [requestItems, setRequestItems] = useState<
    { id: number; requester: { id: number; username: string; avatar_url?: string | null } }[]
  >([]);
  const adminRef = useRef<HTMLDivElement | null>(null);
  const notifRef = useRef<HTMLDivElement | null>(null);
  const avatarRef = useRef<HTMLDivElement | null>(null);
  const pendingCount = usePendingRequestCount(token);

  useEffect(() => {
    async function run() {
      try {
        if (!token) {
          setMe(null);
          return;
        }

        const data = await apiGet<Me>("/auth/me", "browser", undefined, token);
        setMe(data);
      } catch {
        setMe(null);
        clearToken();
      } finally {
        setReady(true);
      }
    }

    void run();
  }, [token]);

  function logout() {
    clearToken();
    window.location.href = "/login";
  }

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!adminOpen) return;
      const el = adminRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setAdminOpen(false);
    }

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [adminOpen]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!notifOpen) return;
      const el = notifRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setNotifOpen(false);
    }

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [notifOpen]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!avatarOpen) return;
      const el = avatarRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setAvatarOpen(false);
    }

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [avatarOpen]);

  useEffect(() => {
    async function loadCounts() {
      if (!me) return;
      const token = getToken();
      if (!token) return;
      try {
        const data = await apiGet<{
          requests: number;
          activity: number
        }>("/me/notifications", "browser", undefined, token);
        setNotifCounts(data);
        const preview = await apiGet<{
          requests: { id: number; requester: { id: number; username: string; avatar_url?: string | null } }[];
          activity: {
            type: "status" | "review";
            user: { id: number; username: string; avatar_url?: string | null };
            book: { id: number; title: string };
            status?: string | null;
            rating?: number | null;
          }[];
        }>("/me/notifications/preview", "browser", undefined, token);
        setRequestItems(preview.requests);
        setActivityItems(preview.activity);
      } catch {
        setNotifCounts(null);
      }
    }

    void loadCounts();
  }, [me]);

  if (!ready) {
    return <span className="loading loading-dots loading-xs"></span>;
  }

  if (!me) {
    return (
      <div className="flex items-center gap-3 text-sm text-ctp-text">
        <a className="btn btn-outline" href="/login">
          Login
        </a>
        <a className="btn btn-primary" href="/register">
          Register
        </a>
      </div>
    );
  }

  const showAdmin = isAdminRole(me.role);

  return (
    <div className="flex items-center gap-3 text-sm text-ctp-text">
      {me ? (
        <div ref={notifRef} className="relative">
          <Button
            type="button"
            onClick={async () => {
              const next = !notifOpen;
              setNotifOpen(next);
              if (next) {
                const token = getToken();
                if (token) {
                  try {
                    await apiSend("/me/notifications/seen", "browser", "POST", {requests: true, activity: true}, token);
                    setNotifCounts((prev) => (prev ? {...prev, requests: 0, activity: 0} : prev));
                  } catch {
                    setNotifCounts(null);
                  }
                }
              }
            }}
            variant="ghost"
            size="icon-sm"
            className="btn-circle"
            aria-label="Notifications"
          >
            <div className="indicator">
              <BellIcon className="h-5 w-5"/>
              {notifCounts && (notifCounts.requests + notifCounts.activity > 0) ? (
                <span className="badge badge-xs badge-primary indicator-item">
                {notifCounts.requests + notifCounts.activity}
              </span>
                ) : null}
            </div>
          </Button>

          {notifOpen ? (
            <Panel
              className="absolute right-0 z-20 mt-2 w-56 bg-base-100 shadow-sm"
              padding="xs"
            >
              <div className="space-y-2 text-sm">
                <a className="btn btn-sm btn-ghost w-full justify-between" href="/notifications">
                  View all notifications
                  <ChevronRightIcon className="w-4 h-4"/>
                </a>
                <div className="divider m-0"/>
                {requestItems.map((r) => (
                  <a key={r.id} className="block rounded-md px-2 py-2 hover:bg-ctp-surface0" href="/notifications">
                    <span className="flex items-center gap-2">
                      <Avatar src={r.requester.avatar_url} username={r.requester.username} size="xs"/>
                      <span>@{r.requester.username} requested to follow you</span>
                    </span>
                  </a>
                ))}
                {activityItems.map((a, idx) => (
                  <div key={`${a.user.id}-${a.book.id}-${idx}`} className="rounded-md px-2 py-2">
                    <span className="flex items-center gap-2">
                      <Avatar src={a.user.avatar_url} username={a.user.username} size="xs"/>
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
                        <StarRating value={a.rating} size="xs"/>
                      </span>
                    ) : null}
                  </div>
                ))}
                {requestItems.length === 0 && activityItems.length === 0 ? (
                  <div className="px-2 py-2 mb-0 text-sm text-ctp-subtext0">No new notifications.</div>
                ) : null}
                <div className="divider m-0"/>
                <Button
                  type="button"
                  onClick={async () => {
                    const token = getToken();
                    if (!token) return;
                    try {
                      await apiSend("/me/notifications/seen", "browser", "POST", {
                        requests: true,
                        activity: true
                      }, token);
                      setNotifCounts((prev) => (prev ? {...prev, requests: 0, activity: 0} : prev));
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
      ) : null}

      <div ref={avatarRef} className="relative">
        <Button
          type="button"
          variant="ghost"
          size="none"
          className="btn-circle"
          onClick={() => setAvatarOpen((v) => !v)}
          aria-label="User menu"
        >
          <Avatar src={me.avatar_url} username={me.username} size="xs"/>
        </Button>

        {avatarOpen ? (
          <Panel className="absolute right-0 z-20 mt-2 w-44 p-1 bg-base-100 shadow-sm" padding="none">
            <a className="btn btn-sm btn-ghost w-full justify-start" href="/me">
              Profile
            </a>
            <a className="btn btn-sm btn-ghost w-full justify-start" href="/shelves">
              My shelves
            </a>
            <a className="btn btn-sm btn-ghost w-full justify-start" href="/discover">
              Discover
            </a>
            <div className="divider m-0"/>
              <a className="btn btn-sm btn-ghost w-full justify-start" href="/me/requests">
                Requests{pendingCount ? ` (${pendingCount})` : ""}
              </a>
            <a className="btn btn-sm btn-ghost w-full justify-start" href="/me/settings">
              Settings
            </a>
            <div className="divider m-0"/>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={logout}
            >
              Logout
            </Button>
          </Panel>
        ) : null}
      </div>

      {showAdmin ? (
        <div ref={adminRef} className="relative">
          <Button
            type="button"
            onClick={() => setAdminOpen((v) => !v)}
            variant="soft"
            size="sm"
            radius="full"
            className="px-2.5 py-1 text-xs"
          >
            Admin
            <ChevronDownIcon className="h-3 w-3 opacity-70"/>
          </Button>

          {adminOpen ? (
            <Panel
              className="absolute right-0 z-20 mt-2 w-44 p-1 shadow-sm"
              padding="none"
            >
              <a className="btn btn-sm btn-ghost w-full justify-start" href="/admin/books">
                Books
              </a>
              <a className="btn btn-sm btn-ghost w-full justify-start" href="/admin/authors">
                Authors
              </a>
              <a className="btn btn-sm btn-ghost w-full justify-start" href="/admin/tags-genres">
                Tags & Genres
              </a>
              <a className="btn btn-sm btn-ghost w-full justify-start" href="/admin/users">
                Users
              </a>
              <a className="btn btn-sm btn-ghost w-full justify-start" href="/admin/reviews">
                Reviews
              </a>
            </Panel>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
