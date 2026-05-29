import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { SEO, videoSchema, breadcrumbSchema } from "@/components/SEO";
import { toast } from "sonner";
import {
  Plus, Check, Share2, Tag, User, Eye, Clock,
  ChevronRight, Crown, ArrowLeft, Flame
} from "lucide-react";

function formatViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

function formatDuration(s: number | string) {
  if (typeof s === "string") return s;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

const CAT_COLORS: Record<string, string> = {
  tech: "oklch(0.74 0.21 218)", gaming: "oklch(0.65 0.25 290)",
  sports: "oklch(0.65 0.22 150)", movies: "oklch(0.78 0.18 60)",
  podcasts: "oklch(0.7 0.18 200)", news: "oklch(0.72 0.2 25)",
  music: "oklch(0.7 0.2 320)", live: "oklch(0.65 0.25 25)",
};

export default function Watch() {
  const params = useParams<{ id: string }>();
  const videoId = parseInt(params.id ?? "0", 10);
  const { isAuthenticated } = useAuth();

  const { data: video, isLoading } = trpc.videos.byId.useQuery({ id: videoId }, { enabled: !!videoId });
  const { data: watchlistIds = [], refetch: refetchWatchlist } = trpc.watchlist.ids.useQuery(
    undefined, { enabled: isAuthenticated }
  );
  const { data: related } = trpc.videos.trending.useQuery(undefined, { staleTime: 60000 });

  const addMutation = trpc.watchlist.add.useMutation({
    onSuccess: (data) => {
      if (data.alreadyAdded) toast.info("Already in your list");
      else { toast.success("Added to My List"); refetchWatchlist(); }
    },
  });
  const removeMutation = trpc.watchlist.remove.useMutation({
    onSuccess: () => { toast.success("Removed from My List"); refetchWatchlist(); },
  });

  const isInWatchlist = watchlistIds.includes(videoId);

  const handleWatchlistToggle = () => {
    if (!isAuthenticated) {
      toast.info("Sign in to save videos", {
        action: { label: "Sign In", onClick: () => (window.location.href = getLoginUrl()) },
      });
      return;
    }
    if (isInWatchlist) removeMutation.mutate({ videoId });
    else addMutation.mutate({ videoId });
  };

  const handleShare = () => {
    if (navigator.share && video) {
      navigator.share({ title: video.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="aspect-video w-full bg-white/5 rounded-2xl animate-pulse" />
            <div className="h-7 bg-white/5 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-white/5 rounded animate-pulse w-1/2" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-32 aspect-video bg-white/5 rounded-lg animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/5 rounded animate-pulse" />
                  <div className="h-3 bg-white/5 rounded animate-pulse w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center mx-auto mb-5">
          <Eye className="w-7 h-7 text-white/15" />
        </div>
        <h2 className="text-xl font-black text-white mb-2">Video not found</h2>
        <p className="text-white/35 text-sm mb-5">This video may have been removed or doesn't exist.</p>
        <Link href="/library">
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl mx-auto
            border border-white/15 text-white/70 hover:text-white hover:border-white/30 text-sm font-semibold transition-all">
            <ArrowLeft className="w-4 h-4" />
            Browse Library
          </button>
        </Link>
      </div>
    );
  }

  const catColor = CAT_COLORS[video.category ?? ""] ?? "oklch(0.74 0.21 218)";
  const tags = video.tags ? video.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];

  const schemas = [
    videoSchema({
      title: video.title,
      description: video.description ?? undefined,
      thumbnailUrl: video.thumbnailUrl ?? undefined,
      youtubeId: video.youtubeId,
      duration: typeof video.duration === "number" ? video.duration : undefined,
      creatorName: video.creatorName ?? undefined,
      publishedAt: video.publishedAt,
    }),
    breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Library", url: "/library" },
      { name: video.title, url: `/watch/${video.id}` },
    ]),
  ];

  const relatedVideos = related?.filter((v) => v.id !== videoId).slice(0, 10) ?? [];

  return (
    <>
      <SEO
        title={video.title}
        description={video.description ?? `Watch ${video.title} on ZTVLIVE`}
        image={video.thumbnailUrl ?? undefined}
        url={`/watch/${video.id}`}
        type="video.other"
        schema={schemas}
      />

      <div className="min-h-screen bg-background">
        {/* Back nav */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-2">
          <Link href="/library">
            <button className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white transition-colors font-semibold">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Library
            </button>
          </Link>
        </div>

        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* ── MAIN VIDEO ────────────────────────── */}
            <div className="lg:col-span-2">
              {/* Player */}
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-black
                shadow-2xl shadow-black/60 ring-1 ring-white/8">
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              {/* Metadata */}
              <div className="mt-5">
                {/* Live badge */}
                {video.isLive && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="flex items-center gap-1 text-xs font-black uppercase tracking-wider text-red-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      Live Now
                    </span>
                  </div>
                )}

                <h1 className="text-xl font-black text-white leading-snug mb-3">{video.title}</h1>

                {/* Stats + actions row */}
                <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-white/8">
                  <div className="flex items-center gap-4 text-sm text-white/40 flex-wrap">
                    {video.viewCount > 0 && (
                      <span className="flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" />
                        {formatViews(video.viewCount)} views
                      </span>
                    )}
                    {video.duration && !video.isLive && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDuration(video.duration)}
                      </span>
                    )}
                    {video.category && (
                      <span className="font-black text-xs uppercase tracking-wider" style={{ color: catColor }}>
                        {video.category}
                      </span>
                    )}
                    {video.viewCount > 10000 && (
                      <span className="flex items-center gap-1 text-orange-400/70 text-xs">
                        <Flame className="w-3 h-3" />
                        Trending
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleWatchlistToggle}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                        isInWatchlist
                          ? "bg-[oklch(0.74_0.21_218/0.15)] border border-[oklch(0.74_0.21_218/0.4)] text-[oklch(0.74_0.21_218)]"
                          : "bg-white/6 border border-white/12 text-white hover:bg-white/10"
                      }`}>
                      {isInWatchlist ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      {isInWatchlist ? "In My List" : "Add to List"}
                    </button>
                    <button
                      onClick={handleShare}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold
                        bg-white/6 border border-white/12 text-white hover:bg-white/10 transition-all active:scale-95">
                      <Share2 className="w-3.5 h-3.5" />
                      Share
                    </button>
                  </div>
                </div>

                {/* Creator card */}
                {video.creatorName && (
                  <div className="flex items-center gap-3 py-4 border-b border-white/8">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[oklch(0.74_0.21_218/0.3)] to-[oklch(0.56_0.24_290/0.3)] border border-white/15 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-white/60" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">{video.creatorName}</p>
                      <p className="text-xs text-white/35">Creator on ZTVLIVE</p>
                    </div>
                    <Link href="/creator">
                      <button className="text-xs text-[oklch(0.74_0.21_218)] hover:underline font-semibold">
                        Become a Creator
                      </button>
                    </Link>
                  </div>
                )}

                {/* Description */}
                {video.description && (
                  <div className="py-4 border-b border-white/8">
                    <p className="text-sm text-white/60 leading-relaxed">{video.description}</p>
                  </div>
                )}

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap pt-4">
                    <Tag className="w-3.5 h-3.5 text-white/25 shrink-0" />
                    {tags.map((tag: string) => (
                      <Link key={tag} href={`/library?search=${encodeURIComponent(tag)}`}>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10
                          text-white/45 hover:text-white hover:border-white/25 transition-colors cursor-pointer">
                          #{tag}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* ZTVLIVE+ upsell */}
              {!isAuthenticated && (
                <div className="mt-6 relative overflow-hidden rounded-2xl p-5
                  bg-gradient-to-r from-[oklch(0.74_0.21_218/0.08)] to-[oklch(0.56_0.24_290/0.06)]
                  border border-[oklch(0.74_0.21_218/0.2)]">
                  <div className="flex items-center gap-4">
                    <Crown className="w-8 h-8 text-[oklch(0.74_0.21_218)] shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-black text-white">Unlock ZTVLIVE+</p>
                      <p className="text-xs text-white/50 mt-0.5">Ad-free viewing, exclusive content, and premium quiz mode</p>
                    </div>
                    <Link href="/subscribe">
                      <button className="flex items-center gap-1 px-4 py-2 rounded-xl shrink-0
                        bg-gradient-to-r from-[oklch(0.74_0.21_218)] to-[oklch(0.56_0.24_290)]
                        text-white font-black text-xs hover:opacity-90 active:scale-95 transition-all">
                        Upgrade
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* ── WATCH NEXT SIDEBAR ────────────────── */}
            <div>
              <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                Watch Next
                <span className="text-xs text-white/30 font-normal">{relatedVideos.length} videos</span>
              </h3>
              <div className="space-y-3">
                {relatedVideos.map((v) => (
                  <Link key={v.id} href={`/watch/${v.id}`}>
                    <div className="flex gap-3 group hover:bg-white/4 rounded-xl p-2 transition-all cursor-pointer">
                      {/* Thumbnail */}
                      <div className="relative shrink-0 w-32 aspect-video rounded-lg overflow-hidden bg-white/5">
                        <img
                          src={v.thumbnailUrl ?? `https://img.youtube.com/vi/${v.youtubeId}/mqdefault.jpg`}
                          alt={v.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          loading="lazy"
                        />
                        {v.isLive && (
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-red-500 text-white text-[9px] font-black">
                            LIVE
                          </div>
                        )}
                        {v.duration && !v.isLive && (
                          <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/70 text-white text-[9px] font-bold">
                            {formatDuration(v.duration)}
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0 py-0.5">
                        <p className="text-xs font-bold text-white line-clamp-2 leading-snug
                          group-hover:text-[oklch(0.74_0.21_218)] transition-colors">
                          {v.title}
                        </p>
                        <p className="text-[10px] font-black uppercase tracking-wider mt-1.5"
                          style={{ color: CAT_COLORS[v.category ?? ""] ?? "oklch(0.6 0.05 264)" }}>
                          {v.category}
                        </p>
                        {v.viewCount > 0 && (
                          <p className="text-[10px] text-white/25 mt-0.5">{formatViews(v.viewCount)} views</p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
