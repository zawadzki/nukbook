"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

type FollowRequest = {
  id: number;
};

export function usePendingRequestCount(token: string | null) {
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!token) {
        setPendingCount(null);
        return;
      }

      try {
        const req = await apiGet<FollowRequest[]>("/me/follow-requests", "browser", undefined, token);
        if (!cancelled) setPendingCount(req.length);
      } catch {
        if (!cancelled) setPendingCount(null);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return pendingCount;
}
