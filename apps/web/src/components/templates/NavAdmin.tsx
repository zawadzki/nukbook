"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/16/solid";
import Button from "@/components/ui/Button";
import Panel from "@/components/ui/Panel";

type NavAdminProps = {
  show: boolean;
};

export default function NavAdmin({ show }: NavAdminProps) {
  const [open, setOpen] = useState(false);
  const adminRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const el = adminRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    }

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  if (!show) return null;

  return (
    <div ref={adminRef} className="relative">
      <Button
        type="button"
        onClick={() => setOpen((v) => !v)}
        variant="primary"
        size="sm"
        radius="full"
        className="px-2.5 py-1 text-xs"
      >
        Admin
        <ChevronDownIcon className="h-3 w-3 opacity-70" />
      </Button>

      {open ? (
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
  );
}
