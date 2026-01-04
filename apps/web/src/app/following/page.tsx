"use client";

import Panel from "@/components/Panel";
import Avatar from "@/components/Avatar";
import { useFollowList } from "@/hooks/useFollowList";

export default function FollowingPage() {
  const { items, status, backHref, backLabel, ownerLabel } = useFollowList({ kind: "following" });

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          {ownerLabel ? `${ownerLabel} following` : "Following"}
        </h1>
        {backHref ? (
          <a className="btn btn-outline btn-primary btn-sm rounded-full" href={backHref}>
            {backLabel}
          </a>
        ) : null}
      </div>
      {status ? <p className="text-ctp-subtext0">{status}</p> : null}
      {items.length === 0 && !status ? (
        <p className="text-ctp-subtext0">No following yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((u) => (
            <Panel as="li" key={u.id} padding="sm">
              <a className="flex items-center gap-2 text-ctp-text" href={`/users/${u.id}`}>
                <Avatar src={u.avatar_url} username={u.username} size="xs" />
                @{u.username}
              </a>
            </Panel>
          ))}
        </ul>
      )}
    </main>
  );
}
