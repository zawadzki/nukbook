"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearToken } from "@/lib/auth";
import { apiGet, apiSend } from "@/lib/api";
import { getRequiredToken } from "@/lib/adminApi";
import { handleAdminError } from "@/lib/adminErrors";
import Button from "@/components/Button";
import Panel from "@/components/Panel";
import ConfirmDialog from "@/components/ConfirmDialog";
import StarRating from "@/components/StarRating";

type ReviewRow = {
  id: number;
  rating: number;
  body: string | null;
  created_at: string;
  book: { id: number; title: string };
  user: { id: number; email: string; username: string };
};

function useDebounce<T>(value: T, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

async function apiGetAdminReviews(params: { q?: string; limit?: number; offset?: number }) {
  const token = getRequiredToken();

  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  search.set("limit", String(params.limit ?? 50));
  search.set("offset", String(params.offset ?? 0));

  const path = `/admin/reviews?${search.toString()}`;
  return apiGet<{ items: ReviewRow[]; limit: number; offset: number }>(path, "browser", undefined, token);
}

async function apiDeleteAdminReview(reviewId: number) {
  const token = getRequiredToken();

  await apiSend(`/admin/reviews/${reviewId}`, "browser", "DELETE", undefined, token);
}

export default function AdminReviewsPage() {
  const router = useRouter();

  const [q, setQ] = useState("");
  const dq = useDebounce(q, 250);

  const [items, setItems] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  function handleAuthError(nextPath: string) {
    clearToken();
    router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const data = await apiGetAdminReviews({ q: dq || undefined, limit: 50, offset: 0 });
      setItems(data.items);
    } catch (e: any) {
      const msg = handleAdminError(e, () => handleAuthError("/admin/reviews"), () => router.replace("/"));
      if (msg) setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq]);

  async function onDelete(r: ReviewRow) {
    setErr(null);
    setBusyId(r.id);

    const prev = items;
    setItems((p) => p.filter((x) => x.id !== r.id));

    try {
      await apiDeleteAdminReview(r.id);
    } catch (e: any) {
      setItems(prev); // revert
      const msg = handleAdminError(e, () => handleAuthError("/admin/reviews"), () => router.replace("/"), {
        ignoreNotFound: true,
      });
      if (msg) setErr(msg);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Admin · Reviews</h1>
      </div>

      <div className="flex items-center gap-3">
        <input
          className="input w-full max-w-md"
          placeholder="Search review / book / user…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading && <div className="text-sm opacity-70">Loading…</div>}
      {err && (
        <Panel className="text-sm" padding="sm">
          Error: {err}
        </Panel>
      )}

      <div className="space-y-3">
        {items.map((r) => (
          <Panel key={r.id} padding="md">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <div className="text-xs opacity-60">ID {r.id}</div>
                <div className="text-lg font-medium"><a className="hover:underline" href={`/books/${r.book.id}`}>{r.book.title}</a></div>
                <div className="text-sm"><a className="hover:underline" href={`/users/${r.user.id}`}>@{r.user.username}</a></div>
                <div className="text-xs opacity-70">{r.user.email}</div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <StarRating value={r.rating} size="xs" />
                <Button
                  onClick={() => {
                    const el = document.getElementById(`delete-review-${r.id}`) as HTMLDialogElement | null;
                    el?.showModal();
                  }}
                  disabled={busyId === r.id}
                  type="button"
                  variant="error"
                  size="sm"
                >
                  {busyId === r.id ? "…" : "Delete"}
                </Button>
                <ConfirmDialog
                  id={`delete-review-${r.id}`}
                  title="Delete review"
                  description={`Delete review #${r.id} by ${r.user.username} for "${r.book.title}"?`}
                  confirmLabel="Delete"
                  confirmVariant="error"
                  onConfirmAction={() => onDelete(r)}
                  busy={busyId === r.id}
                />
              </div>
            </div>

            <div className="mt-3 text-sm opacity-80">{r.body?.trim() ? r.body : "—"}</div>
            <div className="mt-2 text-xs opacity-60">Created {new Date(r.created_at).toLocaleString()}</div>
          </Panel>
        ))}

        {!loading && items.length === 0 && (
          <Panel className="text-sm opacity-70" padding="md">
            No reviews found.
          </Panel>
        )}
      </div>
    </div>
  );
}
