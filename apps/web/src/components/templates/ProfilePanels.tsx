import Panel from "@/components/ui/Panel";
import SurfaceCard from "@/components/ui/SurfaceCard";
import BookCover from "@/components/ui/BookCover";
import Avatar from "@/components/ui/Avatar";
import StarRating from "@/components/ui/StarRating";
import Button from "@/components/ui/Button";
import { formatRelativeTime } from "@/lib/time";
import { trimWords } from "@/lib/text";

export type Shelf = {
  id: number;
  name: string;
  visibility: "public" | "followers" | "private";
  book_count: number;
  books: { id: number; title: string; cover_url?: string | null }[];
};

export type LikedAuthor = {
  id: number;
  name: string;
  photo_url?: string | null;
  liked_at: string;
};

export type ActivityItem = {
  type: "status" | "review";
  book: { id: number; title: string; cover_url?: string | null; authors?: { id: number; name: string }[] };
  status?: "want_to_read" | "reading" | "finished" | "dropped" | null;
  rating?: number | null;
  body?: string | null;
  updated_at: string;
};

const STATUS_LABELS: Record<string, string> = {
  want_to_read: "wants to read",
  reading: "started reading",
  finished: "finished",
  dropped: "dropped",
};

const LABELS: Record<string, string> = {
  "want-to-read": "Want to read",
  reading: "Reading",
  read: "Read",
  dropped: "Dropped",
};

function displayShelfName(name: string) {
  return LABELS[name] ?? name;
}

type ShelvesPanelProps = {
  title?: string;
  shelves: Shelf[];
  status?: string | null;
};

export function ShelvesPanel({ title = "Shelves", shelves, status }: ShelvesPanelProps) {
  return (
    <Panel as="section" padding="md">
      <h2 className="text-lg font-semibold">{title}</h2>
      {status ? <p className="text-sm text-ctp-subtext0">{status}</p> : null}
      {shelves.length === 0 && !status ? (
        <p className="text-sm text-ctp-subtext0">No shelves available.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {shelves.filter((s) => s.book_count > 0).map((s) => (
            <SurfaceCard key={s.id} padding="sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{displayShelfName(s.name)}</div>
                  <div className="text-xs text-ctp-subtext0">
                    {s.book_count} books · {s.visibility}
                  </div>
                </div>
              </div>

              {s.books.length > 0 ? (
                <ul className="mt-3 grid gap-2 md:grid-cols-3">
                  {s.books.map((b) => (
                    <li key={b.id} className="flex items-center gap-2 text-sm">
                      <BookCover coverUrl={b.cover_url} title={b.title} className="h-10 w-8" />
                      <a href={`/books/${b.id}`} className="hover:underline">
                        {b.title}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-ctp-subtext0">No books in this shelf.</p>
              )}
            </SurfaceCard>
          ))}
        </div>
      )}
    </Panel>
  );
}

type ActivityPanelProps = {
  title?: string;
  items: ActivityItem[];
  status?: string | null;
  onLoadMore?: () => void;
  loading?: boolean;
  done?: boolean;
};

export function ActivityPanel({
  title = "Activity",
  items,
  status,
  onLoadMore,
  loading,
  done,
}: ActivityPanelProps) {
  return (
    <Panel as="section" padding="md">
      <h2 className="text-lg font-semibold">{title}</h2>
      {status ? <p className="text-sm text-ctp-subtext0">{status}</p> : null}
      {items.length === 0 && !status ? (
        <p className="text-sm text-ctp-subtext0">No activity yet.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {items.map((item, idx) => {
            const when = formatRelativeTime(item.updated_at);
            const label =
              item.type === "status"
                ? STATUS_LABELS[item.status ?? "reading"]
                : "reviewed";
            return (
              <SurfaceCard key={`${item.type}-${item.book.id}-${idx}`} padding="sm">
                <div className="flex gap-3">
                  <BookCover
                    coverUrl={item.book.cover_url}
                    title={item.book.title}
                    className="h-12 w-9"
                  />
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-ctp-subtext0">{label}</span>
                      <a href={`/books/${item.book.id}`} className="font-medium hover:underline">
                        {item.book.title}
                      </a>
                      {when ? <span className="text-xs text-ctp-subtext0">· {when}</span> : null}
                    </div>
                    {item.rating ? (
                      <div className="mt-1 text-xs text-ctp-subtext0">
                        <StarRating value={item.rating} size="xs" />
                      </div>
                    ) : null}
                    {item.body ? (
                      <div className="mt-1 text-xs text-ctp-subtext0">
                        {trimWords(item.body, 10)}
                      </div>
                    ) : null}
                  </div>
                </div>
              </SurfaceCard>
            );
          })}
        </ul>
      )}

      {items.length > 0 && !status && onLoadMore ? (
        <div className="mt-3 flex justify-center">
          <Button
            type="button"
            onClick={onLoadMore}
            disabled={loading || done}
            variant="outline"
            radius="full"
            size="sm"
          >
            {done ? "No more activity" : loading ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </Panel>
  );
}

type LikedAuthorsPanelProps = {
  title?: string;
  authors: LikedAuthor[];
  status?: string | null;
  gridClassName?: string;
};

export function LikedAuthorsPanel({
  title = "Liked authors",
  authors,
  status,
  gridClassName = "md:grid-cols-1",
}: LikedAuthorsPanelProps) {
  return (
    <Panel as="section" padding="md">
      <h2 className="text-lg font-semibold">{title}</h2>
      {status ? <p className="text-sm text-ctp-subtext0">{status}</p> : null}
      {authors.length === 0 && !status ? (
        <p className="text-sm text-ctp-subtext0">No liked authors yet.</p>
      ) : (
        <ul className={`mt-3 grid gap-2 ${gridClassName}`}>
          {authors.map((author) => {
            const likedAt = formatRelativeTime(author.liked_at);
            return (
              <SurfaceCard key={author.id} padding="sm">
                <a className="flex items-center gap-3" href={`/authors/${author.id}`}>
                  <Avatar src={author.photo_url} username={author.name} size="xs" />
                  <div>
                    <div className="font-medium hover:underline">{author.name}</div>
                    {likedAt ? <div className="text-xs text-ctp-subtext0">Liked {likedAt}</div> : null}
                  </div>
                </a>
              </SurfaceCard>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
