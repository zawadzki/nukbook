"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/api";
import { getToken } from "@/lib/auth";

export type FollowRow = { id: number; username: string; avatar_url?: string | null };

type UseFollowListOptions = {
  kind: "followers" | "following";
};

export function useFollowList({ kind }: UseFollowListOptions) {
  const token = useMemo(() => getToken(), []);
  const [items, setItems] = useState<FollowRow[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [backHref, setBackHref] = useState<string | null>(null);
  const [backLabel, setBackLabel] = useState<string | null>(null);
  const [ownerLabel, setOwnerLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const userId = params.get("user");
    setBackHref(userId ? `/users/${userId}` : "/me");
    setBackLabel(userId ? "Back to profile" : "Back to me");

    (async () => {
      if (!token) {
        setStatus(`Login to view ${kind}.`);
        return;
      }
      try {
        const endpoint = userId ? `/users/${userId}/${kind}` : `/me/${kind}`;
        const data = await apiGet<FollowRow[]>(endpoint, "browser", undefined, token);
        if (!cancelled) setItems(data);
        if (userId) {
          try {
            const profile = await apiGet<{ username: string }>(`/users/${userId}`, "browser", undefined, token);
            if (!cancelled) setOwnerLabel(`@${profile.username}`);
          } catch {
            if (!cancelled) setOwnerLabel(null);
          }
        } else {
          if (!cancelled) setOwnerLabel("You");
        }
      } catch (e: any) {
        if (!cancelled) setStatus(e?.message ?? `Failed to load ${kind}`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [kind, token]);

  return { items, status, backHref, backLabel, ownerLabel };
}
