import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { SEO } from "@/components/SEO";
import { VideoCard } from "@/components/VideoCard";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Play, ChevronLeft, ChevronRight, Zap, Film, Gamepad2,
  Trophy, Mic2, Newspaper, Music, Tv2, Star, ArrowRight,
  Users, TrendingUp, Crown, Sparkles, Radio, Clock,
  CheckCircle2, Flame, MessageSquare, Bell, Layers, BookMarked
} from "lucide-react";

/* ── Hero slides ─────────────────────────────────────────── */
const HERO_SLIDES = [
  {
    id: 1,
    badge: "LIVE NOW",
    badgeType: "live" as const,
    title: "Watch Live 24/7",
    subtitle: "Stream live TV, tech reviews, gaming, sports, and more — free, anytime.",
    cta: { label: "Watch Live", href: "/live", primary: true },
    cta2: { label: "Browse Library", href: "/library" },
    heroImg: "https://d2xsxph8kpxj0f.cloudfront.net/310519663672855435/oUjtApkrWU2mw4gxUbLk6S/hero1_watch_live-h73mHFqSoy8kF6Lsg2KwnJ.webp",
    accentColor: "oklch(0.74 0.21 218)",
  },
  {
    id: 2,
    badge: "DAILY PRIZES",
    badgeType: "new" as const,
    title: "Play & Win Daily",
    subtitle: "Compete in our daily trivia championship. Top scores win real prizes every day.",
    cta: { label: "Play Quiz Now", href: "/quiz", primary: true },
    cta2: { label: "View Leaderboard", href: "/quiz#leaderboard" },
    heroImg: "https://d2xsxph8kpxj0f.cloudfront.net/310519663672855435/oUjtApkrWU2mw4gxUbLk6S/hero3_live_event-SXQY4UR8VuDhAp5SvvsxGc.webp",
    accentColor: "oklch(0.66 0.26 290)",
  },
  {
    id: 3,
    badge: "ZTVLIVE+",
    badgeType: "premium" as const,
    title: "Upgrade to ZTVLIVE+",
    subtitle: "Ad-free streaming, exclusive content, premium quiz mode. Starting at $4.99/month.",
    cta: { label: "Get ZTVLIVE+", href: "/subscribe", primary: true },
    cta2: { label: "Compare Plans", href: "/subscribe#compare" },
    heroImg: "https://d2xsxph8kpxj0f.cloudfront.net/310519663672855435/oUjtApkrWU2mw4gxUbLk6S/hero4_ztvplus-B46hpJ9AUqTydFcrrWDWBE.webp",
    accentColor: "oklch(0.82 0.18 85)",
  },
  {
    id: 4,
    badge: "EARN 70%",
    badgeType: "live" as const,
    title: "Become a Creator",
    subtitle: "Upload your content, build your audience, and earn 70% revenue share from day one.",
    cta: { label: "Start Creating", href: "/creator", primary: true },
    cta2: { label: "See Earnings", href: "/creator#calculator" },
    heroImg: "https://d2xsxph8kpxj0f.cloudfront.net/310519663672855435/oUjtApkrWU2mw4gxUbLk6S/hero2_creator-hScapWwYRBAEwqkeUGrkCS.webp",
    accentColor: "oklch(0.66 0.26 290)",
  },
  {
    id: 5,
    badge: "1,000+ TITLES",
    badgeType: "new" as const,
    title: "Explore the Library",
    subtitle: "Thousands of videos across tech, gaming, sports, movies, podcasts, news, and music.",
    cta: { label: "Browse Library", href: "/library", primary: true },
    cta2: { label: "View Schedule", href: "/schedule" },
    heroImg: "https://d2xsxph8kpxj0f.cloudfront.net/310519663672855435/oUjtApkrWU2mw4gxUbLk6S/hero5_multidevice-2MaPVxfNuiRAVrHsUeNBPc.webp",
    accentColor: "oklch(0.74 0.21 218)",
  },
];

