import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { SEO, breadcrumbSchema } from "@/components/SEO";
import { VideoCard } from "@/components/VideoCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, SlidersHorizontal } from "lucide-react";

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "tech", label: "Tech" },
  { key: "gaming", label: "Gaming" },
  { key: "sports", label: "Sports" },
  { key: "movies", label: "Movies" },
  { key: "podcasts", label: "Podcasts" },
  { key: "news", label: "News" },
  { key: "music", label: "Music" },
  { key: "other", label: "Other" },
];

export default function Library() {
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const initialCategory = params.get("category") ?? "all";
  const initialSearch = params.get("search") ?? "";

  const [category, setCategory] = useState(initialCategory);
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = trpc.videos.list.useQuery(
    {
      category: category === "all" ? undefined : category,
      search: debouncedSearch || undefined,
      limit: 48,
    },
    { staleTime: 30000 }
  );

  const { data: watchlistIds = [], refetch: refetchWatchlist } = trpc.watchlist.ids.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const videos = data?.items ?? [];

  const schemas = [
    breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Library", url: "/library" },
    ]),
  ];

  return (
    <>
      <SEO
        title="Video Library — Browse All Content"
        description="Browse ZTVLIVE's full video library. Filter by tech, gaming, sports, movies, podcasts, news, music, and more. Add to your watchlist."
        url="/library"
        schema={schemas}
      />

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2">Video Library</h1>
          <p className="text-white/50 text-sm">Browse thousands of videos across every category</p>
        </div>

        {/* Search + Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input
              type="text"
              placeholder="Search videos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[oklch(0.72_0.2_220/0.5)]"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/30">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{videos.length} results</span>
          </div>
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={`category-pill shrink-0 ${category === cat.key ? "active" : ""}`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg bg-white/5 animate-pulse"
                style={{ paddingBottom: "calc(56.25% + 60px)" }}
              />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-20">
            <Search className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/40 text-lg font-semibold">No videos found</p>
            <p className="text-white/25 text-sm mt-1">Try a different search or category</p>
            <Button
              onClick={() => { setSearch(""); setCategory("all"); }}
              variant="outline"
              className="mt-4 border-white/20 text-white hover:bg-white/10 text-sm"
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {videos.map((video) => (
              <div key={video.id} className="w-full">
                <VideoCard
                  video={video}
                  watchlistIds={watchlistIds}
                  onWatchlistChange={refetchWatchlist}
                  size="sm"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
