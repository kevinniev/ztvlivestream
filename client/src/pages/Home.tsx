import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { SEO } from "@/components/SEO";
import { VideoCard } from "@/components/VideoCard";
import { Button } from "@/components/ui/button";
import {
  Play,
  ChevronLeft,
  ChevronRight,
  Crown,
  Users,
  Zap,
  Trophy,
  Tv,
  Mic,
  Gamepad2,
  Dumbbell,
  Film,
  Newspaper,
  Music,
  Radio,
  ArrowRight,
  Star,
} from "lucide-react";

/* ── Hero Slides ──────────────────────────────────────── */
const heroSlides = [
  {
    id: 1,
    title: "Watch Live 24/7",
    subtitle: "Stream live TV, tech reviews, gaming, sports, and more — free, anytime.",
    cta: "Watch Live",
    ctaHref: "/live",
    badge: "LIVE NOW",
    bg: "from-[oklch(0.72_0.2_220/0.4)] to-[oklch(0.08_0.01_264)]",
    accent: "oklch(0.72 0.2 220)",
    image: "https://i.ytimg.com/vi/997tJ-IF5AI/maxresdefault.jpg",
  },
  {
    id: 2,
    title: "Play & Win Daily",
    subtitle: "Compete in our daily trivia championship. Top scores win real prizes every day.",
    cta: "Play Quiz",
    ctaHref: "/quiz",
    badge: "DAILY PRIZES",
    bg: "from-[oklch(0.65_0.25_290/0.4)] to-[oklch(0.08_0.01_264)]",
    accent: "oklch(0.65 0.25 290)",
    image: "https://i.ytimg.com/vi/esVJLb0GPvQ/maxresdefault.jpg",
  },
  {
    id: 3,
    title: "Upgrade to ZTVLIVE+",
    subtitle: "Ad-free streaming, exclusive content, premium quiz mode, and priority creator support.",
    cta: "Get ZTVLIVE+",
    ctaHref: "/subscribe",
    badge: "PREMIUM",
    bg: "from-[oklch(0.75_0.18_60/0.4)] to-[oklch(0.08_0.01_264)]",
    accent: "oklch(0.75 0.18 60)",
    image: "https://i.ytimg.com/vi/rOGMjPRdV0w/maxresdefault.jpg",
  },
  {
    id: 4,
    title: "Become a Creator",
    subtitle: "Upload your content, build your audience, and earn 70% revenue share on every view.",
    cta: "Start Creating",
    ctaHref: "/creator",
    badge: "70% REVENUE",
    bg: "from-[oklch(0.65_0.22_150/0.4)] to-[oklch(0.08_0.01_264)]",
    accent: "oklch(0.65 0.22 150)",
    image: "https://i.ytimg.com/vi/sQQFSPW70c0/maxresdefault.jpg",
  },
  {
    id: 5,
    title: "Explore the Library",
    subtitle: "Thousands of videos across tech, gaming, sports, movies, podcasts, news, and music.",
    cta: "Browse Library",
    ctaHref: "/library",
    badge: "1000+ TITLES",
    bg: "from-[oklch(0.65_0.22_25/0.4)] to-[oklch(0.08_0.01_264)]",
    accent: "oklch(0.65 0.22 25)",
    image: "https://i.ytimg.com/vi/Atn9MvS3csY/maxresdefault.jpg",
  },
];

/* ── Category config ──────────────────────────────────── */
const CATEGORIES = [
  { key: "live", label: "Live", icon: Radio, color: "oklch(0.6 0.22 25)" },
  { key: "tech", label: "Tech", icon: Zap, color: "oklch(0.72 0.2 220)" },
  { key: "gaming", label: "Gaming", icon: Gamepad2, color: "oklch(0.65 0.25 290)" },
  { key: "sports", label: "Sports", icon: Dumbbell, color: "oklch(0.65 0.22 150)" },
  { key: "movies", label: "Movies", icon: Film, color: "oklch(0.75 0.18 60)" },
  { key: "podcasts", label: "Podcasts", icon: Mic, color: "oklch(0.65 0.22 25)" },
  { key: "news", label: "News", icon: Newspaper, color: "oklch(0.7 0.15 200)" },
  { key: "music", label: "Music", icon: Music, color: "oklch(0.7 0.2 320)" },
];