/* ── Category config ─────────────────────────────────────── */
const CATEGORIES = [
  { key: "live",     label: "Live",      icon: <Radio className="w-4 h-4" />,     color: "text-red-400",    accentColor: "oklch(0.65 0.25 25)" },
  { key: "tech",     label: "Tech",      icon: <Zap className="w-4 h-4" />,        color: "text-blue-400",   accentColor: "oklch(0.74 0.21 218)" },
  { key: "gaming",   label: "Gaming",    icon: <Gamepad2 className="w-4 h-4" />,   color: "text-violet-400", accentColor: "oklch(0.65 0.25 290)" },
  { key: "sports",   label: "Sports",    icon: <Trophy className="w-4 h-4" />,     color: "text-yellow-400", accentColor: "oklch(0.65 0.22 150)" },
  { key: "movies",   label: "Movies",    icon: <Film className="w-4 h-4" />,       color: "text-pink-400",   accentColor: "oklch(0.78 0.18 60)" },
  { key: "podcasts", label: "Podcasts",  icon: <Mic2 className="w-4 h-4" />,       color: "text-green-400",  accentColor: "oklch(0.7 0.18 200)" },
  { key: "news",     label: "News",      icon: <Newspaper className="w-4 h-4" />,  color: "text-orange-400", accentColor: "oklch(0.72 0.2 25)" },
  { key: "music",    label: "Music",     icon: <Music className="w-4 h-4" />,      color: "text-cyan-400",   accentColor: "oklch(0.7 0.2 320)" },
  { key: "other",    label: "Other",     icon: <Layers className="w-4 h-4" />,     color: "text-slate-400",  accentColor: "oklch(0.65 0.08 264)" },
];

/* ── Animated counter ────────────────────────────────────── */
function AnimatedNumber({ value }: { value: string }) {
  const num = parseFloat(value.replace(/[^0-9.]/g, ""));
  const [display, setDisplay] = useState(() => isNaN(num) ? value : value);
  const ref = useRef<HTMLSpanElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    if (isNaN(num) || animated.current) { setDisplay(value); return; }
    // Always show the final value immediately, then animate if visible
    setDisplay(value);
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || animated.current) return;
      animated.current = true;
      let start = 0;
      const duration = 1400;
      const suffix = value.replace(/[0-9.,]/g, "");
      const step = (timestamp: number) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(eased * num);
        setDisplay((current >= 1000 ? (current / 1000).toFixed(1) + "K" : String(current)) + (progress < 1 ? "" : suffix));
        if (progress < 1) requestAnimationFrame(step);
        else setDisplay(value);
      };
      requestAnimationFrame(step);
      observer.disconnect();
    }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, num]);

  return <span ref={ref}>{display}</span>;
}

/* ── Category row ────────────────────────────────────────── */
function CategoryRow({ category, label, icon, color, accentColor, videos: propVideos, isLoading: propLoading }: {
  category: string; label: string; icon: React.ReactNode; color: string; accentColor: string;
  videos?: any[];
  isLoading?: boolean;
}) {
  // Use pre-fetched videos if provided, otherwise fall back to individual query
  const fallbackQuery = trpc.videos.byCategory.useQuery(
    { category, limit: 10 },
    { enabled: propVideos === undefined }
  );
  const videos = propVideos ?? fallbackQuery.data;
  const isLoading = propLoading ?? fallbackQuery.isLoading;
  const rowRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!rowRef.current) return;
    setCanScrollLeft(rowRef.current.scrollLeft > 0);
    setCanScrollRight(rowRef.current.scrollLeft < rowRef.current.scrollWidth - rowRef.current.clientWidth - 10);
  };

  const scroll = (dir: "left" | "right") => {
    if (!rowRef.current) return;
    rowRef.current.scrollBy({ left: dir === "right" ? 340 : -340, behavior: "smooth" });
    setTimeout(checkScroll, 350);
  };

  if (!isLoading && (!videos || videos.length === 0)) return null;

  return (
    <section className="py-1">
      {/* Row header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg" style={{ background: `${accentColor}18` }}>
            <span className={color}>{icon}</span>
          </div>
          <h2 className="text-lg font-black text-white tracking-tight">{label}</h2>
          {!isLoading && videos && videos.length > 0 && (
            <span className="text-xs text-white/25 font-medium">{videos.length} titles</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Link href={`/library?category=${category}`}
            className="text-xs font-bold flex items-center gap-1 transition-colors mr-1"
            style={{ color: accentColor }}>
            See all <ArrowRight className="w-3 h-3" />
          </Link>
          <button onClick={() => scroll("left")} disabled={!canScrollLeft}
            className={`p-1.5 rounded-lg transition-all ${
              canScrollLeft ? "bg-white/6 hover:bg-white/12 text-white/70 hover:text-white" : "bg-white/3 text-white/20 cursor-not-allowed"
            }`}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => scroll("right")} disabled={!canScrollRight}
            className={`p-1.5 rounded-lg transition-all ${
              canScrollRight ? "bg-white/6 hover:bg-white/12 text-white/70 hover:text-white" : "bg-white/3 text-white/20 cursor-not-allowed"
            }`}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scroll row */}
      <div ref={rowRef} onScroll={checkScroll} className="scroll-row pb-2">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-[260px] flex-shrink-0">
                <div className="aspect-video rounded-xl shimmer mb-2.5" />
                <div className="h-3 w-3/4 rounded shimmer mb-1.5" />
                <div className="h-2.5 w-1/2 rounded shimmer" />
              </div>
            ))
          : videos?.map((v) => <VideoCard key={v.id} video={v} />)
        }
      </div>
    </section>
  );
}

