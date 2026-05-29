import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Check, Play, Clock } from "lucide-react";
import type { VideoItem } from "@shared/types";

interface VideoCardProps {
  video: VideoItem;
  watchlistIds?: number[];
  onWatchlistChange?: () => void;
  size?: "sm" | "md" | "lg";
}

const CATEGORY_COLORS: Record<string, string> = {
  tech: "oklch(0.72 0.2 220)",
  gaming: "oklch(0.65 0.25 290)",
  sports: "oklch(0.65 0.22 150)",
  movies: "oklch(0.75 0.18 60)",
  podcasts: "oklch(0.65 0.22 25)",
  news: "oklch(0.7 0.15 200)",
  music: "oklch(0.7 0.2 320)",
  live: "oklch(0.6 0.22 25)",
  other: "oklch(0.6 0.05 264)",
};

export function VideoCard({ video, watchlistIds = [], onWatchlistChange, size = "md" }: VideoCardProps) {
  const { isAuthenticated } = useAuth();
  const [imgError, setImgError] = useState(false);
  const isInWatchlist = watchlistIds.includes(video.id);

  const addMutation = trpc.watchlist.add.useMutation({
    onSuccess: (data) => {
      if (data.alreadyAdded) {
        toast.info("Already in your watchlist");
      } else {
        toast.success("Added to watchlist");
        onWatchlistChange?.();
      }
    },
    onError: () => toast.error("Failed to update watchlist"),
  });

  const removeMutation = trpc.watchlist.remove.useMutation({
    onSuccess: () => {
      toast.success("Removed from watchlist");
      onWatchlistChange?.();
    },
    onError: () => toast.error("Failed to update watchlist"),
  });

  const handleWatchlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.info("Sign in to save to your watchlist", {
        action: { label: "Sign In", onClick: () => (window.location.href = getLoginUrl()) },
      });
      return;
    }
    if (isInWatchlist) {
      removeMutation.mutate({ videoId: video.id });
    } else {
      addMutation.mutate({ videoId: video.id });
    }
  };

  const thumbnailUrl = imgError
    ? `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`
    : video.thumbnailUrl ?? `https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`;

  const catColor = CATEGORY_COLORS[video.category] ?? CATEGORY_COLORS.other;

  const sizeClasses = {
    sm: "w-40 shrink-0",
    md: "w-56 shrink-0",
    lg: "w-72 shrink-0",
  };

  return (
    <div className={size === "sm" ? sizeClasses.sm : size === "lg" ? sizeClasses.lg : sizeClasses.md}>
      <Link href={`/watch/${video.id}`}>
        <div className="thumbnail-card bg-[oklch(0.11_0.015_264)] group">
          {/* Aspect ratio 16:9 */}
          <div className="relative" style={{ paddingBottom: "56.25%" }}>
            <img
              src={thumbnailUrl}
              alt={video.title}
              onError={() => setImgError(true)}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Overlay */}
            <div className="overlay" />
            {/* Play button */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
              </div>
            </div>
            {/* Live badge */}
            {video.isLive && (
              <div className="absolute top-2 left-2">
                <span className="live-badge">LIVE</span>
              </div>
            )}
            {/* Duration */}
            {video.duration && !video.isLive && (
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {video.duration}
              </div>
            )}
            {/* Watchlist button */}
            <button
              onClick={handleWatchlistToggle}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-[oklch(0.72_0.2_220/0.8)] border border-white/20"
              aria-label={isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
            >
              {isInWatchlist ? (
                <Check className="w-3.5 h-3.5 text-white" />
              ) : (
                <Plus className="w-3.5 h-3.5 text-white" />
              )}
            </button>
          </div>

          {/* Info */}
          <div className="p-2">
            <p className="text-white text-xs font-medium leading-tight line-clamp-2 mb-1">
              {video.title}
            </p>
            <div className="flex items-center justify-between">
              <span
                className="text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: catColor }}
              >
                {video.category}
              </span>
              {video.viewCount > 0 && (
                <span className="text-[10px] text-white/30">
                  {video.viewCount >= 1000
                    ? `${(video.viewCount / 1000).toFixed(1)}K`
                    : video.viewCount}{" "}
                  views
                </span>
              )}
            </div>
            {video.creatorName && (
              <p className="text-[10px] text-white/30 mt-0.5 truncate">{video.creatorName}</p>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