/* ── Hero Carousel ────────────────────────────────────── */
function HeroCarousel({ viewerCount }: { viewerCount: number }) {
  const [current, setCurrent] = useState(0);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAutoplay = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % heroSlides.length);
    }, 6000);
  };

  useEffect(() => {
    startAutoplay();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const go = (dir: number) => {
    setCurrent((c) => (c + dir + heroSlides.length) % heroSlides.length);
    startAutoplay();
  };

  const slide = heroSlides[current];

  return (
    <div className="relative w-full overflow-hidden" style={{ height: "min(600px, 80vh)" }}>
      {/* Background image */}
      {heroSlides.map((s, i) => (
        <div
          key={s.id}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === current ? 1 : 0 }}
        >
          <img
            src={imgErrors[i] ? `https://img.youtube.com/vi/${s.image.split('/vi/')[1]?.split('/')[0]}/hqdefault.jpg` : s.image}
            alt={s.title}
            onError={() => setImgErrors(prev => ({ ...prev, [i]: true }))}
            className="w-full h-full object-cover"
          />
          <div className={`absolute inset-0 bg-gradient-to-r ${s.bg}`} />
          <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.08_0.01_264)] via-transparent to-transparent" />
        </div>
      ))}

      {/* Content */}
      <div className="relative z-10 h-full flex items-end pb-16 px-4 md:px-8 lg:px-16 max-w-[1400px] mx-auto">
        <div className="max-w-xl animate-fade-in-up">
          <span
            className="inline-block text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-4 border"
            style={{
              color: slide.accent,
              borderColor: `${slide.accent}50`,
              background: `${slide.accent}15`,
            }}
          >
            {slide.badge}
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-white mb-3 leading-tight">
            {slide.title}
          </h1>
          <p className="text-white/70 text-sm md:text-base mb-6 leading-relaxed max-w-md">
            {slide.subtitle}
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <Link href={slide.ctaHref}>
              <Button
                className="font-bold px-6 py-2.5 text-sm"
                style={{
                  background: slide.accent,
                  color: "oklch(0.08 0.01 264)",
                }}
              >
                <Play className="w-4 h-4 mr-2 fill-current" />
                {slide.cta}
              </Button>
            </Link>
            {current === 0 && viewerCount > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-white/70">
                <span className="w-2 h-2 rounded-full bg-[oklch(0.6_0.22_25)] animate-pulse" />
                {viewerCount.toLocaleString()} watching now
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Arrows */}
      <button
        onClick={() => go(-1)}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition-all border border-white/10"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={() => go(1)}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition-all border border-white/10"
        aria-label="Next slide"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-2">
        {heroSlides.map((_, i) => (
          <button
            key={i}
            onClick={() => { setCurrent(i); startAutoplay(); }}
            className="transition-all duration-300"
            aria-label={`Go to slide ${i + 1}`}
          >
            <div
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: i === current ? "24px" : "8px",
                background: i === current ? slide.accent : "rgba(255,255,255,0.3)",
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Category Browse Row ──────────────────────────────── */
function CategoryRow({
  category,
  label,
  icon: Icon,
  color,
  watchlistIds,
  onWatchlistChange,
}: {
  category: string;
  label: string;
  icon: React.ElementType;
  color: string;
  watchlistIds: number[];
  onWatchlistChange: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: videos, isLoading } = trpc.videos.byCategory.useQuery(
    { category, limit: 12 },
    { staleTime: 60000 }
  );

  const scroll = (dir: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 240, behavior: "smooth" });
    }
  };

  if (!isLoading && (!videos || videos.length === 0)) return null;

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${color}20`, border: `1px solid ${color}40` }}
          >
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <h2 className="text-lg font-bold text-white">{label}</h2>
          {videos && (
            <span className="text-xs text-white/30 ml-1">{videos.length} titles</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/library?category=${category}`}
            className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1 transition-colors"
          >
            See all <ArrowRight className="w-3 h-3" />
          </Link>
          <button
            onClick={() => scroll(-1)}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll(1)}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="scroll-row">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="w-56 shrink-0 rounded-lg bg-white/5 animate-pulse"
                style={{ paddingBottom: "calc(56.25% + 60px)" }}
              />
            ))
          : videos?.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                watchlistIds={watchlistIds}
                onWatchlistChange={onWatchlistChange}
              />
            ))}
      </div>
    </section>
  );
}

