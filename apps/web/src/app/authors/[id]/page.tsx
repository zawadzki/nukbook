import { notFound } from "next/navigation";
import { apiGet } from "@/lib/api";
import StarRatingAvg from "@/components/StarRatingAvg";
import { mediaUrl } from "@/lib/media";
import AuthorLikeButton from "@/components/AuthorLikeButton";
import Panel from "@/components/Panel";
import MediaPlaceholder from "@/components/MediaPlaceholder";
import BookCover from "@/components/BookCover";
import { ChevronLeftIcon } from "@heroicons/react/16/solid";

type Author = {
  id: number;
  name: string;
  bio?: string | null;
  photo_url?: string | null;
};

type Book = {
  id: number;
  title: string;
  published_year?: number | null;
  cover_url?: string | null;
  rating_avg?: number | null;
  rating_count: number;
};

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const p =
    typeof (params as any)?.then === "function"
      ? await (params as Promise<{ id: string }>)
      : (params as { id: string });

  const authorId = Number.parseInt(String(p?.id ?? ""), 10);
  if (!Number.isFinite(authorId)) notFound();

  const author = await apiGet<Author>(`/authors/${authorId}`, "server");
  const books = await apiGet<Book[]>(`/authors/${authorId}/books`, "server");

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <a className="btn btn-outline btn-primary btn-sm rounded-full" href="/authors">
          <ChevronLeftIcon className="w-5 h-5"/>
          Back to authors
        </a>
      </div>

      <Panel as="section" padding="lg">
        <div className="flex flex-wrap items-start gap-4">
          {mediaUrl(author.photo_url) ? (
            <img
              src={mediaUrl(author.photo_url) ?? ""}
              alt={`${author.name} portrait`}
              className="h-24 w-24 rounded-md object-cover"
            />
            ) : (
              <MediaPlaceholder className="h-24 w-24" variant="mantle">
                No photo
              </MediaPlaceholder>
            )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">{author.name}</h1>
              <AuthorLikeButton authorId={authorId} />
            </div>
            {author.bio ? (
              <p className="mt-3 whitespace-pre-wrap text-ctp-subtext1">{author.bio}</p>
            ) : (
              <p className="mt-3 text-sm text-ctp-subtext0">No bio.</p>
            )}
          </div>
        </div>
      </Panel>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Books</h2>
        {books.length === 0 ? (
          <p className="text-ctp-subtext0">No books found.</p>
        ) : (
          <ul className="space-y-3">
            {books.map((b) => (
              <Panel as="li" key={b.id} padding="md">
                <div className="flex flex-wrap items-start gap-4">
                  <BookCover
                    coverUrl={b.cover_url}
                    title={b.title}
                    className="h-20 w-14"
                    placeholder="No cover"
                    placeholderVariant="mantle"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <a href={`/books/${b.id}`} className="text-lg font-semibold hover:underline">
                        {b.title}
                      </a>
                      {b.published_year ? (
                        <span className="text-sm text-ctp-subtext0">{b.published_year}</span>
                      ) : null}
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-sm text-ctp-subtext0">
                      {b.rating_count > 0 && b.rating_avg != null ? (
                        <StarRatingAvg value={b.rating_avg} size="xs" />
                      ) : (
                        <span className="text-ctp-subtext0">No ratings</span>
                      )}
                      <span className="text-ctp-subtext0">({b.rating_count})</span>
                    </div>
                  </div>
                </div>
              </Panel>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
