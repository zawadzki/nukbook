"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { getActiveHref } from "@/lib/sidebarNavUtils";

const primaryLinks = [
  { href: "/books", label: "Books" },
  { href: "/authors", label: "Authors" },
];

export default function SidebarPrimaryMenu() {
  const pathname = usePathname();
  const activeHref = useMemo(
    () => getActiveHref(primaryLinks.map((link) => link.href), pathname),
    [pathname],
  );

  return (
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
  );
}
