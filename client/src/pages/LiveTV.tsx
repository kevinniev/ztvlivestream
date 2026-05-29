import { useState, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { SEO, liveBroadcastSchema, breadcrumbSchema } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import {
  Volume2,
  VolumeX,
  Calendar,
  X,
  Users,
  Tv,
  ChevronRight,
  Clock,
} from "lucide-react";

const LIVE_YOUTUBE_ID = "997tJ-IF5AI";

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
  const [guideOpen, setGuideOpen] = useState(false);
  const [viewerCount, setViewerCount] = useState(1331);

  const { data: liveData } = trpc.live.viewerCount.useQuery(undefined, { refetchInterval: 15000 });
  const { data: schedule } = trpc.schedule.list.useQuery({ days: 3 });

  useEffect(() => {
    if (liveData?.count) setViewerCount(liveData.count);
  }, [liveData]);

  // Simulated live viewer count fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      setViewerCount((c) => c + Math.floor((Math.random() - 0.5) * 20));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const upcomingShow = schedule?.[0];

  const schemas = [
    liveBroadcastSchema({
      title: "ZTVLIVE 24/7 Live Stream",
      description: "24/7 live streaming of tech, gaming, sports, movies, and more on ZTVLIVE.",
      startTime: Date.now() - 3600000,
      endTime: Date.now() + 3600000,
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
        {/* Player section */}
        <div className="relative bg-black">
          <div className="max-w-[1400px] mx-auto">
            <div className="flex flex-col lg:flex-row">
              {/* Main player */}
              <div className="flex-1">
                {/* 16:9 player */}
                <div className="relative" style={{ paddingBottom: "56.25%" }}>
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${LIVE_YOUTUBE_ID}?autoplay=1&mute=${muted ? 1 : 0}&controls=1&rel=0&modestbranding=1`}
                    title="ZTVLIVE 24/7 Live Stream"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                  {/* Overlay controls */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="live-badge">LIVE</span>
                      <div className="flex items-center gap-1.5 text-sm text-white/80">
                        <Users className="w-4 h-4" />
                        <span>{viewerCount.toLocaleString()} watching</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setMuted(!muted)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-all border border-white/10"
                      >
                        {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                        {muted ? "Unmute" : "Mute"}
                      </button>
                      <button
                        onClick={() => setGuideOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-all border border-white/10"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        Program Guide
                      </button>
                    </div>
                  </div>
                </div>

                {/* Show info */}
                <div className="bg-[oklch(0.09_0.012_264)] px-4 py-4 border-b border-white/5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="live-badge">LIVE NOW</span>
                        <span className="text-xs text-white/40">24/7 Stream</span>
                      </div>
                      <h1 className="text-lg font-bold text-white">ZTVLIVE — 24/7 Live Broadcast</h1>
                      <p className="text-sm text-white/50 mt-1">
                        Tech reviews, gaming, sports, movies, podcasts, news, and more — streaming live around the clock.
                      </p>
                    </div>
                    <div className="shrink-0 flex gap-2">
                      <Link href="/schedule">
                        <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10 text-xs">
                          <Calendar className="w-3.5 h-3.5 mr-1.5" />
                          Schedule
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Coming up next */}
                {upcomingShow && (
                  <div className="bg-[oklch(0.11_0.015_264)] px-4 py-3 flex items-center gap-3 border-b border-white/5">
                    <div className="w-1 h-8 rounded-full bg-[oklch(0.72_0.2_220)]" />
                    <div>
                      <p className="text-xs text-[oklch(0.72_0.2_220)] font-semibold uppercase tracking-wide">Coming Up Next</p>
                      <p className="text-sm text-white font-medium">{upcomingShow.title}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5 text-xs text-white/40">
                      <Clock className="w-3.5 h-3.5" />
                      {formatTime(upcomingShow.startTime)}
                    </div>
                  </div>
                )}
              </div>

              {/* Live chat sidebar */}
              <div className="lg:w-80 bg-[oklch(0.09_0.012_264)] border-l border-white/5 flex flex-col" style={{ minHeight: "400px" }}>
                <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                  <Tv className="w-4 h-4 text-[oklch(0.72_0.2_220)]" />
                  <span className="text-sm font-semibold text-white">Live Chat</span>
                  <span className="ml-auto text-xs text-white/30">{viewerCount.toLocaleString()} viewers</span>
                </div>
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {[
                    { user: "TechFan99", msg: "This stream is 🔥", color: "oklch(0.72 0.2 220)" },
                    { user: "GameMaster", msg: "Love the content!", color: "oklch(0.65 0.25 290)" },
                    { user: "StreamQueen", msg: "First time watching, amazing!", color: "oklch(0.65 0.22 150)" },
                    { user: "ZTVFan", msg: "When's the quiz starting?", color: "oklch(0.75 0.18 60)" },
                    { user: "TechFan99", msg: "Best streaming platform!", color: "oklch(0.72 0.2 220)" },
                    { user: "NightOwl", msg: "Watching from London 🇬🇧", color: "oklch(0.7 0.15 200)" },
                    { user: "ProGamer", msg: "The quality is insane", color: "oklch(0.65 0.25 290)" },
                    { user: "MovieBuff", msg: "Can't stop watching 😂", color: "oklch(0.65 0.22 25)" },
                  ].map((msg, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                        style={{ background: `${msg.color}20`, color: msg.color }}
                      >
                        {msg.user.charAt(0)}
                      </div>
                      <div>
                        <span className="text-xs font-semibold" style={{ color: msg.color }}>{msg.user} </span>
                        <span className="text-xs text-white/70">{msg.msg}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-white/5">
                  <div
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white/30 cursor-pointer hover:bg-white/10 transition-colors text-center"
                    onClick={() => (window.location.href = "/subscribe")}
                  >
                    Sign in or upgrade to ZTVLIVE+ to chat
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule preview */}
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Upcoming Shows</h2>
            <Link href="/schedule" className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1 transition-colors">
              Full Schedule <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {schedule?.slice(0, 4).map((item) => (
              <div key={item.id} className="glass-card rounded-xl p-4 hover:border-white/20 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-[oklch(0.72_0.2_220)]">{formatDate(item.startTime)}</span>
                  <span className="text-xs text-white/30">{formatTime(item.startTime)}</span>
                </div>
                <p className="text-sm font-semibold text-white mb-1 line-clamp-2">{item.title}</p>
                {item.category && (
                  <span className="text-xs text-white/40 capitalize">{item.category}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Program Guide Modal */}
      {guideOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[oklch(0.11_0.015_264)] rounded-2xl border border-white/10 w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[oklch(0.72_0.2_220)]" />
                Program Guide
              </h2>
              <button onClick={() => setGuideOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-3">
              {schedule?.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="text-center shrink-0 w-16">
                    <p className="text-xs font-semibold text-[oklch(0.72_0.2_220)]">{formatDate(item.startTime)}</p>
                    <p className="text-xs text-white/50">{formatTime(item.startTime)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                    {item.description && (
                      <p className="text-xs text-white/40 line-clamp-1 mt-0.5">{item.description}</p>
                    )}
                  </div>
                  {item.category && (
                    <span className="text-xs text-white/30 capitalize shrink-0">{item.category}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-white/10">
              <Link href="/schedule" onClick={() => setGuideOpen(false)}>
                <Button className="w-full bg-[oklch(0.72_0.2_220)] text-[oklch(0.08_0.01_264)] font-semibold hover:opacity-90">
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
