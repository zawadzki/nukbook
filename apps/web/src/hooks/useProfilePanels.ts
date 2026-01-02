"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet } from "@/lib/api";
import type { ActivityItem, LikedAuthor, Shelf } from "@/components/ProfilePanels";

type UseProfilePanelsOptions = {
  userId: number | null;
  token: string | null;
  enabled?: boolean;
  blockedReason?: string | null;
  activityLimit?: number;
};

export function useProfilePanels({
  userId,
  token,
  enabled = true,
  blockedReason,
  activityLimit = 5,
}: UseProfilePanelsOptions) {
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [likedAuthors, setLikedAuthors] = useState<LikedAuthor[]>([]);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [shelfStatus, setShelfStatus] = useState<string | null>(null);
  const [likedStatus, setLikedStatus] = useState<string | null>(null);
  const [activityStatus, setActivityStatus] = useState<string | null>(null);
  const [activityBusy, setActivityBusy] = useState(false);
  const [activityDone, setActivityDone] = useState(false);
  const activityOffsetRef = useRef(0);

  const loadActivity = useCallback(
    async (reset = false) => {
      if (!token || userId == null || !Number.isFinite(userId)) return;
      setActivityStatus(null);
      setActivityBusy(true);
      const nextOffset = reset ? 0 : activityOffsetRef.current;

      try {
        const data = await apiGet<ActivityItem[]>(
          `/users/${userId}/activity?limit=${activityLimit}&offset=${nextOffset}`,
          "browser",
          undefined,
          token
        );
        setActivityItems((prev) => (reset ? data : [...prev, ...data]));
        activityOffsetRef.current = nextOffset + data.length;
        setActivityDone(data.length < activityLimit);
      } catch (e: any) {
        setActivityStatus(e?.message ?? "Unable to view activity");
      } finally {
        setActivityBusy(false);
      }
    },
    [activityLimit, token, userId]
  );

  useEffect(() => {
    async function load() {
      if (!enabled) return;
      if (!token || userId == null || !Number.isFinite(userId)) return;

      if (blockedReason) {
        setShelves([]);
        setLikedAuthors([]);
        setActivityItems([]);
        activityOffsetRef.current = 0;
        setActivityDone(false);
        setShelfStatus(blockedReason);
        setLikedStatus(blockedReason);
        setActivityStatus(blockedReason);
        return;
      }

      setShelfStatus(null);
      setLikedStatus(null);
      setActivityStatus(null);

      try {
        const data = await apiGet<{ shelves: Shelf[] }>(
          `/users/${userId}/shelves`,
          "browser",
          undefined,
          token
        );
        setShelves(data.shelves);
      } catch (e: any) {
        setShelfStatus(e?.message ?? "Unable to view shelves");
      }

      try {
        const data = await apiGet<LikedAuthor[]>(
          `/users/${userId}/liked-authors?limit=10`,
          "browser",
          undefined,
          token
        );
        setLikedAuthors(data);
      } catch (e: any) {
        setLikedStatus(e?.message ?? "Unable to view liked authors");
      }

      activityOffsetRef.current = 0;
      setActivityDone(false);
      await loadActivity(true);
    }

    void load();
  }, [blockedReason, enabled, loadActivity, token, userId]);

  return {
    shelves,
    likedAuthors,
    activityItems,
    shelfStatus,
    likedStatus,
    activityStatus,
    activityBusy,
    activityDone,
    loadActivity,
  };
}
