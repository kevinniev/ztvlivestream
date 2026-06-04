import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { SEO } from "@/components/SEO";
import {
  Play, X, ExternalLink, Bell, ChevronRight, Clock,
  Users, Star, Tv2, Calendar, ArrowRight, CheckCircle2,
  Youtube, Scissors, Sparkles
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const YOUTUBE_VIDEO_ID = "D588b8aR2DY";
const YOUTUBE_CHANNEL_URL = "https://youtube.com/@communitycut?si=DFB3aBv-ibEMCQjg";
const YOUTUBE_SUBSCRIBE_URL = "https://youtube.com/@communitycut?sub_confirmation=1";
const FULL_EPISODE_URL = `https://youtu.be/${YOUTUBE_VIDEO_ID}`;

const EPISODES = [
  {
    ep: 2,
    title: "The Money Is In The Movement",
    description: "Visibility is the new currency. Nia Luxe breaks down why grooming pros on CommunityCut are averaging 40% more bookings in their first 90 days — and what the new Pro Marketplace means for your business.",
    duration: "2:04",
    thumbnail: "/manus-storage/ccw_ep2_hero_new_c179fcba.webp",
    youtubeId: YOUTUBE_VIDEO_ID,
    isNew: true,
    scheduledAt: "June 4, 2026 · 9:00 AM MST",
    tags: ["Visibility", "Pro Marketplace", "Bookings", "Business Growth"],
  },
  {
    ep: 1,
    title: "The Nia Luxe Show Is Here",
    description: "Real talks. Real people. Real change. Join host Nia Luxe as she brings unfiltered conversations about the grooming industry, entrepreneurship, and community.",
    duration: "45 min",
    thumbnail: "https://img.youtube.com/vi/kAuceuSsauc/maxresdefault.jpg",
    youtubeId: "kAuceuSsauc",
    isNew: false,
    scheduledAt: "May 29, 2026",
    tags: ["Intro", "Grooming Industry", "Community", "Entrepreneurship"],
  },
];

/* ── Subscribe Gate Modal ─────────────────────────────────── */
function SubscribeGateModal({
  open,
  onClose,
  onSubscribed,
  episodeTitle,
}: {
  open: boolean;
  onClose: () => void;
  onSubscribed: () => void;
  episodeTitle: string;
}) {
  const handleSubscribe = () => {
    window.open(YOUTUBE_SUBSCRIBE_URL, "_blank", "noopener,noreferrer");
    // Give them a moment then unlock
    setTimeout(() => {
      onSubscribed();
    }, 1500);
  };

  const handleAlreadySubscribed = () => {
    onSubscribed();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md w-full p-0 overflow-hidden border-0 bg-transparent shadow-none"
      >
        <DialogTitle className="sr-only">CommunityCut Weekly — Subscribe to Watch</DialogTitle>
        {/* Modal card */}
        <div className="relative rounded-2xl overflow-hidden"
          style={{ background: "linear-gradient(145deg, oklch(0.10 0.015 264), oklch(0.08 0.012 264))" }}>
          {/* Top accent bar */}
          <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, oklch(0.74 0.21 218), oklch(0.56 0.24 290))" }} />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/8 hover:bg-white/15 text-white/60 hover:text-white transition-all z-10"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-7">
            {/* Icon */}
            <div className="flex items-center justify-center mb-5">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl"
                  style={{ background: "linear-gradient(135deg, oklch(0.74 0.21 218), oklch(0.56 0.24 290))" }}>
                  <Youtube className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center border-2 border-[oklch(0.10_0.015_264)]">
                  <Bell className="w-3 h-3 text-white fill-white" />
                </div>
              </div>
            </div>

            {/* Headline */}
            <div className="text-center mb-6">
              <h2 className="text-xl font-black text-white leading-tight mb-2">
                Watch the Full Episode Free
              </h2>
              <p className="text-sm text-white/60 leading-relaxed">
                <span className="text-white/80 font-semibold">"{episodeTitle}"</span> is available free on YouTube.
                Subscribe so you never miss a Thursday drop.
              </p>
            </div>

            {/* Benefits */}
            <div className="space-y-2.5 mb-6">
              {[
                "New episode every Thursday at 9 AM MST",
                "Free early access for subscribers",
                "Real talk for grooming pros — no fluff",
              ].map((b, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[oklch(0.74_0.21_218)] flex-shrink-0" />
                  <span className="text-sm text-white/70">{b}</span>
                </div>
              ))}
            </div>

            {/* CTA buttons */}
            <div className="space-y-3">
              <button
                onClick={handleSubscribe}
                className="w-full py-3.5 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2.5
                  transition-all duration-150 active:scale-[0.98] shadow-lg"
                style={{
                  background: "linear-gradient(135deg, #FF0000, #CC0000)",
                  boxShadow: "0 4px 20px rgba(255,0,0,0.3)",
                }}
              >
                <Youtube className="w-4 h-4" />
                Subscribe &amp; Watch Full Episode
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </button>

              <button
                onClick={handleAlreadySubscribed}
                className="w-full py-3 rounded-xl font-semibold text-sm text-white/50 hover:text-white/80
                  bg-white/5 hover:bg-white/10 border border-white/8 hover:border-white/15
                  transition-all duration-150"
              >
                I'm already subscribed → Watch now
              </button>
            </div>

            {/* Fine print */}
            <p className="text-center text-xs text-white/25 mt-4">
              Free to watch on YouTube · No account required
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Teaser Player ────────────────────────────────────────── */
function TeaserPlayer({ onWatchFull }: { onWatchFull: () => void }) {
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Listen for YouTube player state via postMessage
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        // YT player state: 0 = ended
        if (data?.event === "onStateChange" && data?.info === 0) {
          setEnded(true);
        }
      } catch {}
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Teaser: start at 30s, end at 75s (45 seconds of the best part)
  const embedUrl = `https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?start=30&end=75&autoplay=1&mute=0&controls=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl shadow-black/60
      ring-1 ring-white/10">
      {!started ? (
        /* Poster / click-to-play */
        <div className="absolute inset-0 cursor-pointer group" onClick={() => setStarted(true)}>
          <img
            src={`https://img.youtube.com/vi/${YOUTUBE_VIDEO_ID}/maxresdefault.jpg`}
            alt="CommunityCut Weekly Ep. 2 — The Money Is In The Movement"
            className="w-full h-full object-cover"
          />
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors duration-300" />
          {/* Gradient bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

          {/* TEASER badge */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider
              bg-[oklch(0.74_0.21_218)] text-white shadow-lg">
              Free Teaser
            </span>
            <span className="px-3 py-1.5 rounded-full text-xs font-bold
              bg-black/60 backdrop-blur-sm text-white border border-white/20">
              45 sec preview
            </span>
          </div>

          {/* Play button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-white/15 backdrop-blur-md border border-white/30
              flex items-center justify-center shadow-2xl
              scale-95 group-hover:scale-100 transition-transform duration-300">
              <Play className="w-9 h-9 text-white fill-white ml-1" />
            </div>
          </div>

          {/* Bottom CTA hint */}
          <div className="absolute bottom-5 left-0 right-0 flex justify-center">
            <span className="text-sm text-white/70 font-medium">
              Click to watch the teaser · Full episode on YouTube
            </span>
          </div>
        </div>
      ) : (
        /* YouTube embed */
        <iframe
          ref={iframeRef}
          src={embedUrl}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="CommunityCut Weekly Ep. 2 Teaser"
        />
      )}

      {/* Ended overlay — prompt to watch full */}
      {ended && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm">
          <p className="text-white/70 text-sm mb-4 font-medium">Teaser ended · Watch the full episode free</p>
          <button
            onClick={onWatchFull}
            className="px-6 py-3 rounded-xl font-black text-sm text-white flex items-center gap-2
              transition-all duration-150 active:scale-[0.98] shadow-lg"
            style={{ background: "linear-gradient(135deg, oklch(0.74 0.21 218), oklch(0.56 0.24 290))" }}
          >
            <Play className="w-4 h-4 fill-white" />
            Watch Full Episode
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Episode Card ─────────────────────────────────────────── */
function EpisodeCard({ ep, onWatch }: { ep: typeof EPISODES[0]; onWatch: (ep: typeof EPISODES[0]) => void }) {
  return (
    <div
      className="group flex gap-4 p-4 rounded-2xl bg-white/3 border border-white/6
        hover:border-white/12 hover:bg-white/5 transition-all duration-200 cursor-pointer"
      onClick={() => onWatch(ep)}
    >
      {/* Thumbnail */}
      <div className="relative flex-shrink-0 w-40 aspect-video rounded-xl overflow-hidden">
        <img
          src={ep.thumbnail}
          alt={ep.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
          </div>
        </div>
        <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-xs font-bold bg-black/80 text-white">
          {ep.duration}
        </div>
        {ep.isNew && (
          <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-xs font-black
            bg-[oklch(0.74_0.21_218)] text-white">
            NEW
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Ep. {ep.ep}</span>
          <span className="text-white/20">·</span>
          <span className="text-xs text-white/40">{ep.scheduledAt}</span>
        </div>
        <h3 className="font-black text-white text-base leading-snug mb-1.5 group-hover:text-[oklch(0.74_0.21_218)] transition-colors">
          {ep.title}
        </h3>
        <p className="text-sm text-white/55 leading-relaxed line-clamp-2">{ep.description}</p>
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {ep.tags.slice(0, 3).map((t) => (
            <span key={t} className="px-2 py-0.5 rounded-full text-xs bg-white/6 text-white/50 border border-white/8">
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="flex-shrink-0 self-center">
        <ChevronRight className="w-5 h-5 text-white/25 group-hover:text-white/60 transition-colors" />
      </div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────── */
export default function CommunityCutWeekly() {
  const [gateOpen, setGateOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [selectedEp, setSelectedEp] = useState<typeof EPISODES[0] | null>(null);

  const handleWatchFull = () => {
    setGateOpen(true);
  };

  const handleSubscribed = () => {
    setGateOpen(false);
    setUnlocked(true);
    const url = selectedEp ? `https://youtu.be/${selectedEp.youtubeId}` : FULL_EPISODE_URL;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleEpisodeClick = (ep: typeof EPISODES[0]) => {
    setSelectedEp(ep);
    setGateOpen(true);
  };

  const featuredEp = EPISODES[0]!;

  return (
    <>
      <SEO
        title="CommunityCut Weekly — The Nia Luxe Show | ZTVLIVE"
        description="Watch CommunityCut Weekly on ZTVLIVE. Host Nia Luxe brings real talk on growing your grooming business, building your brand, and owning your future. New episode every Thursday."
        url="/shows/communitycut-weekly"
        image={`https://img.youtube.com/vi/${YOUTUBE_VIDEO_ID}/maxresdefault.jpg`}
      />

      {/* Subscribe Gate Modal */}
      <SubscribeGateModal
        open={gateOpen}
        onClose={() => { setGateOpen(false); setSelectedEp(null); }}
        onSubscribed={handleSubscribed}
        episodeTitle={selectedEp?.title ?? featuredEp.title}
      />

      {/* ── HERO BANNER ──────────────────────────────────── */}
      <section className="relative overflow-hidden py-16 md:py-20"
        style={{ background: "linear-gradient(135deg, oklch(0.07 0.015 264) 0%, oklch(0.05 0.012 264) 100%)" }}>
        {/* Background texture */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, oklch(0.74 0.21 218) 0%, transparent 50%), radial-gradient(circle at 80% 20%, oklch(0.56 0.24 290) 0%, transparent 50%)" }} />

        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-white/35 mb-8 font-medium">
            <Link href="/" className="hover:text-white/70 transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white/50">Shows</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white/80">CommunityCut Weekly</span>
          </nav>

          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Left — show info */}
            <div>
              {/* Show badge */}
              <div className="flex items-center gap-2.5 mb-5">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full
                  bg-[oklch(0.74_0.21_218/0.12)] border border-[oklch(0.74_0.21_218/0.25)]">
                  <Tv2 className="w-3.5 h-3.5 text-[oklch(0.74_0.21_218)]" />
                  <span className="text-xs font-black uppercase tracking-wider text-[oklch(0.74_0.21_218)]">
                    Original Series
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                  bg-red-500/10 border border-red-500/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-wider text-red-400">
                    New Episode Thursday
                  </span>
                </div>
              </div>

              {/* Show title */}
              <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-3 tracking-tight">
                CommunityCut
                <span className="block" style={{ color: "oklch(0.74 0.21 218)" }}>Weekly</span>
              </h1>
              <p className="text-lg text-white/50 font-semibold mb-4">
                Hosted by <span className="text-white/80">Nia Luxe</span>
              </p>

              {/* Description */}
              <p className="text-base text-white/65 leading-relaxed mb-6 max-w-lg">
                The show built for grooming professionals. Every Thursday, Nia Luxe brings you
                real talk on growing your business, building your brand, and owning your future
                in the grooming industry — no fluff, no filler.
              </p>

              {/* Stats row */}
              <div className="flex items-center gap-5 mb-8">
                {[
                  { icon: <Calendar className="w-3.5 h-3.5" />, label: "Every Thursday" },
                  { icon: <Clock className="w-3.5 h-3.5" />, label: "9 AM MST" },
                  { icon: <Users className="w-3.5 h-3.5" />, label: "Free to watch" },
                  { icon: <Star className="w-3.5 h-3.5" />, label: "2 Episodes" },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-white/45 font-medium">
                    <span className="text-[oklch(0.74_0.21_218)]">{s.icon}</span>
                    {s.label}
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleWatchFull}
                  className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl font-black text-sm text-white
                    transition-all duration-150 active:scale-[0.97] shadow-lg"
                  style={{
                    background: "linear-gradient(135deg, oklch(0.74 0.21 218), oklch(0.56 0.24 290))",
                    boxShadow: "0 4px 20px oklch(0.74 0.21 218 / 0.3)",
                  }}
                >
                  <Play className="w-4 h-4 fill-white" />
                  Watch Latest Episode
                </button>
                <a
                  href={YOUTUBE_CHANNEL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-3.5 rounded-xl font-bold text-sm text-white/70
                    bg-white/6 hover:bg-white/10 border border-white/10 hover:border-white/20
                    transition-all duration-150"
                >
                  <Youtube className="w-4 h-4 text-red-400" />
                  Follow on YouTube
                </a>
              </div>
            </div>

            {/* Right — teaser player */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[oklch(0.82_0.18_85)]" />
                  <span className="text-sm font-black text-white/80">Episode 2 — Free Teaser</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-black bg-[oklch(0.74_0.21_218/0.15)] text-[oklch(0.74_0.21_218)] border border-[oklch(0.74_0.21_218/0.3)]">
                    NEW
                  </span>
                </div>
                <span className="text-xs text-white/35">45 sec preview</span>
              </div>
              <TeaserPlayer onWatchFull={handleWatchFull} />
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-white/40">
                  Teaser only · Full episode free on YouTube
                </p>
                <button
                  onClick={handleWatchFull}
                  className="text-xs font-bold text-[oklch(0.74_0.21_218)] hover:text-white transition-colors flex items-center gap-1"
                >
                  Watch full episode <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── EPISODES ─────────────────────────────────────── */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-10">
          {/* Episode list */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-white">All Episodes</h2>
              <span className="text-sm text-white/35">{EPISODES.length} episodes</span>
            </div>
            <div className="space-y-3">
              {EPISODES.map((ep) => (
                <EpisodeCard key={ep.ep} ep={ep} onWatch={handleEpisodeClick} />
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* About the show */}
            <div className="p-6 rounded-2xl bg-white/3 border border-white/8">
              <h3 className="font-black text-white mb-4 flex items-center gap-2">
                <Scissors className="w-4 h-4 text-[oklch(0.74_0.21_218)]" />
                About the Show
              </h3>
              <p className="text-sm text-white/60 leading-relaxed mb-4">
                CommunityCut Weekly is produced by <strong className="text-white/80">ZTVLIVE</strong> in partnership
                with CommunityCut — the grooming platform where barbers, braiders, nail techs,
                and stylists keep 92% of every booking.
              </p>
              <div className="space-y-2.5">
                {[
                  { label: "Network", value: "ZTVLIVE Originals" },
                  { label: "Host", value: "Nia Luxe" },
                  { label: "Drops", value: "Every Thursday 9 AM MST" },
                  { label: "Genre", value: "Business · Grooming · Lifestyle" },
                ].map((r) => (
                  <div key={r.label} className="flex justify-between text-sm">
                    <span className="text-white/40 font-medium">{r.label}</span>
                    <span className="text-white/75 font-semibold text-right">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Subscribe CTA */}
            <div className="p-6 rounded-2xl overflow-hidden relative"
              style={{ background: "linear-gradient(135deg, oklch(0.74 0.21 218 / 0.12), oklch(0.56 0.24 290 / 0.12))" }}>
              <div className="absolute inset-0 border border-[oklch(0.74_0.21_218/0.2)] rounded-2xl pointer-events-none" />
              <div className="relative">
                <Bell className="w-6 h-6 text-[oklch(0.74_0.21_218)] mb-3" />
                <h3 className="font-black text-white mb-2">Never Miss an Episode</h3>
                <p className="text-sm text-white/55 mb-4 leading-relaxed">
                  Subscribe on YouTube and get notified every Thursday when a new episode drops.
                </p>
                <a
                  href={YOUTUBE_SUBSCRIBE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm text-white
                    transition-all duration-150 active:scale-[0.97]"
                  style={{ background: "linear-gradient(135deg, #FF0000, #CC0000)" }}
                >
                  <Youtube className="w-4 h-4" />
                  Subscribe Free on YouTube
                </a>
              </div>
            </div>

            {/* CommunityCut CTA */}
            <div className="p-6 rounded-2xl bg-white/3 border border-white/8">
              <h3 className="font-black text-white mb-2 text-sm">Are you a grooming pro?</h3>
              <p className="text-xs text-white/55 mb-4 leading-relaxed">
                Join CommunityCut free and keep 92% of every booking + 100% of your tips.
              </p>
              <a
                href="https://communitycut.com/join-pro"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-white
                  bg-white/8 hover:bg-white/12 border border-white/10 hover:border-white/20
                  transition-all duration-150"
              >
                Join CommunityCut Free
                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA STRIP ─────────────────────────────── */}
      <section className="border-t border-white/6 py-10"
        style={{ background: "linear-gradient(135deg, oklch(0.07 0.015 264), oklch(0.05 0.012 264))" }}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-white/40 mb-2">Produced by</p>
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="text-lg font-black text-white">ZTVLIVE</span>
            <span className="text-white/20">×</span>
            <span className="text-lg font-black text-white">CommunityCut</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/" className="text-sm text-white/40 hover:text-white/70 transition-colors">
              ← Back to ZTVLIVE
            </Link>
            <Link href="/library" className="text-sm text-white/40 hover:text-white/70 transition-colors">
              Browse Library
            </Link>
            <Link href="/creator" className="text-sm text-white/40 hover:text-white/70 transition-colors">
              Become a Creator
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
