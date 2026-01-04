import { notFound } from "next/navigation";
import { apiGet } from "@/lib/api";
import ReviewsPanel, { type Review } from "@/components/ReviewsPanel";
import ShelfButtons from "@/components/ShelfButtons";
import ShelfPill from "@/components/ShelfPill";
import StarRatingAvg from "@/components/StarRatingAvg";
import Panel from "@/components/Panel";
import SurfaceCard from "@/components/SurfaceCard";
import BookCover from "@/components/BookCover";
import {ChevronLeftIcon} from "@heroicons/react/16/solid";

type Book = {
  id: number;
  title: string;
  description?: string | null;
  published_year?: number | null;
  cover_url?: string | null;
  rating_avg?: number | null;
  rating_count: number;
  authors: { id: number; name: string }[];
  tags: { id: number; name: string }[];
  genres: { id: number; name: string }[];
};


export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const p =
    typeof (params as any)?.then === "function"
      ? await (params as Promise<{ id: string }>)
      : (params as { id: string });

  const bookId = Number.parseInt(String(p?.id ?? ""), 10);
  if (!Number.isFinite(bookId)) notFound();

  const book = await apiGet<Book>(`/books/${bookId}`, "server");
  const reviews = await apiGet<Review[]>(`/books/${bookId}/reviews`, "server").catch(() => []);
  const similar = await apiGet<{ book: Book; reasons: string[] }[]>(
    `/books/${bookId}/similar?limit=6`,
    "server"
  ).catch(() => []);

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <a className="btn btn-outline btn-primary btn-sm rounded-full" href="/books">
          <ChevronLeftIcon className="w-5 h-5"/>
          Back to books
        </a>
      </div>

      <Panel as="section" padding="lg">
        <div className="flex flex-wrap items-start gap-4">
          <BookCover
            coverUrl={book.cover_url}
            title={book.title}
            className="h-38 w-27"
            placeholder="No cover"
            placeholderVariant="mantle"
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">{book.title}</h1>
              <ShelfPill bookId={bookId} />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ctp-text">
              {book.published_year ? <span>{book.published_year} • </span> : null}

              {book.rating_count > 0 && book.rating_avg != null ? (
                <>
                  <StarRatingAvg value={book.rating_avg} size="sm" />
                  <span className="text-ctp-subtext0">({book.rating_count})</span>
                  <span className="text-ctp-subtext0">{book.rating_avg.toFixed(2)}</span>
                </>
              ) : (
                <span className="text-ctp-subtext0">No ratings yet</span>
              )}
            </div>

            {book.authors?.length ? (
              <div className="mt-2 text-sm text-ctp-text">
                <span className="font-medium text-ctp-subtext1">Authors:</span>{" "}
                {book.authors.map((a, index) => (
                  <span key={a.id}>
                    <a href={`/authors/${a.id}`} className="hover:underline">
                      {a.name}
                    </a>
                    {index < book.authors.length - 1 ? ", " : ""}
                  </span>
                ))}
              </div>
            ) : null}

            {book.genres?.length ? (
              <div className="mt-2 text-sm text-ctp-text">
                <span className="font-medium text-ctp-subtext1">Genres:</span>{" "}
                {book.genres.map((g, index) => (
                  <span key={g.id}>
                    {g.name}
                    {index < book.genres.length - 1 ? ", " : ""}
                  </span>
                ))}
              </div>
            ) : null}

            {book.tags?.length ? (
              <div className="mt-2 text-sm text-ctp-text">
                <span className="font-medium text-ctp-subtext1">Tags:</span>{" "}
                {book.tags.map((t, index) => (
                  <span key={t.id}>
                    {t.name}
                    {index < book.tags.length - 1 ? ", " : ""}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {book.description ? (
          <p className="mt-4 whitespace-pre-wrap text-ctp-subtext1">{book.description}</p>
        ) : (
          <p className="mt-4 text-sm text-ctp-subtext0">No description.</p>
        )}
      </Panel>

      <ShelfButtons bookId={bookId} />

      <ReviewsPanel bookId={bookId} reviews={reviews} />

      <Panel as="section" padding="lg" className="space-y-3">
        <h2 className="text-xl font-semibold">Similar to this book</h2>
        {similar.length === 0 ? (
          <p className="text-sm text-ctp-subtext0">No similar books yet.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-3">
            {similar.map((item) => (
              <SurfaceCard as="li" key={item.book.id} padding="sm">
                <div className="flex gap-3">
                  <BookCover
                    coverUrl={item.book.cover_url}
                    title={item.book.title}
                    className="h-16 w-12"
                    placeholder="No cover"
                  />

                  <div className="min-w-0 flex-1">
                    <a className="font-medium hover:underline" href={`/books/${item.book.id}`}>
                      {item.book.title}
                    </a>
                    {item.book.authors?.length ? (
                      <div className="text-xs text-ctp-subtext0">
                        {item.book.authors.map((a, index) => (
                          <span key={a.id}>
                            <a href={`/authors/${a.id}`} className="hover:underline">
                              {a.name}
                            </a>
                            {index < item.book.authors.length - 1 ? ", " : ""}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {item.reasons?.length ? (
                      <div className="mt-1 text-[11px] text-ctp-subtext0">
                        {item.reasons.join(" · ")}
                      </div>
                    ) : null}
                    <div className="mt-2 flex items-center gap-2 text-xs text-ctp-subtext0">
                      {item.book.rating_count > 0 && item.book.rating_avg != null ? (
                        <StarRatingAvg value={item.book.rating_avg} size="xs" />
                      ) : (
                        <span>No ratings</span>
                      )}
                      <span>({item.book.rating_count})</span>
                    </div>
                  </div>
                </div>
              </SurfaceCard>
            ))}
          </ul>
        )}
      </Panel>
    </main>
  );
}
