import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { SEO, breadcrumbSchema } from "@/components/SEO";
import { VideoCard } from "@/components/VideoCard";
import {
  Search, X, SlidersHorizontal, Tv, Cpu, Gamepad2,
  Trophy, Film, Mic, Newspaper, Music, Grid3X3, Flame, Layers, Scissors, Star
} from "lucide-react";

// ── Tab types ──────────────────────────────────────────────────────────────
type TabMode = "category" | "brand";

interface Tab {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;
  mode: TabMode;
  brandFilter?: string; // for brand tabs
}

const TABS: Tab[] = [
  { key: "all",           label: "All",              icon: Grid3X3,   color: "oklch(0.74 0.21 218)",  mode: "category" },
  { key: "ztvlive",       label: "ZTVLIVE Originals", icon: Star,      color: "oklch(0.74 0.21 218)",  mode: "brand",    brandFilter: "ZTVLIVE" },
  { key: "communitycut",  label: "CommunityCut",      icon: Scissors,  color: "oklch(0.78 0.18 60)",   mode: "brand",    brandFilter: "CommunityCut" },
  { key: "live",          label: "Live",              icon: Tv,        color: "oklch(0.65 0.25 25)",   mode: "category" },
  { key: "tech",          label: "Tech",              icon: Cpu,       color: "oklch(0.74 0.21 218)",  mode: "category" },
  { key: "gaming",        label: "Gaming",            icon: Gamepad2,  color: "oklch(0.65 0.25 290)",  mode: "category" },
  { key: "sports",        label: "Sports",            icon: Trophy,    color: "oklch(0.65 0.22 150)",  mode: "category" },
  { key: "movies",        label: "Movies",            icon: Film,      color: "oklch(0.78 0.18 60)",   mode: "category" },
  { key: "podcasts",      label: "Podcasts",          icon: Mic,       color: "oklch(0.7 0.18 200)",   mode: "category" },
  { key: "news",          label: "News",              icon: Newspaper, color: "oklch(0.72 0.2 25)",    mode: "category" },
  { key: "music",         label: "Music",             icon: Music,     color: "oklch(0.7 0.2 320)",    mode: "category" },
  { key: "other",         label: "Other",             icon: Layers,    color: "oklch(0.6 0.05 264)",   mode: "category" },
];

