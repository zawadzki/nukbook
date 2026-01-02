import TimelinePanel from "@/components/TimelinePanel";
import RecommendationsPanel from "@/components/RecommendationsPanel";
import ActivityFeed from "@/components/ActivityFeed";
import TopAuthorsPanel from "@/components/TopAuthorsPanel";

export default function Home() {
  return (
    <main className="space-y-4 flex flex-wrap">

      <div className="hero bg-ctp-base rounded-lg border border-ctp-surface0 min-h-60">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-5xl font-bold">nukBook</h1>
            <p className="py-6">
              This is my testing ground for FastAPI + Next.js stack.
            </p>
            <a href="/books" className="btn btn-primary">Get Started</a>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-5 w-full">
        <div className="grow">
          <TimelinePanel/>
        </div>

        <div className="flex flex-col gap-5">
          <div className="w-full max-w-prose">
            <ActivityFeed/>
          </div>

          <div className="w-full max-w-prose">
            <TopAuthorsPanel/>
          </div>

          <div className="w-full max-w-prose">
            <RecommendationsPanel/>
          </div>
        </div>
      </div>

    </main>
  );
}
