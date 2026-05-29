import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { SEO, videoSchema, breadcrumbSchema } from "@/components/SEO";
import { VideoCard } from "@/components/VideoCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Check, Share2, Tag, User, Eye } from "lucide-react";

export default function Watch() {
  const params = useParams<{ id: string }>();
  const videoId = parseInt(params.id ?? "0", 10);
  const { isAuthenticated } = useAuth();

  const { data: video, isLoading } = trpc.videos.byId.useQuery({ id: videoId }, { enabled: !!videoId });
  const { data: watchlistIds = [], refetch: refetchWatchlist } = trpc.watchlist.ids.useQuery(undefined, { enabled: isAuthenticated });
  const { data: related } = trpc.videos.trending.useQuery(undefined, { staleTime: 60000 });

  const addMutation = trpc.watchlist.add.useMutation({
    onSuccess: (data) => {
      if (data.alreadyAdded) toast.info("Already in watchlist");
      else { toast.success("Added to watchlist"); refetchWatchlist(); }
    },
  });
  const removeMutation = trpc.watchlist.remove.useMutation({
    onSuccess: () => { toast.success("Removed from watchlist"); refetchWatchlist(); },
  });

  const isInWatchlist = watchlistIds.includes(videoId);

  const handleWatchlistToggle = () => {
    if (!isAuthenticated) {
      toast.info("Sign in to save to watchlist", {
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
      <div className="max-w-[1400px] mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="w-full bg-white/5 rounded-xl animate-pulse" style={{ paddingBottom: "56.25%" }} />
            <div className="h-8 bg-white/5 rounded animate-pulse" />
            <div className="h-4 bg-white/5 rounded animate-pulse w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 py-20 text-center">
        <p className="text-white/40 text-xl">Video not found</p>
        <a href="/library" className="text-[oklch(0.72_0.2_220)] text-sm mt-2 inline-block hover:underline">Browse Library</a>
      </div>
    );
  }

  const schemas = [
    videoSchema({
      title: video.title,
      description: video.description ?? undefined,
      thumbnailUrl: video.thumbnailUrl ?? undefined,
      youtubeId: video.youtubeId,
      duration: video.duration ?? undefined,
      creatorName: video.creatorName ?? undefined,
      publishedAt: video.publishedAt,
    }),
    breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Library", url: "/library" },
      { name: video.title, url: `/watch/${video.id}` },
    ]),
  ];

  const tags = video.tags ? video.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

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

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main video */}
          <div className="lg:col-span-2">
            {/* Player */}
            <div className="relative rounded-xl overflow-hidden bg-black" style={{ paddingBottom: "56.25%" }}>
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            {/* Video info */}
            <div className="mt-4">
              {video.isLive && <span className="live-badge mb-2 inline-block">LIVE</span>}
              <h1 className="text-xl font-bold text-white mb-2 leading-snug">{video.title}</h1>

              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <div className="flex items-center gap-4 text-sm text-white/40">
                  {video.viewCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {video.viewCount.toLocaleString()} views
                    </span>
                  )}
                  {video.creatorName && (
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {video.creatorName}
                    </span>
                  )}
                  <span className="capitalize text-[oklch(0.72_0.2_220)]">{video.category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleWatchlistToggle}
                    className={`border-white/20 text-xs font-medium transition-all ${
                      isInWatchlist
                        ? "bg-[oklch(0.72_0.2_220/0.15)] border-[oklch(0.72_0.2_220/0.4)] text-[oklch(0.72_0.2_220)]"
                        : "text-white hover:bg-white/10"
                    }`}
                  >
                    {isInWatchlist ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
                    {isInWatchlist ? "In Watchlist" : "Add to List"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleShare}
                    className="border-white/20 text-white hover:bg-white/10 text-xs"
                  >
                    <Share2 className="w-3.5 h-3.5 mr-1.5" />
                    Share
                  </Button>
                </div>
              </div>

              {/* Description */}
              {video.description && (
                <div className="glass-card rounded-xl p-4 mb-4">
                  <p className="text-sm text-white/70 leading-relaxed">{video.description}</p>
                </div>
              )}

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag className="w-3.5 h-3.5 text-white/30" />
                  {tags.map((tag) => (
                    <a
                      key={tag}
                      href={`/library?search=${encodeURIComponent(tag)}`}
                      className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-colors"
                    >
                      #{tag}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Related videos */}
          <div>
            <h3 className="text-sm font-bold text-white mb-4">Watch Next</h3>
            <div className="space-y-3">
              {related
                ?.filter((v) => v.id !== videoId)
                .slice(0, 8)
                .map((v) => (
                  <a key={v.id} href={`/watch/${v.id}`} className="flex gap-3 group hover:bg-white/5 rounded-lg p-2 transition-colors">
                    <div className="relative shrink-0 w-32 rounded-lg overflow-hidden bg-white/5" style={{ paddingBottom: "calc(56.25% * 32/128)" }}>
                      <div className="relative w-32" style={{ paddingBottom: "56.25%" }}>
                        <img
                          src={v.thumbnailUrl ?? `https://img.youtube.com/vi/${v.youtubeId}/mqdefault.jpg`}
                          alt={v.title}
                          className="absolute inset-0 w-full h-full object-cover rounded-lg"
                          loading="lazy"
                        />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white line-clamp-2 group-hover:text-[oklch(0.72_0.2_220)] transition-colors">
                        {v.title}
                      </p>
                      <p className="text-xs text-white/30 mt-1 capitalize">{v.category}</p>
                      {v.duration && <p className="text-xs text-white/20 mt-0.5">{v.duration}</p>}
                    </div>
                  </a>
                ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
