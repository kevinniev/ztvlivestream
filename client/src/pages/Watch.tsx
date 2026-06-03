import { useParams, Link } from "wouter";
import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { SEO, videoSchema, breadcrumbSchema, faqSchema } from "@/components/SEO";
import { toast } from "sonner";
import {
  Plus, Check, Share2, Tag, User, Eye, Clock,
  ChevronRight, Crown, ArrowLeft, Flame, Play,
  ChevronDown, ChevronUp, Sparkles, Copy, MessageCircle,
  Facebook, Twitter, Mail, BookOpen, HelpCircle, Loader2,
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
  other: "oklch(0.7 0.1 264)",
};

const CAT_LABELS: Record<string, string> = {
  tech: "Tech", gaming: "Gaming", sports: "Sports", movies: "Movies",
  podcasts: "Podcasts", news: "News", music: "Music", live: "Live", other: "Other",
};

export default function Watch() {
  const params = useParams<{ id: string }>();
  const videoId = parseInt(params.id ?? "0", 10);
  const { isAuthenticated } = useAuth();

  const { data: video, isLoading } = trpc.videos.byId.useQuery({ id: videoId }, { enabled: !!videoId });
  const { data: watchlistIds = [], refetch: refetchWatchlist } = trpc.watchlist.ids.useQuery(
    undefined, { enabled: isAuthenticated }
  );
  const incrementView = trpc.videos.incrementView.useMutation();
  const { data: related } = trpc.videos.related.useQuery(
    { id: videoId, category: video?.category ?? undefined, limit: 8 },
    { enabled: !!video, staleTime: 60000 }
  );
  const { data: creatorVideos } = trpc.videos.byCreator.useQuery(
    { creatorName: video?.creatorName ?? "", excludeId: videoId, limit: 6 },
    { enabled: !!video?.creatorName, staleTime: 60000 }
  );

  // AI content state
  const [aiContent, setAiContent] = useState<{
    transcript: string;
    description: string;
    faq: Array<{ question: string; answer: string }>;
  } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({});
  const [extDescOpen, setExtDescOpen] = useState(false);

  const generateAIContent = trpc.videos.generateAIContent.useMutation({
    onSuccess: (data) => {
      setAiContent(data);
      setAiLoading(false);
    },
    onError: () => {
      setAiLoading(false);
      toast.error("Could not generate AI content. Please try again.");
    },
  });

  const handleLoadAIContent = useCallback(() => {
    if (aiContent || aiLoading || !video) return;
    setAiLoading(true);
    generateAIContent.mutate({ id: video.id });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiContent, aiLoading, video]);

  // Increment view count once when video loads
  useEffect(() => {
    if (video?.id) incrementView.mutate({ id: video.id });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video?.id]);

  // Auto-load AI content after video loads (with a small delay to not block initial render)
  useEffect(() => {
    if (!video) return;
    // Check if cached content already exists on the video object
    if ((video as any).aiTranscript && (video as any).aiDescription && (video as any).aiFaq) {
      try {
        setAiContent({
          transcript: (video as any).aiTranscript,
          description: (video as any).aiDescription,
          faq: JSON.parse((video as any).aiFaq),
        });
        return;
      } catch { /* fall through to generate */ }
    }
    const timer = setTimeout(() => handleLoadAIContent(), 1500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video?.id]);

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
  const [playerStarted, setPlayerStarted] = useState(false);

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

  const pageUrl = typeof window !== "undefined" ? window.location.href : `https://ztvlivestream.com/watch/${videoId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(pageUrl);
    toast.success("Link copied to clipboard!");
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent(`Watch "${video?.title}" on ZTVLIVE — free streaming`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(pageUrl)}`, "_blank");
  };

  const handleShareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`, "_blank");
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`Watch "${video?.title}" on ZTVLIVE: ${pageUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`Check out: ${video?.title}`);
    const body = encodeURIComponent(`I thought you'd enjoy this video on ZTVLIVE:\n\n${video?.title}\n\n${pageUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const handleNativeShare = () => {
    if (navigator.share && video) {
      navigator.share({ title: video.title, url: pageUrl }).catch(() => {});
    } else {
      handleCopyLink();
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
  const catLabel = CAT_LABELS[video.category ?? ""] ?? video.category;
  const tags = video.tags
    ? (() => {
        const raw = video.tags!;
        if (raw.trim().startsWith("[")) {
          try { return (JSON.parse(raw) as string[]).map((t) => t.trim()).filter(Boolean); } catch { /* fall through */ }
        }
        return raw.split(",").map((t: string) => t.trim()).filter(Boolean);
      })()
    : [];

  const faqItems = aiContent?.faq ?? [];
  const schemas: object[] = [
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
      ...(video.category ? [{ name: catLabel ?? video.category, url: `/library?category=${video.category}` }] : []),
      { name: video.title, url: `/watch/${video.id}` },
    ]),
  ];
  if (faqItems.length > 0) {
    schemas.push(faqSchema(faqItems));
  }

  const relatedVideos = (related ?? []).filter((v) => v.id !== videoId).slice(0, 8);
  const moreFromCreator = (creatorVideos ?? []).filter((v) => v.id !== videoId).slice(0, 6);

  return (
    <>
      <SEO
        title={video.title}
        description={video.description ? (video.description.length > 155 ? video.description.slice(0, 152) + '...' : video.description) : `Watch ${video.title} on ZTVLIVE — free streaming on America's #1 independent 24/7 live streaming network.`}
        image={video.thumbnailUrl ?? undefined}
        url={`/watch/${video.id}`}
        type="video.other"
        schema={schemas}
      />

      <div className="min-h-screen bg-background">
        {/* Breadcrumb nav */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-2">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-white/30 flex-wrap">
            <Link href="/">
              <span className="hover:text-white/60 transition-colors cursor-pointer">Home</span>
            </Link>
            <ChevronRight className="w-3 h-3 shrink-0" />
            <Link href="/library">
              <span className="hover:text-white/60 transition-colors cursor-pointer">Library</span>
            </Link>
            {video.category && (
              <>
                <ChevronRight className="w-3 h-3 shrink-0" />
                <Link href={`/library?category=${video.category}`}>
                  <span className="hover:text-white/60 transition-colors cursor-pointer font-semibold" style={{ color: catColor }}>
                    {catLabel}
                  </span>
                </Link>
              </>
            )}
            <ChevronRight className="w-3 h-3 shrink-0" />
            <span className="text-white/50 truncate max-w-[200px]">{video.title}</span>
          </nav>
        </div>

        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* ── MAIN VIDEO ────────────────────────── */}
            <div className="lg:col-span-2">
              {/* Player */}
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-black
                shadow-2xl shadow-black/60 ring-1 ring-white/8">
                {!playerStarted ? (
                  <button
                    className="absolute inset-0 w-full h-full group cursor-pointer"
                    onClick={() => setPlayerStarted(true)}
                    aria-label="Play video">
                    <img
                      src={video.thumbnailUrl ?? `https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors duration-200" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full bg-white/15 backdrop-blur-md border border-white/30
                        flex items-center justify-center group-hover:scale-110 transition-transform duration-200
                        shadow-2xl">
                        <Play className="w-8 h-8 text-white fill-white ml-1" />
                      </div>
                    </div>
                  </button>
                ) : (
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={
                      video.youtubeId.startsWith("ia:")
                        ? `https://archive.org/embed/${video.youtubeId.slice(3)}?autoplay=1`
                        : `https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0&modestbranding=1`
                    }
                    title={video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
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

                {/* Stats row */}
                <div className="flex items-center gap-4 text-sm text-white/40 flex-wrap mb-3">
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
                    <Link href={`/library?category=${video.category}`}>
                      <span className="font-black text-xs uppercase tracking-wider hover:opacity-80 transition-opacity cursor-pointer" style={{ color: catColor }}>
                        {catLabel}
                      </span>
                    </Link>
                  )}
                  {video.viewCount > 10000 && (
                    <span className="flex items-center gap-1 text-orange-400/70 text-xs">
                      <Flame className="w-3 h-3" />
                      Trending
                    </span>
                  )}
                </div>

                {/* Action buttons row */}
                <div className="flex items-center gap-2 flex-wrap pb-4 border-b border-white/8">
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

                  {/* Share dropdown */}
                  <div className="flex items-center gap-1.5">
                    {/* Mobile: native share */}
                    <button
                      onClick={handleNativeShare}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold
                        bg-white/6 border border-white/12 text-white hover:bg-white/10 transition-all active:scale-95 sm:hidden">
                      <Share2 className="w-3.5 h-3.5" />
                      Share
                    </button>

                    {/* Desktop: individual share buttons */}
                    <div className="hidden sm:flex items-center gap-1.5">
                      <button
                        onClick={handleShareTwitter}
                        title="Share on X / Twitter"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold
                          bg-white/6 border border-white/12 text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-95">
                        <Twitter className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">X</span>
                      </button>
                      <button
                        onClick={handleShareFacebook}
                        title="Share on Facebook"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold
                          bg-white/6 border border-white/12 text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-95">
                        <Facebook className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">FB</span>
                      </button>
                      <button
                        onClick={handleShareWhatsApp}
                        title="Share on WhatsApp"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold
                          bg-white/6 border border-white/12 text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-95">
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">WA</span>
                      </button>
                      <button
                        onClick={handleShareEmail}
                        title="Share via Email"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold
                          bg-white/6 border border-white/12 text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-95">
                        <Mail className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">Email</span>
                      </button>
                      <button
                        onClick={handleCopyLink}
                        title="Copy link"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold
                          bg-white/6 border border-white/12 text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-95">
                        <Copy className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">Copy</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Creator card */}
                {video.creatorName && (
                  <div className="flex items-center gap-3 py-4 border-b border-white/8">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[oklch(0.74_0.21_218/0.3)] to-[oklch(0.56_0.24_290/0.3)] border border-white/15 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-white/60" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">{video.creatorName}</p>
                      <p className="text-xs text-white/35">Creator on ZTVLIVE</p>
                      {moreFromCreator.length > 0 && (
                        <p className="text-xs text-white/25 mt-0.5">{moreFromCreator.length + 1} videos on ZTVLIVE</p>
                      )}
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

                {/* AI Extended Description */}
                {(aiContent?.description || aiLoading) && (
                  <div className="py-4 border-b border-white/8">
                    <button
                      onClick={() => setExtDescOpen((v) => !v)}
                      className="flex items-center gap-2 w-full text-left group mb-2">
                      <BookOpen className="w-4 h-4 text-[oklch(0.74_0.21_218)]" />
                      <span className="text-sm font-bold text-white/80 group-hover:text-white transition-colors">
                        Extended Description
                      </span>
                      <span className="ml-auto flex items-center gap-1 text-xs text-white/30">
                        <Sparkles className="w-3 h-3 text-[oklch(0.74_0.21_218/0.6)]" />
                        AI Generated
                        {extDescOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </span>
                    </button>
                    {extDescOpen && (
                      aiLoading ? (
                        <div className="flex items-center gap-2 text-xs text-white/30 py-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Generating content...
                        </div>
                      ) : (
                        <div className="text-sm text-white/55 leading-relaxed space-y-3">
                          {aiContent!.description.split("\n\n").map((para, i) => (
                            <p key={i}>{para}</p>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap pt-4 pb-4 border-b border-white/8">
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

                {/* AI Transcript */}
                <div className="py-4 border-b border-white/8">
                  <button
                    onClick={() => {
                      setTranscriptOpen((v) => !v);
                      if (!aiContent && !aiLoading) handleLoadAIContent();
                    }}
                    className="flex items-center gap-2 w-full text-left group">
                    <BookOpen className="w-4 h-4 text-[oklch(0.74_0.21_218)]" />
                    <span className="text-sm font-bold text-white/80 group-hover:text-white transition-colors">
                      Transcript
                    </span>
                    <span className="ml-auto flex items-center gap-1 text-xs text-white/30">
                      <Sparkles className="w-3 h-3 text-[oklch(0.74_0.21_218/0.6)]" />
                      AI Generated
                      {transcriptOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </span>
                  </button>
                  {transcriptOpen && (
                    <div className="mt-3">
                      {aiLoading ? (
                        <div className="flex items-center gap-2 text-xs text-white/30 py-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Generating transcript...
                        </div>
                      ) : aiContent ? (
                        <div className="text-sm text-white/50 leading-relaxed bg-white/3 rounded-xl p-4 border border-white/6
                          max-h-64 overflow-y-auto scrollbar-thin">
                          {aiContent.transcript}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-white/30 py-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Loading transcript...
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* FAQ Section */}
                {(faqItems.length > 0 || aiLoading) && (
                  <div className="py-4 border-b border-white/8">
                    <div className="flex items-center gap-2 mb-3">
                      <HelpCircle className="w-4 h-4 text-[oklch(0.56_0.24_290)]" />
                      <span className="text-sm font-bold text-white/80">Frequently Asked Questions</span>
                      <span className="ml-auto flex items-center gap-1 text-xs text-white/30">
                        <Sparkles className="w-3 h-3 text-[oklch(0.56_0.24_290/0.6)]" />
                        AI Generated
                      </span>
                    </div>
                    {aiLoading && faqItems.length === 0 ? (
                      <div className="flex items-center gap-2 text-xs text-white/30 py-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Generating FAQ...
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {faqItems.map((item, i) => (
                          <div key={i} className="rounded-xl border border-white/8 overflow-hidden">
                            <button
                              onClick={() => setFaqOpen((prev) => ({ ...prev, [i]: !prev[i] }))}
                              className="flex items-center justify-between w-full px-4 py-3 text-left
                                hover:bg-white/4 transition-colors group">
                              <span className="text-sm font-semibold text-white/75 group-hover:text-white transition-colors pr-4">
                                {item.question}
                              </span>
                              {faqOpen[i] ? (
                                <ChevronUp className="w-4 h-4 text-white/30 shrink-0" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-white/30 shrink-0" />
                              )}
                            </button>
                            {faqOpen[i] && (
                              <div className="px-4 pb-3 text-sm text-white/50 leading-relaxed border-t border-white/6 pt-3">
                                {item.answer}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ZTVLIVE+ upsell */}
                {!isAuthenticated && (
                  <div className="mt-6 relative overflow-hidden rounded-2xl p-5
                    bg-gradient-to-r from-[oklch(0.74_0.21_218/0.08)] to-[oklch(0.56_0.24_290/0.06)]
                    border border-[oklch(0.74_0.21_218/0.2)]">
                    <div className="flex items-center gap-4">
                      <Crown className="w-8 h-8 text-[oklch(0.74_0.21_218)] shrink-0" />
                      <div className="flex-1 min-w-0">
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

                {/* More from this creator */}
                {moreFromCreator.length > 0 && (
                  <div className="mt-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-black text-white flex items-center gap-2">
                        <User className="w-4 h-4 text-[oklch(0.74_0.21_218)]" />
                        More from {video.creatorName}
                      </h3>
                      <Link href={`/library?search=${encodeURIComponent(video.creatorName ?? "")}`}>
                        <span className="text-xs text-[oklch(0.74_0.21_218)] hover:underline font-semibold cursor-pointer">
                          View all
                        </span>
                      </Link>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {moreFromCreator.map((v) => (
                        <Link key={v.id} href={`/watch/${v.id}`}>
                          <div className="group cursor-pointer">
                            <div className="relative aspect-video rounded-xl overflow-hidden bg-white/5 mb-2">
                              <img
                                src={v.thumbnailUrl ?? `https://img.youtube.com/vi/${v.youtubeId}/mqdefault.jpg`}
                                alt={v.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                loading="lazy"
                              />
                              {v.duration && !v.isLive && (
                                <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/70 text-white text-[9px] font-bold">
                                  {formatDuration(v.duration)}
                                </div>
                              )}
                            </div>
                            <p className="text-xs font-bold text-white/75 line-clamp-2 leading-snug
                              group-hover:text-[oklch(0.74_0.21_218)] transition-colors">
                              {v.title}
                            </p>
                            {v.viewCount > 0 && (
                              <p className="text-[10px] text-white/25 mt-0.5">{formatViews(v.viewCount)} views</p>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Internal backlinks — related by category */}
                {video.category && (
                  <div className="mt-6 pt-4 border-t border-white/8">
                    <p className="text-xs text-white/30">
                      Browse more{" "}
                      <Link href={`/library?category=${video.category}`}>
                        <span className="font-semibold hover:underline cursor-pointer" style={{ color: catColor }}>
                          {catLabel}
                        </span>
                      </Link>
                      {" "}content on ZTVLIVE, or explore the full{" "}
                      <Link href="/library">
                        <span className="text-white/50 font-semibold hover:underline cursor-pointer">Video Library</span>
                      </Link>
                      .
                    </p>
                  </div>
                )}
              </div>
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
                          {CAT_LABELS[v.category ?? ""] ?? v.category}
                        </p>
                        {v.viewCount > 0 && (
                          <p className="text-[10px] text-white/25 mt-0.5">{formatViews(v.viewCount)} views</p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Library CTA in sidebar */}
              <div className="mt-6 pt-4 border-t border-white/8">
                <Link href="/library">
                  <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                    border border-white/10 text-white/50 hover:text-white hover:border-white/25
                    text-xs font-semibold transition-all">
                    Browse Full Library
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
