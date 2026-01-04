"use client";

import { useEffect, useMemo, useState } from "react";
import Panel from "@/components/ui/Panel";
import { ApiError, apiGet } from "@/lib/api";
import { getToken } from "@/lib/auth";
import TasteCompareStats from "@/components/ui/TasteCompareStats";

type TasteComparisonPanelProps = {
  userId: number;
  username: string;
  hidden?: boolean;
};

type TasteCompareStatsData = {
  target: { id: number; username: string; avatar_url?: string | null };
  similarity_score: number;
  common_count: number;
  mean_abs_diff: number;
  pearson: number | null;
};

export default function TasteComparisonPanel({ userId, username, hidden }: TasteComparisonPanelProps) {
  const token = useMemo(() => getToken(), []);
  const [data, setData] = useState<TasteCompareStatsData | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!token || hidden) return;
      try {
        const res = await apiGet<TasteCompareStatsData>(
          `/users/${userId}/taste-compare?limit=1&offset=0`,
          "browser",
          undefined,
          token
        );
        if (!cancelled) setData(res);
      } catch (e: any) {
        if (!cancelled) {
          if (e instanceof ApiError && e.status === 403) {
            setStatus("Taste comparison is unavailable due to privacy settings.");
          } else {
            setStatus(e?.message ?? "Failed to load taste comparison.");
          }
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [hidden, token, userId]);

  if (hidden) return null;

  return (
    <Panel as="section" padding="md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Taste comparison</h2>
          <p className="text-sm text-ctp-subtext0">
            Compare your ratings with @{username}.
          </p>
        </div>
      </div>

      {status ? <p className="mt-3 text-sm text-ctp-subtext0">{status}</p> : null}
      {data ? (
        <div className="mt-3">
          <TasteCompareStats data={data} showAvatar={false} />
        </div>
      ) : null}
    </Panel>
  );
}
