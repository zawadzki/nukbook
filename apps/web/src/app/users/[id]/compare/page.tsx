"use client";

import { use, useEffect, useMemo, useState } from "react";
import { ApiError, apiGet } from "@/lib/api";
import { getToken } from "@/lib/auth";
import Panel from "@/components/Panel";
import Button from "@/components/Button";
import StarRating from "@/components/StarRating";
import { StarIcon } from "@heroicons/react/24/solid";
import BookCover from "@/components/BookCover";
import TasteCompareStats, { similarityClass } from "@/components/TasteCompareStats";
import {ChevronLeftIcon} from "@heroicons/react/16/solid";

type CompareUser = {
  id: number;
  username: string;
  avatar_url?: string | null;
};

type SharedRating = {
  book_id: number;
  title: string;
  viewer_rating: number;
  target_rating: number;
  diff: number;
};

type ViewerLoved = {
  book_id: number;
  title: string;
  cover_url?: string | null;
  authors: { id: number; name: string }[];
  viewer_rating: number;
};

type TargetLoved = {
  book_id: number;
  title: string;
  cover_url?: string | null;
  authors: { id: number; name: string }[];
  target_rating: number;
};

type TasteCompareResponse = {
  viewer: CompareUser;
  target: CompareUser;
  common_count: number;
  similarity_score: number;
  mean_abs_diff: number;
  pearson: number | null;
  agreements: SharedRating[];
  disagreements: SharedRating[];
  viewer_loved_target_unread: ViewerLoved[];
  target_loved_viewer_unread: TargetLoved[];
  shared_ratings: SharedRating[];
};

type SortOption = "diff_desc" | "diff_asc" | "title" | "viewer_rating" | "target_rating";

const sortLabels: Record<SortOption, string> = {
  diff_desc: "Delta (high to low)",
  diff_asc: "Delta (low to high)",
  title: "Title (A–Z)",
  viewer_rating: "Your rating (high)",
  target_rating: "Their rating (high)",
};

function compatibilityScore(diff: number): number {
  const score = Math.max(0, (1 - diff / 4) * 100);
  return Math.round(score);
}

