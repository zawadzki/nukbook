"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiGet, apiSend } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { pushToast } from "@/lib/toast";
import Button from "@/components/ui/Button";
import Panel from "@/components/ui/Panel";
import Avatar from "@/components/ui/Avatar";
import ProfileCover from "@/components/ui/ProfileCover";
import {
  ActivityPanel,
  LikedAuthorsPanel,
  ShelvesPanel,
} from "@/components/templates/ProfilePanels";
import { useProfilePanels } from "@/hooks/useProfilePanels";
import TasteComparisonPanel from "@/components/templates/TasteComparisonPanel";

type Profile = {
  id: number;
  username: string;
  is_private: boolean;
  followers_count: number;
  following_count: number;
  is_me: boolean;
  follow_status: "none" | "pending" | "accepted";
  avatar_url?: string | null;
  cover_url?: string | null;
};

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const p = use(params);
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const userId = Number.parseInt(String(p?.id ?? ""), 10);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [privacyBlock, setPrivacyBlock] = useState<string | null>(null);

  const {
    shelves,
    likedAuthors,
    activityItems,
    shelfStatus,
    likedStatus,
    activityStatus,
    activityBusy,
    activityDone,
    loadActivity,
  } = useProfilePanels({
    userId,
    token,
    enabled: mounted,
    blockedReason: privacyBlock,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function load() {
      if (!Number.isFinite(userId)) return;

      if (!token) {
        setStatus("Login to view profiles.");
        return;
      }

      try {
        const data = await apiGet<Profile>(`/users/${userId}`, "browser", undefined, token);
        setProfile(data);

        const canView = data.is_me || !data.is_private || data.follow_status === "accepted";
        if (!canView) {
          setPrivacyBlock("This account is private.");
          return;
        }
        setPrivacyBlock(null);
      } catch (e: any) {
        setStatus(e?.message ?? "Failed to load profile");
        return;
      }
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, userId]);

  if (!mounted) {
    return (
      <main className="space-y-4">
        <Panel padding="md">
          <span className="text-sm text-ctp-subtext0">Loading profile…</span>
        </Panel>
      </main>
    );
  }

  async function follow(action: "follow" | "unfollow") {
    if (!profile || !token) return;
    const endpoint = action === "follow" ? "follow" : "unfollow";

    try {
      if (action === "follow") {
        const data = await apiSend<{ status: "pending" | "accepted" }>(
          `/users/${profile.id}/follow`,
          "browser",
          "POST",
          undefined,
          token
        );
        setProfile((prev) => (prev ? { ...prev, follow_status: data.status } : prev));
        pushToast({
          message: data.status === "pending" ? "Follow request sent." : "Now following.",
          variant: "success",
        });
      } else {
        await apiSend(`/users/${profile.id}/unfollow`, "browser", "POST", undefined, token);
        setProfile((prev) => (prev ? { ...prev, follow_status: "none" } : prev));
        pushToast({ message: "Unfollowed.", variant: "success" });
      }

      router.refresh();
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 403) {
        setStatus("You do not have access to update follows.");
        pushToast({ message: "Follow action not allowed.", variant: "error" });
        return;
      }
      setStatus(e?.message ?? "Failed to update follow");
      pushToast({ message: "Failed to update follow.", variant: "error" });
    }
  }

  return (
    <main className="space-y-4">
      {!token ? (
        <p className="text-ctp-subtext0">Login to view profiles.</p>
      ) : null}

      {status ? <p className="text-ctp-subtext0">{status}</p> : null}

      {profile ? (
        <Panel as="section" padding="none" className="space-y-4 border-none relative">
          <div className="relative h-28 overflow-hidden rounded-lg bg-ctp-text mb-0">
            <div className="flex items-center gap-3 absolute z-10 p-4 text-ctp-base">
              <Avatar src={profile.avatar_url} username={profile.username} size="md" />
              <div>
                <h1 className="text-2xl font-semibold">@{profile.username}</h1>
                <div className="text-sm">
                  {profile.is_private && profile.follow_status !== "accepted" && !profile.is_me ? (
                    <>
                      {profile.followers_count} followers · {profile.following_count} following
                    </>
                  ) : (
                    <>
                      <a className="hover:underline" href={`/followers?user=${profile.id}`}>
                        {profile.followers_count} followers
                      </a>{" "}
                      ·{" "}
                      <a className="hover:underline" href={`/following?user=${profile.id}`}>
                        {profile.following_count} following
                      </a>
                    </>
                  )}
                  {profile.is_private ? " · Private" : ""}
                </div>
              </div>
            </div>
            <ProfileCover
              coverUrl={profile.cover_url}
              imgClassName="h-full w-full object-cover opacity-65"
              placeholderClassName="h-full w-full rounded-lg border-0"
              placeholder=""
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 absolute bottom-2 right-2 p-1 bg-ctp-base rounded-xl">
            {!profile.is_me ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => router.push(`/users/${profile.id}/compare`)} variant="primary">
                  Compare taste
                </Button>
                {profile.follow_status === "accepted" ? (
                  <Button onClick={() => follow("unfollow")} variant="neutral">
                    Unfollow
                  </Button>
                ) : profile.follow_status === "pending" ? (
                  <span className="text-sm text-ctp-base">Request sent</span>
                ) : (
                  <Button onClick={() => follow("follow")} variant="primary">
                    Follow
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        </Panel>
      ) : null}

      <div className="flex flex-wrap gap-5 w-full">
        <div className="grow">
          <ShelvesPanel shelves={shelves} status={shelfStatus} />
        </div>

        <div className="flex flex-col gap-5 min-w-xl">
          {profile && !profile.is_me && !privacyBlock ? (
            <div className="w-full max-w-prose">
              <TasteComparisonPanel userId={profile.id} username={profile.username} />
            </div>
          ) : null}
          <div className="w-full max-w-prose">
            <ActivityPanel
              items={activityItems}
              status={activityStatus}
              onLoadMore={() => loadActivity(false)}
              loading={activityBusy}
              done={activityDone}
            />
          </div>

          <div className="w-full max-w-prose">
            <LikedAuthorsPanel
              authors={likedAuthors}
              status={likedStatus}
              gridClassName="md:grid-cols-1"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
