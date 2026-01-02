"use client";

import { useEffect, useMemo, useState } from "react";
import { getToken } from "@/lib/auth";
import { usePendingRequestCount } from "@/hooks/usePendingRequestCount";

export default function SidebarUserMenu() {
  const token = useMemo(() => getToken(), []);
  const [mounted, setMounted] = useState(false);
  const pendingCount = usePendingRequestCount(token);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !token) return null;

  return (
    <>
      <ul className="menu menu-xl rounded-box w-full">
        <li><a href="/me">Profile</a></li>
        <li><a href="/shelves">My Shelves</a></li>
        <li><a href="/discover">Discover</a></li>
      </ul>
      <ul className="menu menu-xl rounded-box w-full">
        <li>
          <a href="/me/requests">
            Requests{pendingCount ? ` (${pendingCount})` : ""}
          </a>
        </li>
        <li><a href="/me/settings">Settings</a></li>
      </ul>
    </>
  );
}
