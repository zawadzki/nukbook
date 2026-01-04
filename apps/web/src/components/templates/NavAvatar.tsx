"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import Panel from "@/components/ui/Panel";
import Avatar from "@/components/ui/Avatar";

type NavAvatarProps = {
  me: { username: string; avatar_url?: string | null };
  pendingCount: number | null;
  onLogoutAction: () => void;
};

export default function NavAvatar({ me, pendingCount, onLogoutAction }: NavAvatarProps) {
  const [open, setOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const el = avatarRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    }

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div ref={avatarRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="none"
        className="btn-circle"
        onClick={() => setOpen((v) => !v)}
        aria-label="User menu"
      >
        <Avatar src={me.avatar_url} username={me.username} size="xs" />
      </Button>

      {open ? (
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
          <div className="divider m-0" />
          <a className="btn btn-sm btn-ghost w-full justify-start" href="/me/requests">
            Requests{pendingCount ? ` (${pendingCount})` : ""}
          </a>
          <a className="btn btn-sm btn-ghost w-full justify-start" href="/me/settings">
            Settings
          </a>
          <div className="divider m-0" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={onLogoutAction}
          >
            Logout
          </Button>
        </Panel>
      ) : null}
    </div>
  );
}