export default function TasteComparePage({ params }: { params: Promise<{ id: string }> }) {
  const p = use(params);
  const token = useMemo(() => getToken(), []);
  const targetId = Number.parseInt(String(p?.id ?? ""), 10);

  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [privacyBlock, setPrivacyBlock] = useState<string | null>(null);
  const [data, setData] = useState<TasteCompareResponse | null>(null);
  const [sort, setSort] = useState<SortOption>("diff_desc");
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!Number.isFinite(targetId)) return;
      if (!token) {
        setStatus("Login to compare tastes.");
        return;
      }

      setLoading(true);
      setStatus(null);
      setPrivacyBlock(null);
      const search = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
        sort,
      });

      try {
        const res = await apiGet<TasteCompareResponse>(
          `/users/${targetId}/taste-compare?${search.toString()}`,
          "browser",
          undefined,
          token
        );
        if (!cancelled) setData(res);
      } catch (e: any) {
        if (!cancelled) {
          if (e instanceof ApiError && e.status === 403) {
            setPrivacyBlock("You can’t compare tastes due to privacy settings.");
            setData(null);
          } else {
            setStatus(e?.message ?? "Failed to load taste comparison.");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [token, targetId, limit, offset, sort]);

  if (!mounted) {
    return (
      <main className="space-y-4">
        <Panel padding="md">
          <span className="text-sm text-ctp-subtext0">Loading comparison…</span>
        </Panel>
      </main>
    );
  }

  if (!token) {
    return (
      <main className="space-y-4">
        <Panel padding="md">
          <span className="text-sm text-ctp-subtext0">Login to compare tastes.</span>
        </Panel>
      </main>
    );
  }

  if (privacyBlock) {
    return (
      <main className="space-y-4">
        <Panel padding="md">
          <span className="text-sm text-ctp-subtext0">{privacyBlock}</span>
        </Panel>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      {status ? <p className="text-sm text-ctp-subtext0">{status}</p> : null}

      {data ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <a className="btn btn-soft hover:btn-primary btn-sm" href={`/users/${data.target.id}`}>
              <ChevronLeftIcon className="w-5 h-5"/>
              Back to @{data.target.username}
            </a>
          </div>

          <Panel padding="lg">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold">Taste comparison</h1>
                <p className="text-sm text-ctp-subtext0">
                  <a className="hover:underline" href={`/users/${data.viewer.id}`}>
                    @{data.viewer.username}
                  </a>{" "}
                  vs{" "}
                  <a className="hover:underline" href={`/users/${data.target.id}`}>
                    @{data.target.username}
                  </a>
                </p>
              </div>
            </div>

            <div className="mt-5">
              <TasteCompareStats data={data} />
            </div>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel padding="lg">
              <h2 className="text-lg font-semibold">Books you loved</h2>
              <p className="text-xs text-ctp-subtext0">They haven’t read these yet.</p>

              <ul className="list bg-base-100 rounded-box border border-ctp-surface0 mt-3">
                {data.viewer_loved_target_unread.length === 0 ? (
                  <li className="list-row text-sm text-ctp-subtext0">No matches yet.</li>
                ) : (
                  data.viewer_loved_target_unread.map((item) => (
                    <li key={`viewer-loved-${item.book_id}`} className="list-row">
                      <div>
                        <BookCover
                          coverUrl={item.cover_url}
                          title={item.title}
                          className="h-16 w-12"
                          placeholder="No cover"
                          placeholderVariant="mantle"
                        />
                      </div>
                      <div>
                        <div>
                          <a className="hover:underline" href={`/books/${item.book_id}`}>
                            {item.title}
                          </a>
                        </div>
                        {item.authors.length ? (
                          <div className="text-xs font-semibold opacity-60">
                            {item.authors.map((author, idx) => (
                              <span key={author.id}>
                                <a className="hover:underline" href={`/authors/${author.id}`}>
                                  {author.name}
                                </a>
                                {idx < item.authors.length - 1 ? ", " : ""}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <StarRating value={item.viewer_rating} size="xs" />
                    </li>
                  ))
                )}
              </ul>
            </Panel>

            <Panel padding="lg">
              <h2 className="text-lg font-semibold">Books @{data.target.username} loved</h2>
              <p className="text-xs text-ctp-subtext0">You haven’t read these yet.</p>

              <ul className="list bg-base-100 rounded-box border border-ctp-surface0 mt-3">
                {data.target_loved_viewer_unread.length === 0 ? (
                  <li className="list-row text-sm text-ctp-subtext0">No matches yet.</li>
                ) : (
                  data.target_loved_viewer_unread.map((item) => (
                    <li key={`target-loved-${item.book_id}`} className="list-row">
                      <div>
                        <BookCover
                          coverUrl={item.cover_url}
                          title={item.title}
                          className="h-16 w-12"
                          placeholder="No cover"
                          placeholderVariant="mantle"
                        />
                      </div>
                      <div>
                        <div>
                          <a className="hover:underline" href={`/books/${item.book_id}`}>
                            {item.title}
                          </a>
                        </div>
                        {item.authors.length ? (
                          <div className="text-xs font-semibold opacity-60">
                            {item.authors.map((author, idx) => (
                              <span key={author.id}>
                                <a className="hover:underline" href={`/authors/${author.id}`}>
                                  {author.name}
                                </a>
                                {idx < item.authors.length - 1 ? ", " : ""}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <StarRating value={item.target_rating} size="xs" />
                    </li>
                  ))
                )}
              </ul>
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel padding="lg">
              <h2 className="text-lg font-semibold">Biggest agreements</h2>
              <p className="text-xs text-ctp-subtext0">Smallest rating differences.</p>
              <div className="mt-4">
                {data.agreements.filter((item) => compatibilityScore(item.diff) >= 55).length === 0 ? (
                  <p className="text-sm text-ctp-subtext0">No strong agreements yet.</p>
                ) : (
                  <div className="space-y-4">
                    {data.agreements.filter((item) => compatibilityScore(item.diff) >= 55).map((item) => {
                      const compat = compatibilityScore(item.diff);
                      return (
                        <div key={`agree-${item.book_id}`}>
                          <h3 className="text-md font-semibold">
                            <a className="hover:underline" href={`/books/${item.book_id}`}>
                              {item.title}
                            </a>
                          </h3>
                          <div className="stats border border-ctp-surface0 mt-2 w-full">
                            <div className="stat">
                              <div className="stat-figure text-ctp-rosewater">
                                <StarIcon className="w-7 h-7" />
                              </div>
                              <div className="stat-title">You rated</div>
                              <div className="stat-value text-ctp-rosewater">{item.viewer_rating}</div>
                              <div className="stat-desc">Stars</div>
                            </div>
                            <div className="stat">
                              <div className="stat-figure text-ctp-rosewater">
                                <StarIcon className="w-7 h-7" />
                              </div>
                              <div className="stat-title">@{data.target.username} rated</div>
                              <div className="stat-value text-ctp-rosewater">{item.target_rating}</div>
                              <div className="stat-desc">Stars</div>
                            </div>
                            <div className="stat">
                              <div className="stat-title">Compatibility</div>
                              <div className={`stat-value ${similarityClass(compat)}`}>{compat}%</div>
                              <div className="stat-desc text-secondary">Δ {item.diff}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Panel>

            <Panel padding="lg">
              <h2 className="text-lg font-semibold">Biggest disagreements</h2>
              <p className="text-xs text-ctp-subtext0">Largest rating differences.</p>
              <div className="mt-4">
                {data.disagreements.filter((item) => compatibilityScore(item.diff) <= 25).length === 0 ? (
                  <p className="text-sm text-ctp-subtext0">No major disagreements yet.</p>
                ) : (
                  <div className="space-y-4">
                    {data.disagreements.filter((item) => compatibilityScore(item.diff) <= 25).map((item) => {
                      const compat = compatibilityScore(item.diff);
                      return (
                        <div key={`disagree-${item.book_id}`}>
                          <h3 className="text-md font-semibold">
                            <a className="hover:underline" href={`/books/${item.book_id}`}>
                              {item.title}
                            </a>
                          </h3>
                          <div className="stats border border-ctp-surface0 mt-2 w-full">
                            <div className="stat">
                              <div className="stat-figure text-ctp-rosewater">
                                <StarIcon className="w-7 h-7" />
                              </div>
                              <div className="stat-title">You rated</div>
                              <div className="stat-value text-ctp-rosewater">{item.viewer_rating}</div>
                              <div className="stat-desc">Stars</div>
                            </div>
                            <div className="stat">
                              <div className="stat-figure text-ctp-rosewater">
                                <StarIcon className="w-7 h-7" />
                              </div>
                              <div className="stat-title">@{data.target.username} rated</div>
                              <div className="stat-value text-ctp-rosewater">{item.target_rating}</div>
                              <div className="stat-desc">Stars</div>
                            </div>
                            <div className="stat">
                              <div className="stat-title">Compatibility</div>
                              <div className={`stat-value ${similarityClass(compat)}`}>{compat}%</div>
                              <div className="stat-desc text-secondary">Δ {item.diff}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Panel>
          </div>

          <Panel padding="lg">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Shared ratings</h2>
                <p className="text-xs text-ctp-subtext0">
                  {data.common_count === 0
                    ? "No shared ratings yet."
                    : `Showing ${Math.min(offset + 1, data.common_count)}–${Math.min(
                        offset + limit,
                        data.common_count
                      )} of ${data.common_count}`}
                </p>
              </div>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Sort</legend>
                <select
                  className="select select-sm"
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value as SortOption);
                    setOffset(0);
                  }}
                >
                  {(Object.keys(sortLabels) as SortOption[]).map((opt) => (
                    <option key={opt} value={opt}>
                      {sortLabels[opt]}
                    </option>
                  ))}
                </select>
              </fieldset>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm table table-zebra">
                <thead className="text-left text-ctp-subtext0">
                  <tr className="border-b border-ctp-surface1">
                    <th className="py-2 pr-4 font-medium">Title</th>
                    <th className="py-2 pr-4 font-medium">You</th>
                    <th className="py-2 pr-4 font-medium">Them</th>
                    <th className="py-2 font-medium">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.shared_ratings.length === 0 ? (
                    <tr>
                      <td className="py-3 text-ctp-subtext0" colSpan={4}>
                        No shared ratings yet.
                      </td>
                    </tr>
                  ) : (
                    data.shared_ratings.map((row) => (
                      <tr key={`shared-${row.book_id}`} className="border-b border-ctp-surface1/60">
                        <td className="py-2 pr-4">
                          <a className="hover:underline" href={`/books/${row.book_id}`}>
                            {row.title}
                          </a>
                        </td>
                        <td className="py-2 pr-4">{row.viewer_rating}</td>
                        <td className="py-2 pr-4">{row.target_rating}</td>
                        <td className="py-2">{row.diff}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <Button
                variant="soft"
                size="sm"
                onClick={() => setOffset((prev) => Math.max(0, prev - limit))}
                disabled={offset === 0 || loading}
              >
                Previous
              </Button>
              <Button
                variant="soft"
                size="sm"
                onClick={() => setOffset((prev) => prev + limit)}
                disabled={offset + limit >= data.common_count || loading}
              >
                Next
              </Button>
            </div>
          </Panel>
        </>
      ) : (
        <Panel padding="md">
          <span className="text-sm text-ctp-subtext0">{loading ? "Loading comparison…" : "No data."}</span>
        </Panel>
      )}
    </main>
  );
}