/* ── Creator Spotlight ───────────────────────────────────── */
const CREATORS = [
  { name: "Good Tech Cheap",  genre: "Tech Reviews",   videos: 45, gradient: "from-[oklch(0.74_0.21_218)] to-[oklch(0.56_0.24_290)]", initial: "G" },
  { name: "ZTVLIVE Gaming",   genre: "Gaming",          videos: 28, gradient: "from-[oklch(0.56_0.24_290)] to-[oklch(0.65_0.25_25)]",  initial: "Z" },
  { name: "ZTVLIVE Docs",     genre: "Documentaries",   videos: 19, gradient: "from-[oklch(0.65_0.22_150)] to-[oklch(0.74_0.21_218)]", initial: "Z" },
  { name: "Eliances Network", genre: "Business",        videos: 12, gradient: "from-[oklch(0.78_0.18_60)] to-[oklch(0.65_0.25_25)]",   initial: "E" },
];

/* ── SMS Opt-In Section ─────────────────────────────────── */
function SMSOptInSection() {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const smsOptIn = trpc.sms.optIn.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setPhone("");
      setName("");
    },
    onError: (err) => {
      setError(err.message || "Something went wrong. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const cleaned = phone.replace(/[^\d+]/g, "");
    if (cleaned.length < 10) {
      setError("Please enter a valid phone number.");
      return;
    }
    smsOptIn.mutate({ phone: cleaned, name: name || undefined, source: "homepage" });
  };

  return (
    <section className="relative overflow-hidden rounded-2xl p-8 md:p-10"
      style={{ background: "linear-gradient(135deg, oklch(0.10 0.02 264) 0%, oklch(0.08 0.015 264) 100%)", border: "1px solid oklch(0.74 0.21 218 / 0.2)" }}>
      {/* Glow */}
      <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, oklch(0.74 0.21 218 / 0.08) 0%, transparent 70%)", filter: "blur(40px)" }} />
      <div className="relative flex flex-col md:flex-row items-start md:items-center gap-8">
        {/* Left */}
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4"
            style={{ background: "oklch(0.74 0.21 218 / 0.12)", color: "oklch(0.74 0.21 218)", border: "1px solid oklch(0.74 0.21 218 / 0.25)" }}>
            <Bell className="w-3 h-3" />
            SMS Early Access
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white mb-2 tracking-tight">
            Get notified first. Every drop.
          </h2>
          <p className="text-white/50 text-sm leading-relaxed max-w-sm">
            New episodes, live events, and exclusive ZTVLIVE+ deals — straight to your phone before anyone else.
          </p>
          <div className="flex flex-wrap gap-4 mt-4">
            {["New episode alerts", "Live event reminders", "Exclusive deals"].map((f) => (
              <div key={f} className="flex items-center gap-1.5 text-xs text-white/55">
                <MessageSquare className="w-3 h-3 text-[oklch(0.74_0.21_218)] flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>
        {/* Right — form */}
        <div className="w-full md:w-auto md:min-w-[320px]">
          {submitted ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: "oklch(0.74 0.21 218 / 0.15)" }}>
                <CheckCircle2 className="w-6 h-6 text-[oklch(0.74_0.21_218)]" />
              </div>
              <p className="text-white font-bold text-sm">You're on the list!</p>
              <p className="text-white/45 text-xs">Check your phone — a welcome text is on its way.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Your name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
                style={{ background: "oklch(0.12 0.015 264)", border: "1px solid oklch(0.74 0.21 218 / 0.2)" }}
              />
              <input
                type="tel"
                placeholder="Your phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
                style={{ background: "oklch(0.12 0.015 264)", border: "1px solid oklch(0.74 0.21 218 / 0.2)" }}
              />
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <button
                type="submit"
                disabled={smsOptIn.isPending}
                className="w-full py-3 rounded-xl font-black text-sm text-white transition-all duration-150 active:scale-95 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, oklch(0.74 0.21 218), oklch(0.56 0.24 290))" }}>
                {smsOptIn.isPending ? "Signing up..." : "Text me first 🔔"}
              </button>
              <p className="text-white/25 text-xs text-center">By signing up you agree to receive SMS alerts. Reply STOP to unsubscribe anytime.</p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

/* ── Main component ──────────────────────────────────────── */
export default function Home() {
  const [slide, setSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { isAuthenticated } = useAuth();
  const { data: liveData } = trpc.live.viewerCount.useQuery(undefined, { refetchInterval: 30000 });
  const { data: trending } = trpc.videos.trending.useQuery();
  const { data: featured } = trpc.videos.featured.useQuery();
  const { data: platformStats } = trpc.platform.stats.useQuery(undefined, { staleTime: 60000 });
  // Single query for all 8 category rows — avoids 8 simultaneous queries causing 504 timeout
  const { data: allCategoryData, isLoading: allCatsLoading } = trpc.videos.allCategories.useQuery(
    { limitPerCategory: 10 },
    { staleTime: 120000 }
  );
  // Continue Watching — watchlist for logged-in users
  const { data: watchlistVideos } = trpc.watchlist.get.useQuery(
    undefined,
    { enabled: isAuthenticated, staleTime: 30000 }
  );

  const nextSlide = useCallback(() => setSlide((s) => (s + 1) % HERO_SLIDES.length), []);
  const prevSlide = () => setSlide((s) => (s - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);

  useEffect(() => {
    if (isAutoPlaying) {
      intervalRef.current = setInterval(nextSlide, 6000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isAutoPlaying, nextSlide]);

  const goToSlide = (i: number) => {
    setSlide(i);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const current = HERO_SLIDES[slide]!;

  return (
    <>
      <SEO
        title="ZTVLIVE — Premium 24/7 Live Streaming Platform"
        description="Watch live TV, tech, gaming, sports, movies, podcasts, news, and music on ZTVLIVE. Free to watch. Play daily trivia and win prizes. Creators earn 70% revenue share."
        url="/"
      />

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ height: "min(92vh, 700px)" }}>
        {/* Background images */}
        {HERO_SLIDES.map((s, i) => (
          <div key={s.id}
            className="absolute inset-0 transition-opacity duration-1000"
            style={{ opacity: i === slide ? 1 : 0 }}>
            <img
              src={s.heroImg}
              alt={s.title}
              className="w-full h-full object-cover scale-105"
              loading={i === 0 ? "eager" : "lazy"}
              style={{ transition: "transform 8s ease-out", transform: i === slide ? "scale(1)" : "scale(1.05)" }}
            />
            {/* Multi-layer cinematic overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.04_0.012_264/0.97)] via-[oklch(0.06_0.012_264/0.7)] to-[oklch(0.06_0.012_264/0.15)]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.06_0.012_264)] via-[oklch(0.06_0.012_264/0.3)] to-transparent" />
            {/* Accent color tint */}
            <div className="absolute inset-0 opacity-10"
              style={{ background: `radial-gradient(ellipse at 20% 50%, ${s.accentColor} 0%, transparent 60%)` }} />
          </div>
        ))}

        {/* Floating particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute rounded-full opacity-20 animate-float"
              style={{
                width: `${Math.random() * 4 + 2}px`,
                height: `${Math.random() * 4 + 2}px`,
                background: current.accentColor,
                left: `${10 + i * 15}%`,
                top: `${20 + (i % 3) * 20}%`,
                animationDelay: `${i * 0.7}s`,
                animationDuration: `${3 + i * 0.5}s`,
              }} />
          ))}
        </div>

        {/* Content */}
        <div className="relative h-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
          <div className="max-w-2xl" key={slide}>
            {/* Badge */}
            <div className="mb-5 fade-in-up" style={{ animationDelay: "0ms" }}>
              {current.badgeType === "live" && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest text-white bg-red-500/90 shadow-lg shadow-red-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  {current.badge}
                </span>
              )}
              {current.badgeType === "new" && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest text-[oklch(0.06_0.012_264)] shadow-lg"
                  style={{ background: current.accentColor, boxShadow: `0 4px 20px ${current.accentColor}40` }}>
                  {current.badge}
                </span>
              )}
              {current.badgeType === "premium" && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest text-[oklch(0.06_0.012_264)] bg-gradient-to-r from-[oklch(0.82_0.18_85)] to-[oklch(0.78_0.22_60)] shadow-lg shadow-[oklch(0.82_0.18_85/0.4)]">
                  <Crown className="w-3 h-3" />
                  {current.badge}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-none tracking-tight text-white mb-5 fade-in-up"
              style={{ animationDelay: "60ms", textShadow: "0 2px 40px rgba(0,0,0,0.5)" }}>
              {current.title}
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-white/65 mb-8 leading-relaxed max-w-lg fade-in-up"
              style={{ animationDelay: "120ms" }}>
              {current.subtitle}
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 fade-in-up" style={{ animationDelay: "180ms" }}>
              <Link href={current.cta.href}>
                <button className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-black text-sm
                  text-[oklch(0.06_0.012_264)] hover:opacity-90 active:scale-95 transition-all duration-150
                  shadow-2xl"
                  style={{
                    background: current.accentColor,
                    boxShadow: `0 8px 32px ${current.accentColor}40`,
                  }}>
                  <Play className="w-4 h-4 fill-current" />
                  {current.cta.label}
                </button>
              </Link>
              <Link href={current.cta2.href}>
                <button className="flex items-center gap-2 px-5 py-3.5 rounded-xl font-bold text-sm
                  text-white/80 hover:text-white border border-white/15 hover:border-white/30
                  bg-white/5 hover:bg-white/10 backdrop-blur-sm active:scale-95 transition-all duration-150">
                  {current.cta2.label}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </Link>

              {/* Live counter */}
              {liveData && (
                <div className="flex items-center gap-2 text-sm text-white/60 ml-1">
                  <span className="live-dot" />
                  <span className="font-black text-white">{liveData.count.toLocaleString()}</span>
                  <span>watching now</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Slide controls */}
        <button onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full
            bg-black/30 backdrop-blur-md border border-white/10 text-white/70 hover:text-white
            hover:bg-black/50 hover:border-white/25 transition-all duration-150 z-10
            flex items-center justify-center">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full
            bg-black/30 backdrop-blur-md border border-white/10 text-white/70 hover:text-white
            hover:bg-black/50 hover:border-white/25 transition-all duration-150 z-10
            flex items-center justify-center">
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Slide thumbnails / dots */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
          {HERO_SLIDES.map((_, i) => (
            <button key={i} onClick={() => goToSlide(i)}
              className="transition-all duration-300 rounded-full"
              style={{
                width: i === slide ? "32px" : "8px",
                height: "8px",
                background: i === slide ? current.accentColor : "oklch(1 0 0 / 0.25)",
                boxShadow: i === slide ? `0 0 10px ${current.accentColor}80` : "none",
              }} />
          ))}
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/8">
          <div className="h-full transition-none"
            style={{
              background: current.accentColor,
              width: `${((slide + 1) / HERO_SLIDES.length) * 100}%`,
              transition: "width 6s linear",
            }} />
        </div>
      </section>

      {/* ── TICKER ───────────────────────────────────────── */}
      <div className="ticker-bar py-2.5 overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...Array(2)].map((_, rep) => (
            <span key={rep} className="flex items-center gap-8 px-8">
              {[
                "🔴 LIVE NOW on ZTVLIVE",
                "🏆 Daily Quiz — Win Real Prizes",
                "⚡ 70% Creator Revenue Share",
                "🎬 1,000+ Videos On Demand",
                "📺 24/7 Live TV Streaming",
                "✨ ZTVLIVE+ — Ad-Free Experience",
                "🎮 Gaming · Tech · Sports · Music · Podcasts",
              ].map((t, i) => (
                <span key={i} className="text-xs text-white/45 font-semibold flex items-center gap-2">
                  {t}
                  <span className="text-white/15">◆</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ── STATS BAR ────────────────────────────────────── */}
      <section className="py-6 border-b border-white/6">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: <Tv2 className="w-5 h-5" />,        value: platformStats ? `${platformStats.liveChannels}` : "2",   label: "Live Channels",   color: "text-[oklch(0.74_0.21_218)]", bg: "bg-[oklch(0.74_0.21_218/0.08)]" },
              { icon: <Film className="w-5 h-5" />,        value: platformStats ? `${platformStats.videoCount}+` : "28+", label: "Videos On Demand",  color: "text-violet-400",              bg: "bg-violet-400/8" },
              { icon: <TrendingUp className="w-5 h-5" />,  value: "70%",    label: "Creator Revenue Share", color: "text-yellow-400",              bg: "bg-yellow-400/8" },
              { icon: <Users className="w-5 h-5" />,       value: platformStats ? `${platformStats.creatorCount}` : "8",   label: "Active Creators", color: "text-green-400",               bg: "bg-green-400/8" },
            ].map((stat, i) => (
              <div key={i}
                className="flex items-center gap-3.5 p-4 rounded-2xl bg-white/3 border border-white/6
                  hover:border-white/12 hover:bg-white/5 transition-all duration-200 group">
                <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color} flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                  {stat.icon}
                </div>
                <div>
                  <div className="text-2xl font-black text-white leading-none tracking-tight">
                    <AnimatedNumber value={stat.value} />
                  </div>
                  <div className="text-xs text-white/40 mt-0.5 font-semibold">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTENT ROWS ─────────────────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">

        {/* ── FEATURED SHOW SPOTLIGHT: CommunityCut Episode 1 ── */}
        <section>
          <div className="flex items-center justify-between mb-5 px-1">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-[oklch(0.82_0.18_85/0.12)]">
                <Sparkles className="w-4 h-4 text-[oklch(0.82_0.18_85)]" />
              </div>
              <h2 className="text-lg font-black text-white tracking-tight">Featured Show</h2>
              <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full
                bg-[oklch(0.82_0.18_85/0.15)] text-[oklch(0.82_0.18_85)] border border-[oklch(0.82_0.18_85/0.3)]">
                NEW
              </span>
            </div>
            <Link href="/library"
              className="text-xs font-bold text-[oklch(0.82_0.18_85)] flex items-center gap-1 hover:text-white transition-colors">
              All Shows <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Large feature card */}
          <Link href="/watch/90001">
            <div className="group relative rounded-2xl overflow-hidden cursor-pointer
              ring-1 ring-white/8 hover:ring-[oklch(0.82_0.18_85/0.4)] transition-all duration-300
              shadow-2xl shadow-black/40 hover:shadow-[oklch(0.82_0.18_85/0.15)]">
              {/* Thumbnail */}
              <div className="relative aspect-video w-full overflow-hidden">
                <img
                  src="https://img.youtube.com/vi/kAuceuSsauc/maxresdefault.jpg"
                  alt="CommunityCut Weekly — The Nia Luxe Show Is Here | Episode 1"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  loading="eager"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                {/* Play button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-white/15 backdrop-blur-md border border-white/30
                    flex items-center justify-center opacity-0 group-hover:opacity-100
                    scale-90 group-hover:scale-100 transition-all duration-300 shadow-2xl">
                    <Play className="w-8 h-8 text-white fill-white ml-1" />
                  </div>
                </div>
                {/* Episode badge */}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider px-3 py-1.5
                    rounded-full bg-[oklch(0.82_0.18_85)] text-[oklch(0.06_0.012_264)] shadow-lg">
                    <CheckCircle2 className="w-3 h-3" />
                    Episode 1
                  </span>
                  <span className="text-xs font-black uppercase tracking-wider px-3 py-1.5
                    rounded-full bg-black/60 backdrop-blur-sm text-white border border-white/20">
                    CommunityCut Weekly
                  </span>
                </div>
                {/* Bottom metadata */}
                <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7">
                  <p className="text-xs font-bold text-[oklch(0.82_0.18_85)] uppercase tracking-wider mb-1.5">
                    The Nia Luxe Show
                  </p>
                  <h3 className="text-2xl md:text-3xl font-black text-white leading-tight mb-2 drop-shadow-lg">
                    The Nia Luxe Show Is Here
                  </h3>
                  <p className="text-sm text-white/70 max-w-2xl leading-relaxed hidden md:block">
                    Real talks. Real people. Real change. Join host Nia Luxe as she brings unfiltered
                    conversations about the grooming industry, entrepreneurship, and community.
                  </p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="flex items-center gap-1.5 text-xs text-white/50">
                      <Clock className="w-3 h-3" /> 45 min
                    </span>
                    <span className="text-white/20">·</span>
                    <span className="text-xs text-white/50">Podcasts</span>
                    <span className="text-white/20">·</span>
                    <span className="text-xs font-bold text-[oklch(0.74_0.21_218)]">Watch Now →</span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </section>

        {/* ── CONTINUE WATCHING (logged-in users only) ──── */}
        {isAuthenticated && watchlistVideos && watchlistVideos.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5 px-1">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[oklch(0.74_0.21_218/0.1)]">
                  <BookMarked className="w-4 h-4 text-[oklch(0.74_0.21_218)]" />
                </div>
                <h2 className="text-lg font-black text-white tracking-tight">My Watchlist</h2>
                <span className="text-xs text-white/25 font-medium">{watchlistVideos.length} saved</span>
              </div>
              <Link href="/watchlist"
                className="text-xs font-bold text-[oklch(0.74_0.21_218)] flex items-center gap-1 hover:text-white transition-colors">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="scroll-row pb-2">
              {watchlistVideos.slice(0, 10).map((v) => <VideoCard key={v.id} video={v} />)}
            </div>
          </section>
        )}

        {/* Trending Now — grid layout for visual impact */}
        {trending && trending.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5 px-1">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-orange-400/10">
                  <Flame className="w-4 h-4 text-orange-400" />
                </div>
                <h2 className="text-lg font-black text-white tracking-tight">Trending Now</h2>
              </div>
              <Link href="/library"
                className="text-xs font-bold text-orange-400 flex items-center gap-1 hover:text-white transition-colors">
                See all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 stagger-children">
              {trending.slice(0, 6).map((v) => <VideoCard key={v.id} video={v} size="sm" />)}
            </div>
          </section>
        )}

        {/* Featured / New Releases */}
        {featured && featured.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5 px-1">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-[oklch(0.74_0.21_218/0.1)]">
                  <Star className="w-4 h-4 text-[oklch(0.74_0.21_218)]" />
                </div>
                <h2 className="text-lg font-black text-white tracking-tight">New Releases</h2>
              </div>
              <Link href="/library"
                className="text-xs font-bold text-[oklch(0.74_0.21_218)] flex items-center gap-1 hover:text-white transition-colors">
                See all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="scroll-row pb-2">
              {featured.slice(0, 10).map((v) => <VideoCard key={v.id} video={v} />)}
            </div>
          </section>
        )}

        {/* Category rows — all 8, powered by a single allCategories query */}
        {CATEGORIES.map((cat) => (
          <CategoryRow
            key={cat.key}
            category={cat.key}
            label={cat.label}
            icon={cat.icon}
            color={cat.color}
            accentColor={cat.accentColor}
            videos={allCategoryData ? (allCategoryData as any)[cat.key] : undefined}
            isLoading={allCatsLoading}
          />
        ))}

        {/* Creator Spotlight */}
        <section>
          <div className="flex items-center justify-between mb-5 px-1">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-yellow-400/10">
                <Star className="w-4 h-4 text-yellow-400" />
              </div>
              <h2 className="text-lg font-black text-white tracking-tight">Creator Spotlight</h2>
            </div>
            <Link href="/creator"
              className="text-xs font-bold text-yellow-400 flex items-center gap-1 hover:text-white transition-colors">
              Become a Creator <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-children">
            {CREATORS.map((c) => (
              <Link key={c.name} href="/creator">
                <div className="group p-5 rounded-2xl bg-white/3 border border-white/6
                  hover:border-white/15 hover:bg-white/5 transition-all duration-200 cursor-pointer">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${c.gradient} flex items-center justify-center
                    text-xl font-black text-white mb-4 group-hover:scale-110 transition-transform duration-200
                    shadow-lg`}>
                    {c.initial}
                  </div>
                  <div className="font-black text-white text-sm leading-tight mb-1">{c.name}</div>
                  <div className="text-xs text-white/40 mb-3 font-medium">{c.genre}</div>
                  <div className="flex items-center gap-1.5">
                    <Film className="w-3 h-3 text-white/30" />
                    <span className="text-xs text-white/40">{c.videos} videos</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ZTVLIVE+ Promo Strip */}
        <section className="relative overflow-hidden rounded-3xl p-8 md:p-12">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.74_0.21_218/0.12)] via-[oklch(0.56_0.24_290/0.08)] to-[oklch(0.06_0.012_264)] rounded-3xl" />
          <div className="absolute inset-0 rounded-3xl" style={{ border: "1px solid oklch(0.74 0.21 218 / 0.25)" }} />
          {/* Glow orbs */}
          <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, oklch(0.74 0.21 218 / 0.12) 0%, transparent 70%)", filter: "blur(40px)" }} />
          <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, oklch(0.56 0.24 290 / 0.1) 0%, transparent 70%)", filter: "blur(40px)" }} />

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest
                text-[oklch(0.06_0.012_264)] bg-gradient-to-r from-[oklch(0.82_0.18_85)] to-[oklch(0.78_0.22_60)]
                shadow-lg shadow-[oklch(0.82_0.18_85/0.3)] mb-5">
                <Crown className="w-3 h-3" />
                ZTVLIVE+
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-3 leading-tight tracking-tight">
                Unlock the full experience
              </h2>
              <p className="text-white/55 text-base max-w-lg leading-relaxed mb-5">
                Ad-free streaming, exclusive content, premium quiz mode, early access to new shows,
                and priority creator support. Starting at just <strong className="text-white font-black">$4.99/month</strong>.
              </p>
              <div className="flex flex-wrap gap-3">
                {["Ad-free streaming", "Exclusive content", "Premium quiz mode", "Priority support"].map((f) => (
                  <div key={f} className="flex items-center gap-1.5 text-sm text-white/65">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[oklch(0.74_0.21_218)] flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 flex-shrink-0">
              <Link href="/subscribe">
                <button className="flex items-center gap-2 px-8 py-4 rounded-xl font-black text-sm
                  bg-gradient-to-r from-[oklch(0.74_0.21_218)] to-[oklch(0.56_0.24_290)]
                  text-white hover:opacity-90 active:scale-95 transition-all duration-150
                  shadow-2xl shadow-[oklch(0.74_0.21_218/0.3)] whitespace-nowrap">
                  <Crown className="w-4 h-4" />
                  Get ZTVLIVE+
                </button>
              </Link>
              <p className="text-xs text-white/35 text-center">Cancel anytime · No contracts</p>
            </div>
          </div>
        </section>

        {/* SMS Early Access Opt-In */}
        <SMSOptInSection />

        {/* Free account CTA */}
        <section className="relative overflow-hidden rounded-2xl p-8 md:p-10 text-center
          bg-white/2 border border-white/6">
          <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.56_0.24_290/0.04)] to-[oklch(0.74_0.21_218/0.04)] rounded-2xl" />
          <div className="relative">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-[oklch(0.74_0.21_218)]" />
              <span className="text-xs font-black text-[oklch(0.74_0.21_218)] uppercase tracking-widest">Free Forever</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white mb-3 tracking-tight">
              Save what you love. Sync everywhere.
            </h2>
            <p className="text-white/50 mb-6 max-w-md mx-auto text-sm leading-relaxed">
              Create a free ZTVLIVE account to build your watchlist, save quiz scores, and set show reminders
              that follow you across Roku, mobile, and the web.
            </p>
            <Link href="/watchlist">
              <button className="px-8 py-3 rounded-xl font-bold text-sm border border-[oklch(0.74_0.21_218/0.4)]
                text-[oklch(0.74_0.21_218)] hover:bg-[oklch(0.74_0.21_218)] hover:text-[oklch(0.06_0.012_264)]
                transition-all duration-150 active:scale-95">
                Get started — it's free
              </button>
            </Link>
          </div>
        </section>

      </div>
    </>
  );
}