/* ── Stats Strip ──────────────────────────────────────── */
function StatsStrip() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
      {[
        { label: "Live Channels", value: "24/7", icon: Tv, color: "oklch(0.72 0.2 220)" },
        { label: "Content Titles", value: "1,000+", icon: Film, color: "oklch(0.65 0.25 290)" },
        { label: "Creator Revenue", value: "70%", icon: Trophy, color: "oklch(0.75 0.18 60)" },
        { label: "Active Creators", value: "500+", icon: Users, color: "oklch(0.65 0.22 150)" },
      ].map((stat) => (
        <div
          key={stat.label}
          className="glass-card rounded-xl p-4 flex items-center gap-3"
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${stat.color}15`, border: `1px solid ${stat.color}30` }}
          >
            <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
          </div>
          <div>
            <p className="text-xl font-black text-white">{stat.value}</p>
            <p className="text-xs text-white/40">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── ZTVLIVE+ Promo Strip ─────────────────────────────── */
function PlusPromoStrip() {
  return (
    <div className="relative overflow-hidden rounded-2xl mb-12 p-8 md:p-12">
      <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.72_0.2_220/0.2)] to-[oklch(0.65_0.25_290/0.2)]" />
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: "linear-gradient(oklch(0.11 0.015 264), oklch(0.11 0.015 264)) padding-box, linear-gradient(135deg, oklch(0.72 0.2 220), oklch(0.65 0.25 290)) border-box",
          border: "1px solid transparent",
        }}
      />
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-5 h-5 text-[oklch(0.72_0.2_220)]" />
            <span className="gradient-text font-black text-xl">ZTVLIVE+</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Unlock the full experience</h3>
          <p className="text-white/60 text-sm max-w-md">
            Ad-free streaming, exclusive content, premium quiz mode, early access to new shows, and priority creator support. Starting at just $4.99/month.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3 shrink-0">
          <Link href="/subscribe">
            <Button className="bg-gradient-to-r from-[oklch(0.72_0.2_220)] to-[oklch(0.65_0.25_290)] text-white border-0 font-bold px-8 py-3 text-sm hover:opacity-90">
              <Crown className="w-4 h-4 mr-2" />
              Get ZTVLIVE+
            </Button>
          </Link>
          <p className="text-xs text-white/30">Cancel anytime · No contracts</p>
        </div>
      </div>
    </div>
  );
}

/* ── Creator Spotlight ────────────────────────────────── */
function CreatorSpotlight() {
  const creators = [
    { name: "Good Tech Cheap", category: "Tech Reviews", videos: 45, color: "oklch(0.72 0.2 220)" },
    { name: "ZTVLIVE Gaming", category: "Gaming", videos: 28, color: "oklch(0.65 0.25 290)" },
    { name: "ZTVLIVE Docs", category: "Documentaries", videos: 19, color: "oklch(0.65 0.22 150)" },
    { name: "Eliances Network", category: "Business", videos: 12, color: "oklch(0.75 0.18 60)" },
  ];

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="section-divider" />
          <h2 className="text-xl font-bold text-white">Creator Spotlight</h2>
        </div>
        <Link href="/creator" className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1 transition-colors">
          Become a Creator <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {creators.map((c) => (
          <div key={c.name} className="glass-card rounded-xl p-4 hover:border-white/20 transition-all cursor-pointer group">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black mb-3 transition-transform group-hover:scale-110"
              style={{ background: `${c.color}20`, color: c.color, border: `2px solid ${c.color}40` }}
            >
              {c.name.charAt(0)}
            </div>
            <p className="text-sm font-semibold text-white truncate">{c.name}</p>
            <p className="text-xs text-white/40 mt-0.5">{c.category}</p>
            <p className="text-xs mt-2" style={{ color: c.color }}>{c.videos} videos</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Main Page ────────────────────────────────────────── */
export default function Home() {
  const { isAuthenticated } = useAuth();
  const { data: liveData } = trpc.live.viewerCount.useQuery(undefined, { refetchInterval: 30000 });
  const { data: watchlistIds = [], refetch: refetchWatchlist } = trpc.watchlist.ids.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  return (
    <>
      <SEO
        url="/"
        title="ZTVLIVE — Premium 24/7 Streaming Platform"
        description="Watch live TV, tech reviews, gaming, sports, movies, podcasts, news, and music on ZTVLIVE. Play trivia games, win prizes, and join 500+ creators earning 70% revenue share."
      />

      {/* Hero */}
      <HeroCarousel viewerCount={liveData?.count ?? 0} />

      {/* Main content */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 py-10">
        {/* Stats */}
        <StatsStrip />

        {/* Category Browse Rows — all 8 categories */}
        {CATEGORIES.map((cat) => (
          <CategoryRow
            key={cat.key}
            category={cat.key}
            label={cat.label}
            icon={cat.icon}
            color={cat.color}
            watchlistIds={watchlistIds}
            onWatchlistChange={refetchWatchlist}
          />
        ))}

        {/* Creator Spotlight */}
        <CreatorSpotlight />

        {/* ZTVLIVE+ Promo */}
        <PlusPromoStrip />

        {/* Sign-up CTA for guests */}
        {!isAuthenticated && (
          <div className="text-center py-12 border-t border-white/5">
            <Star className="w-8 h-8 text-[oklch(0.72_0.2_220)] mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">Save what you love. Sync everywhere.</h3>
            <p className="text-white/50 text-sm mb-6 max-w-md mx-auto">
              Create a free ZTVLIVE account to build your watchlist, save quiz scores, and set show reminders that follow you to Roku, mobile, and the web.
            </p>
            <Button
              onClick={() => (window.location.href = getLoginUrl())}
              className="bg-gradient-to-r from-[oklch(0.72_0.2_220)] to-[oklch(0.65_0.25_290)] text-white border-0 font-bold px-8"
            >
              Get started — it's free
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
