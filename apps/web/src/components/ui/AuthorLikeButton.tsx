"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiSend } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";
import { HeartIcon as HeartOutline } from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";

export default function AuthorLikeButton({ authorId }: { authorId: number }) {
  const token = useMemo(() => getToken(), []);
  const [liked, setLiked] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!token) {
        setReady(true);
        return;
      }
      try {
        const data = await apiGet<{ liked: boolean }>(`/authors/${authorId}/liked`, "browser", undefined, token);
        if (!cancelled) setLiked(data.liked);
      } catch {
        if (!cancelled) setLiked(false);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authorId, token]);

  async function toggleLike() {
    if (!token) return;
    const next = !liked;
    setLiked(next);
    try {
      await apiSend(`/authors/${authorId}/liked`, "browser", "POST", { liked: next }, token);
    } catch {
      setLiked(!next);
    }
  }

  if (!ready || !token) return null;

  return (
    <Button
      onClick={toggleLike}
      variant="ghost"
      size="icon"
      radius="full"
      title={liked ? "Unlike author" : "Like author"}
      aria-label={liked ? "Unlike author" : "Like author"}
    >
      {liked ? <HeartSolid className="h-5 w-5 text-primary" /> : <HeartOutline className="h-5 w-5" />}
    </Button>
  );
}
