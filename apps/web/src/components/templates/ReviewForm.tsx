"use client";

import { useEffect, useState } from "react";
import { apiSend } from "@/lib/api";
import { getToken } from "@/lib/auth";
import StarRatingInput from "@/components/ui/StarRatingInput";
import { pushToast } from "@/lib/toast";
import Button from "@/components/ui/Button";

export default ({
                  bookId,
                  initialRating = 5,
                  initialBody = "",
                  onSaved,
                }: {
  bookId: number;
  initialRating?: number;
  initialBody?: string;
  onSaved: () => void;
}) => {
  const [rating, setRating] = useState(initialRating);
  const [body, setBody] = useState(initialBody);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // When editing changes, update the form fields
  useEffect(() => {
    setRating(initialRating);
    setBody(initialBody);
  }, [initialRating, initialBody]);

  async function submit() {
    setStatus(null);
    setLoading(true);
    try {
      const token = getToken();
      if (!token) {
        setStatus("You must be logged in to review.");
        return;
      }

      await apiSend(`/books/${bookId}/reviews`, "browser", "POST", { rating, body }, token);

      setStatus("Saved!");
      pushToast({ message: "Review saved.", variant: "success" });
      onSaved();
    } catch (e: any) {
      setStatus(e?.message ?? "Failed to save review");
      pushToast({ message: "Failed to save review.", variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 grid gap-3">
      <label className="grid gap-1 text-sm">
        <span className="text-ctp-text">Rating</span>
        <StarRatingInput value={rating} onChangeAction={setRating} size="md" />
      </label>

      <label className="grid gap-1 text-sm">
        <span className="text-ctp-text">Review (optional)</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-ctp-surface0 bg-ctp-base px-3 py-2 outline-none placeholder:text-ctp-overlay0 focus:border-ctp-surface1"
          placeholder="What did you think?"
        />
      </label>

      <Button onClick={submit} disabled={loading} variant="primary" className="w-fit">
        {loading ? "Saving..." : "Save review"}
      </Button>

      {status ? <p className="text-sm text-ctp-text">{status}</p> : null}
    </div>
  );
}
