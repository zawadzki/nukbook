import { apiGet } from "@/lib/api";
import StarRatingAvg from "@/components/ui/StarRatingAvg";
import Panel from "@/components/ui/Panel";
import BookCover from "@/components/ui/BookCover";

type Book = {
  id: number;
  title: string;
  published_year?: number | null;
  cover_url?: string | null;
  rating_avg?: number | null;
  rating_count: number;
  authors: { id: number; name: string }[];
};

export default async function BooksPage() {
  const books = await apiGet<Book[]>("/books", "server");

  return (
    <main className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">Books</h1>
      </div>

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

                  {b.authors?.length ? (
                    <div className="mt-0 text-sm text-ctp-subtext0">
                      <span className="font-medium text-ctp-subtext0">Authors:</span>{" "}
                      {b.authors.map((a, index) => (
                        <span key={a.id}>
                          <a href={`/authors/${a.id}`} className="hover:underline">
                            {a.name}
                          </a>
                          {index < b.authors.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </div>
                  ) : null}

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
    </main>
  );
}
