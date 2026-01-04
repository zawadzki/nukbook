"use client";

import Avatar from "@/components/Avatar";

type TasteCompareStatsData = {
  target: { id: number; username: string; avatar_url?: string | null };
  similarity_score: number;
  common_count: number;
  mean_abs_diff: number;
  pearson: number | null;
};

export function similarityClass(score: number): string {
  if (score <= 10) return "text-ctp-red-500";
  if (score <= 20) return "text-ctp-red-400";
  if (score <= 30) return "text-ctp-red-300";
  if (score <= 45) return "text-ctp-rosewater-500";
  if (score <= 55) return "text-ctp-rosewater-400";
  if (score <= 65) return "text-ctp-rosewater-300";
  if (score <= 75) return "text-ctp-green-300";
  if (score <= 85) return "text-ctp-green-400";
  return "text-ctp-green-500";
}

type TasteCompareStatsProps = {
  data: TasteCompareStatsData;
  showAvatar?: boolean;
};

export default function TasteCompareStats({ data, showAvatar = true }: TasteCompareStatsProps) {
  return (
    <div className="stats stats-vertical lg:stats-horizontal border border-ctp-surface0 w-full max-w-2xl">
      <div className="stat">
        {showAvatar ? (
          <div className="stat-figure text-secondary">
            <Avatar src={data.target.avatar_url} username={data.target.username} size="sm" />
          </div>
        ) : null}
        <div className="stat-title">Similarity</div>
        <div className={`stat-value ${similarityClass(data.similarity_score)}`}>
          {data.similarity_score}%
        </div>
        <div className="stat-desc text-ctp-subtext0">Match with @{data.target.username}</div>
      </div>
      <div className="stat">
        <div className="stat-title">Common ratings</div>
        <div className="stat-value">{data.common_count}</div>
        <div className="stat-desc text-ctp-subtext0">Books rated by both</div>
      </div>
      <div className="stat">
        <div className="stat-title">Mean diff</div>
        <div className="stat-value">{data.mean_abs_diff.toFixed(2)}</div>
        <div className="stat-desc text-ctp-subtext0">Average rating gap</div>
      </div>
      {data.pearson != null ? (
        <div className="stat">
          <div className="stat-title">Pearson</div>
          <div className="stat-value">{data.pearson.toFixed(2)}</div>
          <div className="stat-desc text-ctp-subtext0">Correlation</div>
        </div>
      ) : null}
    </div>
  );
}
