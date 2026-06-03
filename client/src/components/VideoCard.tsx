import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Check, Play, Clock, Eye, Flame } from "lucide-react";
import type { VideoItem } from "@shared/types";

interface VideoCardProps {
  video: VideoItem;
  watchlistIds?: number[];
  onWatchlistChange?: () => void;
  size?: "sm" | "md" | "lg";
  showCreator?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  tech:     "oklch(0.74 0.21 218)",
  gaming:   "oklch(0.65 0.25 290)",
  sports:   "oklch(0.65 0.22 150)",
  movies:   "oklch(0.78 0.18 60)",
  podcasts: "oklch(0.7 0.18 200)",
  news:     "oklch(0.72 0.2 25)",
  music:    "oklch(0.7 0.2 320)",
  live:     "oklch(0.65 0.25 25)",
  other:    "oklch(0.6 0.05 264)",
};

function formatDuration(seconds: number | string): string {
  if (typeof seconds === "string") return seconds;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatViews(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(0)}K`;
  return views.toString();
}

export function VideoCard({
  video,
  watchlistIds = [],
  onWatchlistChange,
  size = "md",
  showCreator = true,
}: VideoCardProps) {
  const { isAuthenticated } = useAuth();
  const [imgError, setImgError] = useState(false);
  const isInWatchlist = watchlistIds.includes(video.id);

  const addMutation = trpc.watchlist.add.useMutation({
    onSuccess: (data) => {
      if (data.alreadyAdded) toast.info("Already in your list");
      else { toast.success("Added to My List"); onWatchlistChange?.(); }
    },
    onError: () => toast.error("Failed to update list"),
  });

  const removeMutation = trpc.watchlist.remove.useMutation({
    onSuccess: () => { toast.success("Removed from My List"); onWatchlistChange?.(); },
    onError: () => toast.error("Failed to update list"),
  });

  const handleWatchlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.info("Sign in to save videos", {
        action: { label: "Sign In", onClick: () => (window.location.href = getLoginUrl()) },
      });
      return;
    }
    if (isInWatchlist) removeMutation.mutate({ videoId: video.id });
    else addMutation.mutate({ videoId: video.id });
  };

  const isIAVideo = video.youtubeId?.startsWith("ia:");
  const thumbnailUrl = video.thumbnailUrl
    ? (imgError && !isIAVideo ? `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg` : video.thumbnailUrl)
    : isIAVideo
      ? `https://archive.org/services/img/${video.youtubeId.slice(3)}`
      : video.youtubeId
        ? (imgError ? `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg` : `https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`)
        : null;

  const catColor = CATEGORY_COLORS[video.category ?? ""] ?? CATEGORY_COLORS.other!;

  const widthClass = {
    sm: "w-44",
    md: "w-[260px]",
    lg: "w-80",
  }[size];

  return (
    <div className={`${widthClass} shrink-0`}>
      <Link href={`/watch/${video.id}`}>
        <div className="group cursor-pointer">

          {/* ── Thumbnail ─────────────────────────────── */}
          <div className="relative aspect-video rounded-xl overflow-hidden
            bg-[oklch(0.11_0.015_264)]
            border border-white/6 group-hover:border-white/18
            transition-all duration-200
            group-hover:shadow-[0_8px_32px_oklch(0_0_0/0.5)]
            group-hover:-translate-y-0.5">

            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={video.title}
                onError={() => setImgError(true)}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center"
                style={{ background: `${catColor}10` }}>
                <Play className="w-8 h-8 opacity-15" style={{ color: catColor }} />
              </div>
            )}

            {/* Dark gradient overlay (always visible at bottom) */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

            {/* Play button */}
            <div className="absolute inset-0 flex items-center justify-center
              opacity-0 group-hover:opacity-100 transition-all duration-200">
              <div className="w-11 h-11 rounded-full flex items-center justify-center
                bg-white/20 backdrop-blur-md border border-white/40
                scale-90 group-hover:scale-100 transition-transform duration-200
                shadow-lg shadow-black/30">
                <Play className="w-4.5 h-4.5 text-white fill-white ml-0.5" />
              </div>
            </div>

            {/* LIVE badge */}
            {video.isLive && (
              <div className="absolute top-2 left-2 flex items-center gap-1.5
                px-2 py-1 rounded-md bg-red-500 text-white text-[9px] font-black uppercase tracking-wider
                shadow-lg shadow-red-500/40">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                LIVE
              </div>
            )}

            {/* Duration */}
            {video.duration && !video.isLive && (
              <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded
                bg-black/80 backdrop-blur-sm text-white text-[9px] font-bold flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {formatDuration(video.duration)}
              </div>
            )}

            {/* Watchlist toggle */}
            <button
              onClick={handleWatchlistToggle}
              className={`absolute top-2 right-2 w-7 h-7 rounded-full
                backdrop-blur-sm border flex items-center justify-center
                opacity-0 group-hover:opacity-100
                hover:scale-110 active:scale-95
                transition-all duration-150 ${
                  isInWatchlist
                    ? "bg-[oklch(0.74_0.21_218/0.9)] border-[oklch(0.74_0.21_218)] shadow-md shadow-[oklch(0.74_0.21_218/0.4)]"
                    : "bg-black/60 border-white/25 hover:bg-white/20"
                }`}
              aria-label={isInWatchlist ? "Remove from My List" : "Add to My List"}
            >
              {isInWatchlist
                ? <Check className="w-3.5 h-3.5 text-white" />
                : <Plus className="w-3.5 h-3.5 text-white" />}
            </button>

            {/* Category color accent bar at bottom */}
            {video.category && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{ background: catColor }} />
            )}
          </div>

          {/* ── Metadata ──────────────────────────────── */}
          <div className="mt-2.5 px-0.5">
            <h3 className="text-sm font-bold text-white/90 line-clamp-2 leading-snug
              group-hover:text-white transition-colors duration-150">
              {video.title}
            </h3>

            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {video.category && (
                <span className="text-[9px] font-black uppercase tracking-widest"
                  style={{ color: catColor }}>
                  {video.category}
                </span>
              )}
              {showCreator && video.creatorName && (
                <span className="text-[9px] text-white/25 truncate max-w-[100px]">{video.creatorName}</span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1">
              {video.viewCount != null && video.viewCount > 0 && (
                <div className="flex items-center gap-1 text-[9px] text-white/20">
                  <Eye className="w-2.5 h-2.5" />
                  {formatViews(video.viewCount)}
                </div>
              )}
              {video.viewCount != null && video.viewCount > 10000 && (
                <div className="flex items-center gap-1 text-[9px] text-orange-400/50">
                  <Flame className="w-2.5 h-2.5" />
                  Trending
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