export default function Library() {
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const initialTab = params.get("category") ?? params.get("tab") ?? "all";
  const initialSearch = params.get("search") ?? "";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const tab = TABS.find((t) => t.key === activeTab) ?? TABS[0];

  // Build query params based on tab mode
  const queryParams = {
    category: tab.mode === "category" && tab.key !== "all" ? tab.key : undefined,
    creatorName: tab.mode === "brand" ? tab.brandFilter : undefined,
    search: debouncedSearch || undefined,
    limit: 48,
  };

  const { data, isLoading } = trpc.videos.list.useQuery(queryParams, { staleTime: 30000 });

  const { data: watchlistIds = [], refetch: refetchWatchlist } = trpc.watchlist.ids.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const videos = data?.items ?? [];

  const schemas = [breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Library", url: "/library" }])];

  return (
    <>
      <SEO
        title="Watch Free Shows & Movies Online | ZTVLIVE Video Library"
        description="Browse 500+ free shows, movies, podcasts & live events on ZTVLIVE. Stream tech, gaming, sports, music, news & culture on demand — no subscription required."
        url="/library"
        schema={schemas}
      />

      <div className="min-h-screen bg-background">
        {/* ── HERO BANNER ───────────────────────────── */}
        <div className="relative overflow-hidden py-10 bg-gradient-to-b from-[oklch(0.74_0.21_218/0.05)] to-transparent">
          <div className="absolute top-0 right-0 w-96 h-48 bg-[oklch(0.56_0.24_290/0.05)] rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: `${tab.color}15`, border: `1px solid ${tab.color}25` }}>
                    <tab.icon className="w-4 h-4" style={{ color: tab.color }} />
                  </div>
                  <h1 className="text-3xl font-black text-white">
                    {tab.key === "all" ? "Video Library" : `${tab.label}`}
                  </h1>
                </div>
                <p className="text-white/45 text-sm">
                  {isLoading ? "Loading…" : `${videos.length} video${videos.length !== 1 ? "s" : ""} available`}
                </p>
              </div>

              {/* Search */}
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  placeholder="Search videos, creators, topics…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white/6 border border-white/10
                    text-sm text-white placeholder-white/30
                    outline-none focus:border-[oklch(0.74_0.21_218/0.4)] focus:bg-white/8
                    transition-all"
                />
                {search && (
                  <button onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── CATEGORY / BRAND TABS ─────────────────── */}
        <div className="sticky top-0 z-20 bg-[oklch(0.08_0.012_264/0.95)] backdrop-blur-md border-b border-white/6">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            {/* Brand tabs row */}
            <div className="flex gap-1.5 overflow-x-auto pt-3 pb-1 scrollbar-hide">
              {TABS.filter(t => t.mode === "brand" || t.key === "all").map((t) => {
                const isActive = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold shrink-0
                      transition-all duration-150 active:scale-95 ${
                        isActive
                          ? "text-[oklch(0.08_0.012_264)]"
                          : "bg-white/5 text-white/55 hover:bg-white/10 hover:text-white border border-white/8"
                      }`}
                    style={isActive ? {
                      background: t.color,
                      boxShadow: `0 0 12px ${t.color}40`,
                    } : {}}
                  >
                    <t.icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                );
              })}

              {/* Divider */}
              <div className="w-px bg-white/10 mx-1 self-stretch shrink-0" />

              {/* Category tabs */}
              {TABS.filter(t => t.mode === "category" && t.key !== "all").map((t) => {
                const isActive = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold shrink-0
                      transition-all duration-150 active:scale-95 ${
                        isActive
                          ? "text-[oklch(0.08_0.012_264)]"
                          : "bg-white/5 text-white/55 hover:bg-white/10 hover:text-white border border-white/8"
                      }`}
                    style={isActive ? {
                      background: t.color,
                      boxShadow: `0 0 12px ${t.color}40`,
                    } : {}}
                  >
                    <t.icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Brand badge for brand tabs */}
            {tab.mode === "brand" && (
              <div className="pb-2 flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: `${tab.color}20`, color: tab.color, border: `1px solid ${tab.color}30` }}>
                  {tab.brandFilter} Content
                </span>
                <span className="text-xs text-white/30">Curated by ZTVLIVE</span>
              </div>
            )}
          </div>
        </div>

        {/* ── CONTENT GRID ──────────────────────────── */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Active filters bar */}
          {(search || activeTab !== "all") && (
            <div className="flex items-center gap-3 mb-6 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-white/40">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filters:
              </div>
              {activeTab !== "all" && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/8 border border-white/12 text-xs text-white/70">
                  {tab.label}
                  <button onClick={() => setActiveTab("all")} className="hover:text-white transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              {search && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/8 border border-white/12 text-xs text-white/70">
                  "{search}"
                  <button onClick={() => setSearch("")} className="hover:text-white transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <button
                onClick={() => { setSearch(""); setActiveTab("all"); }}
                className="text-xs text-[oklch(0.74_0.21_218)] hover:underline font-semibold">
                Clear all
              </button>
            </div>
          )}

          {isLoading ? (
            /* Loading skeletons */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="aspect-video rounded-xl bg-white/5 animate-pulse" />
                  <div className="h-3 rounded bg-white/5 animate-pulse w-4/5" />
                  <div className="h-2.5 rounded bg-white/4 animate-pulse w-2/3" />
                </div>
              ))}
            </div>
          ) : videos.length === 0 ? (
            /* Empty state */
            <div className="text-center py-24">
              <div className="w-20 h-20 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center mx-auto mb-5">
                <Search className="w-9 h-9 text-white/15" />
              </div>
              <h2 className="text-xl font-black text-white mb-2">No videos found</h2>
              <p className="text-white/35 text-sm mb-6">
                {search ? `No results for "${search}"` : `No ${tab.label} videos yet`}
              </p>
              <button
                onClick={() => { setSearch(""); setActiveTab("all"); }}
                className="px-6 py-2.5 rounded-xl border border-white/15 text-white/70 hover:text-white hover:border-white/30 text-sm font-semibold transition-all">
                Browse all videos
              </button>
            </div>
          ) : (
            <>
              {/* Trending row (if not searching and on All tab) */}
              {!debouncedSearch && activeTab === "all" && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Flame className="w-5 h-5 text-orange-400" />
                    <h2 className="text-lg font-black text-white">Trending Now</h2>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    {videos.slice(0, 8).map((video) => (
                      <VideoCard
                        key={video.id}
                        video={video}
                        watchlistIds={watchlistIds}
                        onWatchlistChange={refetchWatchlist}
                        size="md"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Full grid */}
              <div>
                {!debouncedSearch && activeTab === "all" && (
                  <h2 className="text-lg font-black text-white mb-4">All Videos</h2>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                  {videos.map((video) => (
                    <div key={video.id} className="min-w-0">
                      <VideoCard
                        video={video}
                        watchlistIds={watchlistIds}
                        onWatchlistChange={refetchWatchlist}
                        size="sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
