import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

export type Me = {
  id: number;
  email: string;
  username: string;
  role: string;
  is_private: boolean;
  avatar_url?: string | null;
  cover_url?: string | null;
};

type UseMeSummaryOptions = {
  enabled?: boolean;
};

export function useMeSummary(token: string | null, options: UseMeSummaryOptions = {}) {
  const { enabled = true } = options;
  const [me, setMe] = useState<Me | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [followersCount, setFollowersCount] = useState<number | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);

  useEffect(() => {
    async function run() {
      if (!enabled) return;
      if (!token) {
        setStatus("Not logged in.");
        return;
      }
      setStatus(null);

      try {
        const meData = await apiGet<Me>("/auth/me", "browser", undefined, token);
        setMe(meData);

        try {
          const followers = await apiGet<{ id: number; username: string }[]>(
            "/me/followers",
            "browser",
            undefined,
            token
          );
          setFollowersCount(followers.length);
        } catch {
          setFollowersCount(null);
        }

        try {
          const following = await apiGet<{ id: number; username: string }[]>(
            "/me/following",
            "browser",
            undefined,
            token
          );
          setFollowingCount(following.length);
        } catch {
          setFollowingCount(null);
        }
      } catch (e: any) {
        setStatus(e?.message ?? "Failed to load profile");
      }
    }
    void run();
  }, [enabled, token]);

  return {
    me,
    setMe,
    status,
    followersCount,
    followingCount,
  };
}
