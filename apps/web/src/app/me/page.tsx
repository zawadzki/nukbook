"use client";

import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import Panel from "@/components/ui/Panel";
import Avatar from "@/components/ui/Avatar";
import ProfileCover from "@/components/ui/ProfileCover";
import {
  ActivityPanel,
  LikedAuthorsPanel,
  ShelvesPanel,
} from "@/components/templates/ProfilePanels";
import { useProfilePanels } from "@/hooks/useProfilePanels";
import { useMeSummary } from "@/hooks/useMeSummary";

export default function MePage() {
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const { me, status, followersCount, followingCount } = useMeSummary(token, { enabled: mounted });

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
    userId: me?.id ?? null,
    token,
    enabled: mounted && !!me,
  });

  useEffect(() => {
    setMounted(true);
    setToken(getToken());
  }, []);

  return (
    <main className="space-y-4">
      {!mounted ? <p className="text-ctp-subtext0">Loading profile…</p> : null}
      {mounted && !token ? <p className="text-ctp-subtext0">Login to view your profile.</p> : null}
      {status ? <p className="text-ctp-subtext0">{status}</p> : null}

      {me ? (
        <Panel as="section" padding="none" className="space-y-4 border-none relative">
          <div className="relative h-28 overflow-hidden rounded-lg bg-ctp-text mb-0">
            <div className="flex items-center gap-3 absolute z-10 p-4 text-ctp-base">
              <Avatar src={me.avatar_url} username={me.username} size="md" />
              <div>
                <h1 className="text-2xl font-semibold">@{me.username}</h1>
                <div className="text-sm">
                  <a className="hover:underline" href="/followers">
                    {(followersCount ?? "—")} followers
                  </a>{" "}
                  ·{" "}
                  <a className="hover:underline" href="/following">
                    {(followingCount ?? "—")} following
                  </a>
                  {me.is_private ? " · Private" : ""}
                </div>
              </div>
            </div>
            <ProfileCover
              coverUrl={me.cover_url}
              imgClassName="h-full w-full object-cover opacity-65"
              placeholderClassName="h-full w-full rounded-lg border-0"
              placeholder=""
            />
          </div>
        </Panel>
      ) : null}

      <div className="flex flex-wrap gap-5 w-full">
        <div className="grow">
          <ShelvesPanel shelves={shelves} status={shelfStatus} />
        </div>

        <div className="flex flex-col gap-5 min-w-xl">
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
