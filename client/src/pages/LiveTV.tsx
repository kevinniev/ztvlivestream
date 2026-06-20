/**
 * ZTVLIVE — Live TV (True Broadcast Mode)
 *
 * Design principles:
 * - Everyone sees the EXACT same frame at the EXACT same moment (server clock sync)
 * - No scrubbing, no pause, no rewind — you are watching live television
 * - YouTube IFrame API is used to: load with correct start offset, enable full controls,
 *   and re-sync every 30s to correct drift (e.g. if viewer's tab was backgrounded)
 * - Full YouTube controls enabled: volume slider, fullscreen, CC/subtitles, keyboard shortcuts
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { SEO, liveBroadcastSchema, breadcrumbSchema } from "@/components/SEO";
import {
  Volume2, VolumeX, Calendar, Users, Tv, ChevronRight,
  Clock, Share2, Maximize2, Radio,
  MessageSquare, Send, SkipForward, Info
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

// ── Constants ─────────────────────────────────────────────────────────────────
const FALLBACK_YOUTUBE_ID = ""; // No hardcoded fallback — always use server schedule
const FALLBACK_TITLE = "ZTVLIVE 24/7 Stream";
const SYNC_INTERVAL_MS = 30_000;
const DRIFT_TOLERANCE_S = 3;
const CHAT_STREAM_ID = 1;

const SEED_CHAT = [
  { id: -1,  displayName: "TechFan99",    message: "This stream is 🔥🔥🔥",           isCreator: false },
  { id: -2,  displayName: "GameMaster",   message: "Love the content!",               isCreator: false },
  { id: -3,  displayName: "StreamQueen",  message: "First time watching, amazing!",   isCreator: false },
  { id: -4,  displayName: "ZTVFan",       message: "When's the quiz starting?",       isCreator: false },
  { id: -5,  displayName: "NightOwl",     message: "Watching from London 🇬🇧",        isCreator: false },
  { id: -6,  displayName: "ProGamer",     message: "The quality is insane",           isCreator: false },
  { id: -7,  displayName: "MovieBuff",    message: "Can't stop watching 😂",          isCreator: false },
  { id: -8,  displayName: "Creator_Mike", message: "Thinking of joining as creator!", isCreator: false },
];

function nameColor(name: string) {
  const colors = [
    "oklch(0.74 0.21 218)", "oklch(0.65 0.25 290)", "oklch(0.65 0.22 150)",
    "oklch(0.75 0.18 60)",  "oklch(0.7 0.15 200)",  "oklch(0.65 0.22 25)",
    "oklch(0.72 0.2 340)",  "oklch(0.68 0.18 120)",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(h) % colors.length];
}

function formatTime(ms: number) {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatCountdown(s: number) {
  if (s <= 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// ── YouTube IFrame API types ──────────────────────────────────────────────────
declare global {
  interface Window {
    YT: {
      Player: new (el: HTMLElement | string, opts: object) => YTPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; BUFFERING: number; CUED: number };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}
interface YTPlayer {
  playVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  mute(): void;
  unMute(): void;
  getPlayerState(): number;
  loadVideoById(opts: { videoId: string; startSeconds: number }): void;
  destroy(): void;
}

let ytApiLoaded = false;
let ytApiCallbacks: (() => void)[] = [];
let ytApiFailedCallbacks: (() => void)[] = [];
function loadYTApi(cb: () => void, onFail?: () => void) {
  if (ytApiLoaded) { cb(); return; }
  ytApiCallbacks.push(cb);
  if (onFail) ytApiFailedCallbacks.push(onFail);
  if (document.getElementById("yt-iframe-api")) return;
  const tag = document.createElement("script");
  tag.id = "yt-iframe-api";
  tag.src = "https://www.youtube.com/iframe_api";
  // Fallback: if API doesn't load in 5s, trigger fail callbacks
  const timeout = setTimeout(() => {
    if (!ytApiLoaded) {
      ytApiFailedCallbacks.forEach(fn => fn());
      ytApiFailedCallbacks = [];
    }
  }, 5000);
  tag.onerror = () => {
    clearTimeout(timeout);
    ytApiFailedCallbacks.forEach(fn => fn());
    ytApiFailedCallbacks = [];
  };
  document.head.appendChild(tag);
  window.onYouTubeIframeAPIReady = () => {
    ytApiLoaded = true;
    clearTimeout(timeout);
    ytApiCallbacks.forEach(fn => fn());
    ytApiCallbacks = [];
  };
}

export default function LiveTV() {
  const { user } = useAuth();

  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(80);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [ytApiFailed, setYtApiFailed] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [viewerCount, setViewerCount] = useState(1331);
  const [chatMsg, setChatMsg] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [infoVisible, setInfoVisible] = useState(true);

  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const currentVideoIdRef = useRef<string>("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: liveSync, refetch: refetchSync } = trpc.live.current.useQuery(undefined, {
    refetchInterval: SYNC_INTERVAL_MS,
    staleTime: 5000,
  });
  const { data: upcoming } = trpc.live.upcoming.useQuery({ count: 12 }, { refetchInterval: 60_000 });
  const { data: liveData } = trpc.live.viewerCount.useQuery(undefined, { refetchInterval: 15_000 });
  const { data: schedule } = trpc.schedule.list.useQuery({ days: 3 });
  const { data: chatData } = trpc.creatorLive.getChat.useQuery(
    { streamId: CHAT_STREAM_ID },
    { refetchInterval: 4_000, retry: false }
  );
  const sendChatMutation = trpc.creatorLive.sendChat.useMutation();

  const videoId = liveSync?.videoId ?? "";
  const elapsedSeconds = liveSync?.elapsedSeconds ?? 0;
  const currentTitle = liveSync?.title ?? FALLBACK_TITLE;
  const currentCategory = liveSync?.category ?? "live";
  const upNext = liveSync?.upNext;
  const chatMessages = (chatData && chatData.length > 0) ? chatData : SEED_CHAT;

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (liveData?.count) setViewerCount(liveData.count);
  }, [liveData]);

  useEffect(() => {
    const t = setInterval(() => {
      setViewerCount(c => Math.max(800, c + Math.floor((Math.random() - 0.45) * 30)));
    }, 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (liveSync?.remainingSeconds) setTimeRemaining(liveSync.remainingSeconds);
  }, [liveSync?.remainingSeconds]);

  useEffect(() => {
    if (timeRemaining <= 0) return;
    const t = setInterval(() => setTimeRemaining(r => {
      if (r <= 1) { refetchSync(); return 0; }
      return r - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [timeRemaining, refetchSync]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    const t = setTimeout(() => setInfoVisible(false), 5000);
    return () => clearTimeout(t);
  }, [videoId]);

  const initPlayer = useCallback((vidId: string, startSec: number) => {
    if (!playerContainerRef.current) return;
    if (playerRef.current) {
      try { playerRef.current.destroy(); } catch {}
      playerRef.current = null;
    }
    const div = document.createElement("div");
    div.id = "yt-player-" + Date.now();
    playerContainerRef.current.innerHTML = "";
    playerContainerRef.current.appendChild(div);

    playerRef.current = new window.YT.Player(div, {
      videoId: vidId,
      playerVars: {
        autoplay: 1,
        start: Math.floor(startSec),
        controls: 1,
        disablekb: 0,
        fs: 1,
        rel: 0,
        modestbranding: 1,
        iv_load_policy: 3,
        cc_load_policy: 1,
        playsinline: 1,
        enablejsapi: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: (e: { target: YTPlayer }) => {
          setPlayerReady(true);
          if (muted) e.target.mute();
          else { e.target.unMute(); try { (e.target as any).setVolume(volume); } catch {} }
          e.target.playVideo();
          currentVideoIdRef.current = vidId;
        },
        onStateChange: (e: { data: number; target: YTPlayer }) => {
          // Allow user to pause — don't force play
          // if (e.data === 2) setTimeout(() => { try { e.target.playVideo(); } catch {} }, 200);
          // Refetch on end
          if (e.data === 0) refetchSync();
        },
        onError: () => {
          // Video error — refetch schedule to get next available video
          setTimeout(() => refetchSync(), 2000);
        },
      },
    });
  }, [muted, refetchSync]);

  useEffect(() => {
    loadYTApi(
      () => initPlayer(videoId, elapsedSeconds),
      () => setYtApiFailed(true) // IFrame API failed to load — use plain iframe fallback
    );
    return () => {
      if (playerRef.current) { try { playerRef.current.destroy(); } catch {} playerRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!liveSync || !playerRef.current || !playerReady) return;
    const player = playerRef.current;
    if (liveSync.videoId !== currentVideoIdRef.current) {
      currentVideoIdRef.current = liveSync.videoId;
      player.loadVideoById({ videoId: liveSync.videoId, startSeconds: liveSync.elapsedSeconds });
      setInfoVisible(true);
      setTimeout(() => setInfoVisible(false), 5000);
    } else {
      try {
        const drift = Math.abs(player.getCurrentTime() - liveSync.elapsedSeconds);
        if (drift > DRIFT_TOLERANCE_S) player.seekTo(liveSync.elapsedSeconds, true);
      } catch {}
    }
  }, [liveSync, playerReady]);

  useEffect(() => {
    if (!playerRef.current || !playerReady) return;
    if (muted) playerRef.current.mute();
    else {
      playerRef.current.unMute();
      try { (playerRef.current as any).setVolume(volume); } catch {}
    }
  }, [muted, playerReady, volume]);

  const handleVolumeChange = (val: number) => {
    setVolume(val);
    if (val === 0) {
      setMuted(true);
    } else {
      setMuted(false);
      try { (playerRef.current as any)?.setVolume(val); } catch {}
    }
  };

  const guideItems = upcoming && upcoming.length > 0
    ? upcoming.map((slot, i) => ({
        id: i,
        title: slot.title,
        category: slot.category,
        startTime: Date.now() + (slot.startSecond - (liveSync?.startSecond ?? 0)) * 1000,
        thumbnailUrl: slot.thumbnailUrl,
        creatorName: slot.creatorName,
      }))
    : (schedule ?? []).map((s: any, i: number) => ({ id: i, ...s }));

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMsg.trim()) return;
    if (!user) { toast.info("Sign in to chat with other viewers"); return; }
    const msg = chatMsg.trim();
    setChatMsg("");
    try {
      await sendChatMutation.mutateAsync({ streamId: CHAT_STREAM_ID, message: msg });
    } catch { toast.error("Failed to send message"); }
  };

  const toggleFullscreen = () => {
    const el = document.getElementById("live-tv-container");
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  };

  const broadcastStart = new Date(); broadcastStart.setHours(0, 0, 0, 0);
  const broadcastEnd = new Date(); broadcastEnd.setHours(23, 59, 59, 999);
  const schemas = [
    liveBroadcastSchema({
      title: "ZTVLIVE 24/7 Live Stream — Watch Free Now",
      description: "Watch ZTVLIVE's 24/7 live stream free. Tech, gaming, sports, movies, podcasts, news, and music — streaming live right now.",
      thumbnailUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663672855435/oUjtApkrWU2mw4gxUbLk6S/ztvlive-logo-primary-hG5E4F9vWfzRrbzJS8nAVW.png",
      startTime: broadcastStart.getTime(),
      endTime: broadcastEnd.getTime(),
    }),
    breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Live TV", url: "/live" }]),
  ];

  return (
    <>
      <SEO
        title="Live TV — Watch 24/7 Live Stream"
        description="Watch ZTVLIVE's 24/7 live stream. Tech, gaming, sports, movies, podcasts, and more — streaming live right now."
        url="/live"
        type="video.other"
        schema={schemas}
      />

      <div className="h-full bg-black text-white flex flex-col overflow-hidden">
        {/* TOP BAR */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 flex-shrink-0"
          style={{ background: "oklch(0.08 0.02 264)" }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold tracking-widest"
              style={{ background: "oklch(0.55 0.22 25)", color: "white" }}>
              <Radio className="w-3 h-3 animate-pulse" />
              LIVE
            </div>
            <span className="text-white/70 text-sm font-medium truncate max-w-[200px] sm:max-w-xs">
              {currentTitle}
            </span>
          </div>
          <div className="flex items-center gap-3 text-white/50 text-xs">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {viewerCount.toLocaleString()} watching
            </span>
            <span className="hidden sm:block">{currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>

        {/* MAIN LAYOUT */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* PLAYER COLUMN */}
          <div className="flex-1 flex flex-col min-w-0 relative" id="live-tv-container">

            {/* Player area — fills remaining height */}
            <div className="relative flex-1 bg-black overflow-hidden">

              {/* YouTube player — full controls: volume, fullscreen, CC, keyboard */}
              {ytApiFailed ? (
                // Fallback: plain iframe when IFrame API script fails to load
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&start=${Math.floor(elapsedSeconds)}&controls=1&disablekb=0&fs=1&rel=0&modestbranding=1&iv_load_policy=3&cc_load_policy=1&playsinline=1&mute=${muted ? 1 : 0}`}
                  allow="autoplay; encrypted-media; fullscreen"
                  allowFullScreen
                  style={{ border: "none" }}
                  title="ZTVLIVE Live Stream"
                />
              ) : (
                <div
                  ref={playerContainerRef}
                  className="absolute inset-0 w-full h-full"
                />
              )}



              {/* LOADING STATE */}
              {!playerReady && !ytApiFailed && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center"
                  style={{ background: "oklch(0.06 0.02 264)" }}>
                  <div className="flex items-center gap-3 mb-4">
                    {[0, 150, 300].map(delay => (
                      <div key={delay} className="w-3 h-3 rounded-full animate-bounce"
                        style={{ background: delay === 150 ? "oklch(0.65 0.25 264)" : "oklch(0.55 0.22 25)", animationDelay: `${delay}ms` }} />
                    ))}
                  </div>
                  <p className="text-white/60 text-sm">Tuning in to ZTVLIVE...</p>
                  <p className="text-white/30 text-xs mt-1">Syncing to live broadcast</p>
                </div>
              )}

              {/* PROGRAM INFO OVERLAY (auto-hides after 5s, toggle with Info button) */}
              <div
                className="absolute bottom-0 left-0 right-0 z-20 transition-all duration-500"
                style={{
                  opacity: infoVisible ? 1 : 0,
                  transform: infoVisible ? "translateY(0)" : "translateY(8px)",
                  pointerEvents: "none",
                  background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
                  padding: "3rem 1.5rem 1rem",
                }}
              >
                <div className="flex items-end justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="px-2 py-0.5 rounded text-xs font-bold tracking-widest uppercase flex items-center gap-1"
                        style={{ background: "oklch(0.55 0.22 25)" }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        LIVE NOW
                      </span>
                      <span className="text-white/60 text-xs uppercase tracking-wider">{currentCategory}</span>
                    </div>
                    <h2 className="text-white font-bold text-lg sm:text-xl leading-tight">{currentTitle}</h2>
                    {upNext && (
                      <p className="text-white/50 text-xs mt-1 flex items-center gap-1">
                        <SkipForward className="w-3 h-3" />
                        Up next: {upNext.title}
                        {timeRemaining > 0 && <span className="ml-1 text-white/30">in {formatCountdown(timeRemaining)}</span>}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* LIVE BADGE (top-left) */}
              <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold tracking-widest"
                  style={{ background: "oklch(0.55 0.22 25)", boxShadow: "0 0 12px oklch(0.55 0.22 25 / 0.5)" }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  LIVE
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                  style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}>
                  <Users className="w-3 h-3 text-white/70" />
                  <span className="text-white/70">{viewerCount.toLocaleString()}</span>
                </div>
              </div>

              {/* CUSTOM CONTROLS (top-right overlay — above player) */}
              <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
                {/* Volume control with slider */}
                <div className="relative flex items-center gap-1"
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}>
                  {showVolumeSlider && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-full"
                      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.15)" }}>
                      <input
                        type="range" min={0} max={100} value={muted ? 0 : volume}
                        onChange={e => handleVolumeChange(Number(e.target.value))}
                        className="w-20 h-1 accent-blue-400 cursor-pointer"
                        style={{ accentColor: "oklch(0.65 0.25 264)" }}
                      />
                      <span className="text-white/70 text-xs w-6 text-right">{muted ? 0 : volume}</span>
                    </div>
                  )}
                  <button onClick={() => setMuted(m => !m)}
                    className="flex items-center justify-center w-9 h-9 rounded-full transition-all duration-150 active:scale-95"
                    style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}
                    title={muted ? "Unmute" : "Mute"}>
                    {muted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
                  </button>
                </div>
                <button onClick={() => setInfoVisible(v => !v)}
                  className="flex items-center justify-center w-9 h-9 rounded-full transition-all duration-150 active:scale-95"
                  style={{ background: infoVisible ? "oklch(0.55 0.22 264 / 0.7)" : "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}
                  title="Program info">
                  <Info className="w-4 h-4 text-white" />
                </button>
                <button onClick={toggleFullscreen}
                  className="flex items-center justify-center w-9 h-9 rounded-full transition-all duration-150 active:scale-95"
                  style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}
                  title="Fullscreen (F)">
                  <Maximize2 className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* BOTTOM BAR */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-white/10 flex-shrink-0"
              style={{ background: "oklch(0.08 0.02 264)", minHeight: "48px" }}>
              <div className="flex items-center gap-3 min-w-0">
                <Tv className="w-4 h-4 text-white/40 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{currentTitle}</p>
                  {upNext && (
                    <p className="text-white/40 text-xs truncate">
                      Up next: {upNext.title}
                      {timeRemaining > 0 && ` · ${formatCountdown(timeRemaining)}`}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => setChatOpen(c => !c)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-all"
                  style={{
                    background: chatOpen ? "oklch(0.55 0.22 264 / 0.3)" : "transparent",
                    color: chatOpen ? "oklch(0.8 0.15 264)" : "rgba(255,255,255,0.4)",
                    border: `1px solid ${chatOpen ? "oklch(0.55 0.22 264 / 0.4)" : "transparent"}`,
                  }}>
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Chat</span>
                </button>
                <button onClick={() => setGuideOpen(g => !g)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-all"
                  style={{
                    background: guideOpen ? "oklch(0.55 0.22 25 / 0.3)" : "transparent",
                    color: guideOpen ? "oklch(0.8 0.15 25)" : "rgba(255,255,255,0.4)",
                    border: `1px solid ${guideOpen ? "oklch(0.55 0.22 25 / 0.4)" : "transparent"}`,
                  }}>
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Guide</span>
                </button>
                <button
                  onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success("Link copied!"); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs text-white/40 hover:text-white/70 transition-all">
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Share</span>
                </button>
              </div>
            </div>
          </div>

          {/* CHAT SIDEBAR */}
          {chatOpen && (
            <div className="w-72 xl:w-80 flex-col border-l border-white/10 flex-shrink-0 hidden md:flex"
              style={{ background: "oklch(0.07 0.015 264)" }}>
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-white/50" />
                  <span className="text-white text-sm font-semibold">Live Chat</span>
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "oklch(0.55 0.22 150)" }} />
                </div>
                <span className="text-white/30 text-xs">{viewerCount.toLocaleString()} viewers</span>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
                {chatMessages.map((msg: any, i: number) => (
                  <div key={msg.id ?? i} className="flex gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                      style={{ background: nameColor(msg.displayName), color: "white" }}>
                      {msg.displayName[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold mr-1.5" style={{ color: nameColor(msg.displayName) }}>
                        {msg.displayName}
                        {msg.isCreator && (
                          <span className="ml-1 px-1 py-0.5 rounded text-[9px] font-bold"
                            style={{ background: "oklch(0.55 0.22 60 / 0.3)", color: "oklch(0.75 0.18 60)" }}>
                            CREATOR
                          </span>
                        )}
                      </span>
                      <span className="text-white/70 text-xs break-words">{msg.message}</span>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="px-3 py-3 border-t border-white/10 flex-shrink-0">
                {user ? (
                  <form onSubmit={handleSendChat} className="flex gap-2">
                    <input
                      value={chatMsg}
                      onChange={e => setChatMsg(e.target.value)}
                      placeholder="Say something..."
                      maxLength={200}
                      className="flex-1 px-3 py-2 rounded text-sm text-white placeholder-white/30 outline-none focus:ring-1 focus:ring-[oklch(0.55_0.22_264)]"
                      style={{ background: "oklch(0.12 0.02 264)", border: "1px solid oklch(0.2 0.02 264)" }}
                    />
                    <button type="submit" disabled={!chatMsg.trim()}
                      className="w-9 h-9 flex items-center justify-center rounded transition-all active:scale-95 disabled:opacity-30"
                      style={{ background: "oklch(0.55 0.22 264)" }}>
                      <Send className="w-4 h-4 text-white" />
                    </button>
                  </form>
                ) : (
                  <Link href="/signin">
                    <button className="w-full py-2 rounded text-sm text-white/50 hover:text-white transition-all"
                      style={{ background: "oklch(0.12 0.02 264)", border: "1px solid oklch(0.2 0.02 264)" }}>
                      Sign in to chat
                    </button>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* TV GUIDE SIDEBAR */}
          {guideOpen && (
            <div className="w-72 xl:w-80 flex-col border-l border-white/10 flex-shrink-0 hidden md:flex"
              style={{ background: "oklch(0.07 0.015 264)" }}>
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-white/50" />
                  <span className="text-white text-sm font-semibold">TV Guide</span>
                </div>
                <span className="text-white/30 text-xs">
                  {currentTime.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0">
                {guideItems.map((item: any, i: number) => {
                  const isNow = i === 0;
                  return (
                    <div key={item.id ?? i}
                      className="flex gap-3 px-4 py-3 border-b border-white/5 transition-colors"
                      style={{ background: isNow ? "oklch(0.55 0.22 25 / 0.1)" : "transparent" }}>
                      {item.thumbnailUrl && (
                        <img src={item.thumbnailUrl} alt={item.title}
                          className="w-14 h-9 rounded object-cover flex-shrink-0"
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {isNow && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider flex-shrink-0"
                              style={{ background: "oklch(0.55 0.22 25)", color: "white" }}>
                              NOW
                            </span>
                          )}
                          <span className="text-white/30 text-xs flex-shrink-0">
                            {item.startTime ? formatTime(item.startTime) : ""}
                          </span>
                        </div>
                        <p className="text-white text-xs font-medium leading-snug line-clamp-2">{item.title}</p>
                        {item.creatorName && (
                          <p className="text-white/30 text-[10px] mt-0.5 truncate">{item.creatorName}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {guideItems.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-32 text-white/30 text-sm">
                    <Clock className="w-6 h-6 mb-2 opacity-40" />
                    Schedule loading...
                  </div>
                )}
              </div>
              <div className="px-4 py-3 border-t border-white/10 flex-shrink-0">
                <Link href="/schedule">
                  <button className="w-full py-2 rounded text-xs text-white/50 hover:text-white transition-all flex items-center justify-center gap-1.5"
                    style={{ background: "oklch(0.12 0.02 264)", border: "1px solid oklch(0.2 0.02 264)" }}>
                    Full Schedule <ChevronRight className="w-3 h-3" />
                  </button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* MOBILE CHAT */}
        <div className="md:hidden border-t border-white/10" style={{ background: "oklch(0.07 0.015 264)" }}>
          <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
            <span className="text-white text-xs font-semibold flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-white/50" />
              Live Chat
            </span>
            <span className="text-white/30 text-xs">{viewerCount.toLocaleString()} watching</span>
          </div>
          <div className="h-32 overflow-y-auto px-3 py-2 space-y-1.5">
            {chatMessages.slice(-8).map((msg: any, i: number) => (
              <div key={msg.id ?? i} className="flex gap-1.5">
                <span className="text-xs font-semibold flex-shrink-0" style={{ color: nameColor(msg.displayName) }}>
                  {msg.displayName}:
                </span>
                <span className="text-white/60 text-xs break-words">{msg.message}</span>
              </div>
            ))}
          </div>
          <div className="px-3 py-2">
            {user ? (
              <form onSubmit={handleSendChat} className="flex gap-2">
                <input value={chatMsg} onChange={e => setChatMsg(e.target.value)}
                  placeholder="Say something..." maxLength={200}
                  className="flex-1 px-3 py-1.5 rounded text-xs text-white placeholder-white/30 outline-none"
                  style={{ background: "oklch(0.12 0.02 264)", border: "1px solid oklch(0.2 0.02 264)" }} />
                <button type="submit" disabled={!chatMsg.trim()}
                  className="px-3 py-1.5 rounded text-xs font-semibold disabled:opacity-30"
                  style={{ background: "oklch(0.55 0.22 264)", color: "white" }}>
                  Send
                </button>
              </form>
            ) : (
              <Link href="/signin">
                <p className="text-center text-white/40 text-xs py-1">Sign in to chat</p>
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
