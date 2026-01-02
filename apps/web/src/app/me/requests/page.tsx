"use client";

import { useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/api";
import { getToken } from "@/lib/auth";
import Button from "@/components/Button";
import Panel from "@/components/Panel";

type FollowRequest = {
  id: number;
  requester: { id: number; username: string; avatar_url?: string | null };
};

export default function RequestsPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [requests, setRequests] = useState<FollowRequest[]>([]);

  useEffect(() => {
    async function run() {
      const token = getToken();
      if (!token) {
        setStatus("Not logged in.");
        return;
      }

      try {
        const req = await apiGet<FollowRequest[]>("/me/follow-requests", "browser", undefined, token);
        setRequests(req);
      } catch (e: any) {
        setStatus(e?.message ?? "Failed to load requests");
      }
    }
    void run();
  }, []);

  async function respond(requestId: number, action: "approve" | "deny") {
    const token = getToken();
    if (!token) return;
    await apiSend(`/me/follow-requests/${requestId}/${action}`, "browser", "POST", undefined, token);
    setRequests((prev) => prev.filter((x) => x.id !== requestId));
  }

  return (
    <main className="mx-auto max-w-md space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pending requests</h1>
        <a className="btn btn-soft hover:btn-primary btn-sm" href="/me">
          Back to profile
        </a>
      </div>

      {status ? <p className="text-ctp-subtext0">{status}</p> : null}

      <Panel padding="md">
        <h2 className="text-sm font-semibold text-ctp-text">Follow requests</h2>
        {requests.length === 0 && !status ? (
          <p className="mt-2 text-sm text-ctp-subtext0">No pending requests.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {requests.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3">
                <a className="hover:underline" href={`/users/${r.requester.id}`}>
                  @{r.requester.username}
                </a>
                <div className="flex gap-2">
                  <Button
                    variant="mantle"
                    size="xs"
                    onClick={() => respond(r.id, "approve")}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="mantle"
                    size="xs"
                    onClick={() => respond(r.id, "deny")}
                  >
                    Deny
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </main>
  );
}
