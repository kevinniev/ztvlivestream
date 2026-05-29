import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { SEO } from "@/components/SEO";
import { VideoCard } from "@/components/VideoCard";
import { Button } from "@/components/ui/button";
import { Bookmark, Library } from "lucide-react";

export default function Watchlist() {
  const { isAuthenticated } = useAuth();
  const { data: watchlistItems, isLoading, refetch } = trpc.watchlist.get.useQuery(undefined, { enabled: isAuthenticated });
  const { data: watchlistIds = [], refetch: refetchIds } = trpc.watchlist.ids.useQuery(undefined, { enabled: isAuthenticated });

  const handleChange = () => { refetch(); refetchIds(); };

  if (!isAuthenticated) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 py-20 text-center">
        <Bookmark className="w-12 h-12 text-white/20 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">My Watchlist</h2>
        <p className="text-white/50 text-sm mb-6">Sign in to view and manage your watchlist</p>
        <Button onClick={() => (window.location.href = getLoginUrl())} className="bg-[oklch(0.72_0.2_220)] text-[oklch(0.08_0.01_264)] font-bold">
          Sign In
        </Button>
      </div>
    );
  }

  return (
    <>
      <SEO title="My Watchlist" description="Your saved ZTVLIVE videos and shows." url="/watchlist" noIndex />
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-white mb-1">My Watchlist</h1>
            <p className="text-white/50 text-sm">{watchlistItems?.length ?? 0} saved videos</p>
          </div>
          <Link href="/library">
            <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10 text-xs">
              <Library className="w-3.5 h-3.5 mr-1.5" />
              Browse Library
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rounded-lg bg-white/5 animate-pulse" style={{ paddingBottom: "calc(56.25% + 60px)" }} />
            ))}
          </div>
        ) : !watchlistItems || watchlistItems.length === 0 ? (
          <div className="text-center py-20">
            <Bookmark className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/40 text-lg font-semibold">Your watchlist is empty</p>
            <p className="text-white/25 text-sm mt-1">Browse the library and add videos to watch later</p>
            <Link href="/library">
              <Button className="mt-4 bg-[oklch(0.72_0.2_220)] text-[oklch(0.08_0.01_264)] font-semibold text-sm">
                Browse Library
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {watchlistItems.map((video) => (
              <div key={video.id} className="w-full">
                <VideoCard video={video} watchlistIds={watchlistIds} onWatchlistChange={handleChange} size="sm" />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
