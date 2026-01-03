"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { getToken } from "@/lib/auth";
import { usePendingRequestCount } from "@/hooks/usePendingRequestCount";
import { getActiveHref } from "@/components/sidebarNavUtils";

export default function SidebarUserMenu() {
  const token = useMemo(() => getToken(), []);
  const [mounted, setMounted] = useState(false);
  const pendingCount = usePendingRequestCount(token);
  const pathname = usePathname();
  const primaryLinks = [
    { href: "/me", label: "Profile" },
    { href: "/shelves", label: "My Shelves" },
    { href: "/discover", label: "Discover" },
  ];
  const secondaryLinks = [
    { href: "/me/requests", label: "Requests" },
    { href: "/me/settings", label: "Settings" },
  ];
  const activeHref = useMemo(
    () =>
      getActiveHref(
        [...primaryLinks, ...secondaryLinks].map((link) => link.href),
        pathname,
      ),
    [pathname],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !token) return null;

  return (
    <>
      <ul className="menu menu-xl rounded-box w-full">
        {primaryLinks.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className={activeHref === link.href ? "menu-active" : undefined}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
      <ul className="menu menu-xl rounded-box w-full">
        {secondaryLinks.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className={activeHref === link.href ? "menu-active" : undefined}
            >
              {link.label}
              {link.href === "/me/requests"
                ? pendingCount
                  ? ` (${pendingCount})`
                  : ""
                : ""}
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
