import { useState, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { SEO, liveBroadcastSchema, breadcrumbSchema } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import {
  Volume2, VolumeX, Calendar, X, Users, Tv, ChevronRight,
  Clock, Crown, Share2, Maximize2, Zap, MessageSquare, Play
} from "lucide-react";
import { toast } from "sonner";

const LIVE_YOUTUBE_ID = "EWrX250Zhko"; // Lofi Girl – lofi hip hop radio 📚 beats to relax/study to (LIVE 24/7)

const CHAT_MESSAGES = [
  { user: "TechFan99",    msg: "This stream is 🔥🔥🔥",           color: "oklch(0.74 0.21 218)" },
  { user: "GameMaster",   msg: "Love the content!",               color: "oklch(0.65 0.25 290)" },
  { user: "StreamQueen",  msg: "First time watching, amazing!",   color: "oklch(0.65 0.22 150)" },
  { user: "ZTVFan",       msg: "When's the quiz starting?",       color: "oklch(0.75 0.18 60)" },
  { user: "TechFan99",    msg: "Best streaming platform!",        color: "oklch(0.74 0.21 218)" },
  { user: "NightOwl",     msg: "Watching from London 🇬🇧",        color: "oklch(0.7 0.15 200)" },
  { user: "ProGamer",     msg: "The quality is insane",           color: "oklch(0.65 0.25 290)" },
  { user: "MovieBuff",    msg: "Can't stop watching 😂",          color: "oklch(0.65 0.22 25)" },
  { user: "Creator_Mike", msg: "Thinking of joining as creator!", color: "oklch(0.74 0.21 218)" },
];

function formatTime(ms: number) {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatDate(ms: number) {
  const d = new Date(ms);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export default function LiveTV() {
  const [muted, setMuted] = useState(true);
  const [playerStarted, setPlayerStarted] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [viewerCount, setViewerCount] = useState(1331);
  const [chatMsg, setChatMsg] = useState("");
  const [messages, setMessages] = useState(CHAT_MESSAGES);

  const { data: liveData } = trpc.live.viewerCount.useQuery(undefined, { refetchInterval: 15000 });
  const { data: schedule } = trpc.schedule.list.useQuery({ days: 3 });

  useEffect(() => {
    if (liveData?.count) setViewerCount(liveData.count);
  }, [liveData]);

  useEffect(() => {
    const interval = setInterval(() => {
      setViewerCount((c) => Math.max(800, c + Math.floor((Math.random() - 0.45) * 30)));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMsg.trim()) return;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages(prev => [...prev, { user: "You", msg: chatMsg, color: "oklch(0.74 0.21 218)" }]);
    setChatMsg("");
  };

  const upcomingShow = schedule?.[0];

  // Live broadcast schema — 24/7 stream is always "live" so we use a rolling 24h window
  const broadcastStart = new Date();
  broadcastStart.setHours(0, 0, 0, 0);
  const broadcastEnd = new Date();
  broadcastEnd.setHours(23, 59, 59, 999);

  const schemas = [
    liveBroadcastSchema({
      title: "ZTVLIVE 24/7 Live Stream — Watch Free Now",
      description: "Watch ZTVLIVE's 24/7 live stream free. Tech reviews, gaming, sports, movies, podcasts, news, and music — streaming live right now.",
      thumbnailUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663672855435/oUjtApkrWU2mw4gxUbLk6S/ztvlive-logo-primary-hG5E4F9vWfzRrbzJS8nAVW.png",
      startTime: broadcastStart.getTime(),
      endTime: broadcastEnd.getTime(),
    }),
    breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Live TV", url: "/live" },
    ]),
  ];

  return (
    <>
      <SEO
        title="Live TV — Watch 24/7 Live Stream"
        description="Watch ZTVLIVE's 24/7 live stream. Tech reviews, gaming, sports, movies, podcasts, and more — streaming live right now."
        url="/live"
        type="video.other"
        schema={schemas}
      />

      <div className="min-h-screen bg-background">
        {/* ── HERO PLAYER AREA ─────────────────────── */}
        <div className="relative bg-black">
          <div className="max-w-[1400px] mx-auto">
            <div className="flex flex-col lg:flex-row">

              {/* Main player */}
              <div className="flex-1 min-w-0">
                {/* Player with glow */}
                <div className="relative" style={{ paddingBottom: "56.25%" }}>
                  {playerStarted ? (
                    <iframe
                      className="absolute inset-0 w-full h-full"
                      src={`https://www.youtube.com/embed/${LIVE_YOUTUBE_ID}?autoplay=1&mute=${muted ? 1 : 0}&controls=1&rel=0&modestbranding=1`}
                      title="ZTVLIVE 24/7 Live Stream"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <div
                      className="absolute inset-0 w-full h-full flex flex-col items-center justify-center cursor-pointer group"
                      style={{ background: "linear-gradient(135deg, oklch(0.08 0.02 264) 0%, oklch(0.04 0.01 264) 100%)" }}
                      onClick={() => setPlayerStarted(true)}
                    >
                      <img
                        src={`https://img.youtube.com/vi/${LIVE_YOUTUBE_ID}/maxresdefault.jpg`}
                        alt="ZTVLIVE Live Stream"
                        className="absolute inset-0 w-full h-full object-cover opacity-40"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      <div className="relative z-10 flex flex-col items-center gap-4">
                        <div className="w-20 h-20 rounded-full bg-[oklch(0.74_0.21_218)] flex items-center justify-center shadow-2xl shadow-[oklch(0.74_0.21_218/0.5)] group-hover:scale-110 transition-transform duration-200">
                          <Play className="w-8 h-8 text-black fill-black ml-1" />
                        </div>
                        <div className="text-center">
                          <div className="flex items-center gap-2 justify-center mb-1">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-red-400 text-sm font-black uppercase tracking-widest">Live Now</span>
                          </div>
                          <p className="text-white/70 text-sm">Click to start watching</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Glow border */}
                  <div className="absolute inset-0 pointer-events-none"
                    style={{ boxShadow: "inset 0 0 0 1px oklch(0.74 0.21 218 / 0.2)" }} />

                  {/* Overlay controls */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 bg-red-500 px-2 py-1 rounded text-white text-xs font-black uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          LIVE
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-white/80">
                          <Users className="w-3.5 h-3.5" />
                          <span className="font-semibold">{viewerCount.toLocaleString()}</span>
                          <span className="text-white/50">watching</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setMuted(!muted)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white text-xs font-semibold transition-all border border-white/15 backdrop-blur-sm">
                          {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                          {muted ? "Unmute" : "Mute"}
                        </button>
                        <button onClick={() => setGuideOpen(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white text-xs font-semibold transition-all border border-white/15 backdrop-blur-sm">
                          <Calendar className="w-3.5 h-3.5" />
                          Guide
                        </button>
                        <button onClick={() => toast.info("Link copied to clipboard!")}
                          className="p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all border border-white/15 backdrop-blur-sm">
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Show info bar */}
                <div className="bg-[oklch(0.09_0.012_264)] px-5 py-4 border-b border-white/6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          LIVE NOW
                        </div>
                        <span className="text-xs text-white/35">24/7 Stream</span>
                      </div>
                      <h1 className="text-lg font-black text-white mb-1">ZTVLIVE — 24/7 Live Broadcast</h1>
                      <p className="text-sm text-white/50">
                        Tech reviews, gaming, sports, movies, podcasts, news, and more — streaming live around the clock.
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Link href="/schedule">
                        <Button size="sm" variant="outline" className="border-white/15 text-white/70 hover:text-white hover:bg-white/8 text-xs">
                          <Calendar className="w-3.5 h-3.5 mr-1.5" />
                          Schedule
                        </Button>
                      </Link>
                      <Link href="/subscribe">
                        <Button size="sm" className="bg-gradient-to-r from-[oklch(0.74_0.21_218)] to-[oklch(0.56_0.24_290)] text-white border-0 text-xs font-bold">
                          <Crown className="w-3.5 h-3.5 mr-1.5" />
                          Ad-Free
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Coming up next */}
                {upcomingShow && (
                  <div className="bg-gradient-to-r from-[oklch(0.74_0.21_218/0.08)] to-transparent px-5 py-3 flex items-center gap-3 border-b border-white/5">
                    <div className="w-1 h-8 rounded-full bg-[oklch(0.74_0.21_218)] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-[oklch(0.74_0.21_218)] font-black uppercase tracking-widest mb-0.5">Coming Up Next</p>
                      <p className="text-sm text-white font-semibold truncate">{upcomingShow.title}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-white/40 flex-shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                      {formatTime(upcomingShow.startTime)}
                    </div>
                  </div>
                )}

                {/* Sponsor overlay */}
                <div className="bg-[oklch(0.08_0.01_264)] px-5 py-3 flex items-center justify-between border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-xs text-white/40">Sponsored by</span>
                    <span className="text-xs font-bold text-white/60">TechGear Pro</span>
                  </div>
                  <Link href="/subscribe">
                    <button className="text-xs text-[oklch(0.74_0.21_218)] hover:underline font-semibold">
                      Remove ads with ZTVLIVE+
                    </button>
                  </Link>
                </div>
              </div>

              {/* ── LIVE CHAT SIDEBAR ─────────────────── */}
              <div className="lg:w-80 bg-[oklch(0.09_0.012_264)] border-l border-white/6 flex flex-col"
                style={{ minHeight: "400px", maxHeight: "calc(56.25vw * 0.75 + 120px)" }}>
                <div className="px-4 py-3 border-b border-white/6 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[oklch(0.74_0.21_218)]" />
                  <span className="text-sm font-bold text-white">Live Chat</span>
                  <span className="ml-auto text-xs text-white/30">{viewerCount.toLocaleString()} viewers</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((msg, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
                        style={{ background: `${msg.color}20`, color: msg.color }}>
                        {msg.user.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold" style={{ color: msg.color }}>{msg.user} </span>
                        <span className="text-xs text-white/65 break-words">{msg.msg}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 border-t border-white/6">
                  <form onSubmit={handleSendChat} className="flex gap-2">
                    <input
                      type="text"
                      value={chatMsg}
                      onChange={(e) => setChatMsg(e.target.value)}
                      placeholder="Say something..."
                      className="flex-1 bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-[oklch(0.74_0.21_218/0.4)] transition-colors"
                    />
                    <button type="submit"
                      className="p-2 rounded-lg bg-[oklch(0.74_0.21_218)] text-[oklch(0.06_0.012_264)] hover:opacity-90 transition-opacity">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </form>
                  <p className="text-[10px] text-white/25 mt-2 text-center">
                    Sign in to chat · Community guidelines apply
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── UPCOMING SHOWS ───────────────────────── */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-black text-white">Upcoming Shows</h2>
            <Link href="/schedule" className="flex items-center gap-1 text-sm text-[oklch(0.74_0.21_218)] hover:underline font-semibold">
              Full Schedule <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {schedule?.slice(0, 4).map((item) => (
              <div key={item.id}
                className="glass-card p-4 hover:border-[oklch(0.74_0.21_218/0.3)] transition-all duration-200 group cursor-pointer">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-[oklch(0.74_0.21_218)]">{formatDate(item.startTime)}</span>
                  <span className="text-xs text-white/30">{formatTime(item.startTime)}</span>
                </div>
                <p className="text-sm font-bold text-white mb-1 line-clamp-2 group-hover:text-[oklch(0.74_0.21_218)] transition-colors">{item.title}</p>
                {item.category && (
                  <span className="text-xs text-white/35 capitalize">{item.category}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── ZTVLIVE+ UPSELL ──────────────────────── */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="relative overflow-hidden rounded-2xl p-8 bg-gradient-to-r from-[oklch(0.74_0.21_218/0.12)] via-[oklch(0.56_0.24_290/0.08)] to-[oklch(0.74_0.21_218/0.12)] border border-[oklch(0.74_0.21_218/0.2)]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[oklch(0.74_0.21_218/0.05)] rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[oklch(0.74_0.21_218)] to-[oklch(0.56_0.24_290)] flex items-center justify-center shadow-lg shadow-[oklch(0.74_0.21_218/0.3)]">
                  <Crown className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white mb-1">Upgrade to ZTVLIVE+</h3>
                  <p className="text-sm text-white/55">Watch ad-free, access exclusive content, and support creators directly.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <div className="text-2xl font-black text-white">$4.99</div>
                  <div className="text-xs text-white/40">per month</div>
                </div>
                <Link href="/subscribe">
                  <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[oklch(0.74_0.21_218)] to-[oklch(0.56_0.24_290)] text-white font-bold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-[oklch(0.74_0.21_218/0.3)]">
                    <Zap className="w-4 h-4" />
                    Get ZTVLIVE+
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── PROGRAM GUIDE MODAL ──────────────────── */}
      {guideOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[oklch(0.10_0.015_264)] rounded-2xl border border-white/10 w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl shadow-black/60">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[oklch(0.74_0.21_218)]" />
                Program Guide
              </h2>
              <button onClick={() => setGuideOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-2">
              {schedule?.map((item) => (
                <div key={item.id}
                  className="flex items-center gap-4 p-3.5 rounded-xl bg-white/4 hover:bg-white/8 transition-colors">
                  <div className="text-center shrink-0 w-16">
                    <p className="text-xs font-bold text-[oklch(0.74_0.21_218)]">{formatDate(item.startTime)}</p>
                    <p className="text-xs text-white/45">{formatTime(item.startTime)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                    {item.description && (
                      <p className="text-xs text-white/35 line-clamp-1 mt-0.5">{item.description}</p>
                    )}
                  </div>
                  {item.category && (
                    <span className="text-xs text-white/35 capitalize shrink-0">{item.category}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-white/8">
              <Link href="/schedule" onClick={() => setGuideOpen(false)}>
                <Button className="w-full bg-[oklch(0.74_0.21_218)] text-[oklch(0.06_0.012_264)] font-bold hover:opacity-90">
                  View Full Schedule
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
