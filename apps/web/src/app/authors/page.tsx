import { apiGet } from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import Panel from "@/components/Panel";
import MediaPlaceholder from "@/components/MediaPlaceholder";

type Author = {
  id: number;
  name: string;
  bio?: string | null;
  photo_url?: string | null;
};

export default async function AuthorsPage() {
  const authors = await apiGet<Author[]>("/authors", "server");

  return (
    <main className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">Authors</h1>
      </div>

      {authors.length === 0 ? (
        <p className="text-ctp-subtext0">No authors found.</p>
      ) : (
        <ul className="space-y-3">
          {authors.map((a) => (
            <Panel as="li" key={a.id} padding="md">
              <div className="flex flex-wrap items-start gap-4">
                {mediaUrl(a.photo_url) ? (
                  <img
                    src={mediaUrl(a.photo_url) ?? ""}
                    alt={`${a.name} portrait`}
                    className="h-16 w-16 rounded-md border border-ctp-surface1 object-cover"
                  />
                ) : (
                  <MediaPlaceholder className="h-16 w-16" variant="mantle">
                    No photo
                  </MediaPlaceholder>
                )}

                <div className="min-w-0 flex-1">
                  <a href={`/authors/${a.id}`} className="text-lg font-semibold hover:underline">
                    {a.name}
                  </a>
                  {a.bio ? (
                    <p className="mt-2 text-sm text-ctp-subtext0">{a.bio}</p>
                  ) : (
                    <p className="mt-2 text-sm text-ctp-subtext0">No bio.</p>
                  )}
                </div>
              </div>
            </Panel>
          ))}
        </ul>
      )}
    </main>
  );
}
