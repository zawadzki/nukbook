"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ReviewForm from "@/components/templates/ReviewForm";
import { apiGet, apiSend } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import { PencilSquareIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import StarRating from "@/components/ui/StarRating";
import StarRatingInput from "@/components/ui/StarRatingInput";
import { useBookShelves } from "@/hooks/useBookShelves";
import { pushToast } from "@/lib/toast";
import Button from "@/components/ui/Button";
import Panel from "@/components/ui/Panel";
import SurfaceBadge from "@/components/ui/SurfaceBadge";
import Avatar from "@/components/ui/Avatar";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type Me = { id: number; email: string; username: string; role: string };

export type Review = {
  id: number;
  user_id: number;
  book_id: number;
  rating: number;
  body?: string | null;
  created_at: string;
  user: { id: number; username: string; avatar_url?: string | null };
};

function formatReviewDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Reviewed on —";
  const pretty = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  }).format(d);
  return `Reviewed on ${pretty}`;
}

export default function ReviewsPanel({
  bookId,
  reviews,
}: {
  bookId: number;
  reviews: Review[];
}) {
  const router = useRouter();
  const { shelves } = useBookShelves(bookId);
  const canReview = !!shelves?.some((s) => s.is_system && s.has_book && s.name === "read");

  const [me, setMe] = useState<Me | null>(null);
  const [meReady, setMeReady] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Review | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ratingStatus, setRatingStatus] = useState<string | null>(null);
  const [ratingBusy, setRatingBusy] = useState(false);
  const [quickRating, setQuickRating] = useState(0);
  const deleteDialogId = `delete-review-${bookId}`;

  // local optimistic delete
  const [deletedMyReview, setDeletedMyReview] = useState(false);

  const token = useMemo(() => getToken(), []);

  // Load current user
  useEffect(() => {
    async function run() {
      try {
        if (!token) {
          setMe(null);
          return;
        }

        const meData = await apiGet<Me>("/auth/me", "browser", undefined, token);
        setMe(meData);
      } catch {
        clearToken();
        setMe(null);
      } finally {
        setMeReady(true);
      }
    }
    void run();
  }, [token]);

  const myReview = useMemo(() => {
    if (!me || deletedMyReview) return null;
    return reviews.find((r) => r.user_id === me.id) ?? null;
  }, [me, reviews, deletedMyReview]);
  const hasReviewText = (myReview?.body ?? "").trim().length > 0;

  useEffect(() => {
    setQuickRating(myReview?.rating ?? 0);
  }, [myReview]);

  const visibleReviews = useMemo(() => {
    const withText = reviews.filter((r) => (r.body ?? "").trim().length > 0);
    if (!me || !deletedMyReview) return withText;
    return withText.filter((r) => r.user_id !== me.id);
  }, [reviews, me, deletedMyReview]);

  function startCreate() {
    setStatus(null);
    setEditing(null);
    setOpen(true);
  }

  function startEdit(r: Review) {
    setStatus(null);
    setEditing(r);
    setOpen(true);
  }

  async function saveQuickRating(nextRating: number) {
    if (!canReview) return;
    setRatingStatus(null);
    const tokenNow = getToken();
    if (!tokenNow) {
      setRatingStatus("Login to rate.");
      return;
    }

    const prev = quickRating;
    setQuickRating(nextRating);
    setRatingBusy(true);

    try {
      await apiSend(
        `/books/${bookId}/reviews`,
        "browser",
        "POST",
        { rating: nextRating, body: myReview?.body ?? null },
        tokenNow
      );
      setRatingStatus("Saved.");
      pushToast({ message: "Rating saved.", variant: "success" });
      router.refresh();
    } catch (e: any) {
      setQuickRating(prev);
      setRatingStatus(e?.message ?? "Failed to save rating");
      pushToast({ message: "Failed to save rating.", variant: "error" });
    } finally {
      setRatingBusy(false);
    }
  }

  async function deleteMyReview() {
    setStatus(null);
    setBusy(true);

    try {
      const tokenNow = getToken();
      if (!tokenNow) {
        setStatus("You must be logged in.");
        return;
      }

      // optimistic
      setDeletedMyReview(true);

      await apiSend(`/books/${bookId}/reviews/me`, "browser", "DELETE", undefined, tokenNow);

      setOpen(false);
      setEditing(null);
      setStatus("Deleted.");
      router.refresh();
    } catch (e: any) {
      setDeletedMyReview(false);
      setStatus(e?.message ?? "Failed to delete review");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel as="section" padding="md" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Reviews</h2>

        {meReady && me ? (
          canReview ? (
            <div className="flex flex-wrap items-center gap-3">
              <SurfaceBadge className="flex flex-wrap items-center gap-1">
                <span className="text-ctp-subtext0">Your rating</span>
                <StarRatingInput
                  value={quickRating}
                  onChangeAction={saveQuickRating}
                  size="sm"
                  disabled={ratingBusy}
                />
                {ratingBusy ? (
                  <span className="text-xs text-ctp-subtext0">Saving...</span>
                ) : ratingStatus ? (
                  <span className="text-xs text-ctp-subtext0">{ratingStatus}</span>
                ) : null}
              </SurfaceBadge>

              {!hasReviewText ? (
                <Button onClick={startCreate} variant="primary">
                  Write a review
                </Button>
              ) : null}

              {myReview && hasReviewText ? (
                <Button onClick={() => startEdit(myReview)} variant="info" title="Edit your review">
                  Edit
                </Button>
              ) : null}
              {myReview ? (
                <ConfirmDialog
                  id={deleteDialogId}
                  title="Delete review"
                  description="This will remove your review for this book."
                  confirmLabel="Delete"
                  confirmVariant="error"
                  onConfirmAction={deleteMyReview}
                  busy={busy}
                />
              ) : null}
            </div>
          ) : (
            <span className="text-sm text-ctp-subtext0">Finish this book to rate or review.</span>
          )
        ) : (
          <a
            href="/login"
            className="rounded-md bg-ctp-surface0 px-3 py-2 text-sm font-medium text-ctp-text hover:bg-ctp-text hover:text-ctp-base"
          >
            Login to rate
          </a>
        )}
      </div>

      {status ? <p className="text-sm text-ctp-text">{status}</p> : null}

      {visibleReviews.length === 0 ? (
        <p className="text-ctp-text">No reviews yet.</p>
      ) : (
        <ul className="space-y-3">
          {visibleReviews.map((r) => {
            const isMine = !!me && r.user_id === me.id;

            return (
            <Panel as="li" key={r.id} padding="md">
              <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Avatar src={r.user?.avatar_url} username={r.user?.username} size="xs" />
                      <StarRating value={r.rating} size="sm" />
                      <a className="text-sm text-ctp-text hover:underline" href={`/users/${r.user?.id}`}>
                        @{r.user?.username ?? "user"}
                      </a>
                      <span className="text-xs text-ctp-subtext0">{formatReviewDate(r.created_at)}</span>
                    </div>

                    <div className="mt-2 text-ctp-text">
                      {r.body ?? <span className="text-ctp-subtext0">(no text)</span>}
                    </div>
                  </div>

                  {isMine ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <Button onClick={() => startEdit(r)} variant="info" size="icon" title="Edit">
                        <PencilSquareIcon className="h-5 w-5" />
                      </Button>
                      <Button
                        onClick={() => {
                          const el = document.getElementById(deleteDialogId) as HTMLDialogElement | null;
                          el?.showModal();
                        }}
                        disabled={busy}
                        variant="error"
                        size="icon"
                        title="Delete"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </Button>
                    </div>
                  ) : null}
                </div>
            </Panel>
          );
        })}
        </ul>
      )}

      {open ? (
        <Panel variant="mantle" padding="md">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">{editing ? "Edit your review" : "Write a review"}</h3>
            <Button
              onClick={() => {
                setOpen(false);
                setEditing(null);
              }}
              variant="ghost"
              size="icon"
              title="Close"
              aria-label="Close"
            >
              <XMarkIcon className="h-5 w-5" />
            </Button>
          </div>

          <ReviewForm
            bookId={bookId}
            initialRating={editing?.rating ?? (quickRating > 0 ? quickRating : 5)}
            initialBody={editing?.body ?? ""}
            onSaved={() => {
              setOpen(false);
              setEditing(null);
              setDeletedMyReview(false);
              router.refresh();
            }}
          />

          {editing ? (
            <Button
              onClick={() => {
                const el = document.getElementById(deleteDialogId) as HTMLDialogElement | null;
                el?.showModal();
              }}
              disabled={busy}
              variant="error"
              className="mt-3"
            >
              Delete my review
            </Button>
          ) : null}
        </Panel>
      ) : null}
    </Panel>
  );
}
