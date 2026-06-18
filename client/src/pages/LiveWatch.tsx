import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Radio, Users, MessageCircle, Send, ExternalLink, ArrowLeft,
  Share2, Heart, Eye, Clock, Play, AlertCircle,
} from "lucide-react";

function formatTime(ms: number) {
  const d = new Date(ms);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(startMs: number) {
  const diffSec = Math.floor((Date.now() - startMs) / 1000);
  const h = Math.floor(diffSec / 3600);
  const m = Math.floor((diffSec % 3600) / 60);
  const s = diffSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function LiveWatch() {
  const { id } = useParams<{ id: string }>();
  const streamId = parseInt(id ?? "0", 10);
  const { isAuthenticated, user } = useAuth();
  const [chatMsg, setChatMsg] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [elapsed, setElapsed] = useState("0:00");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: stream, isLoading, error } = trpc.publicLive.getStream.useQuery(
    { streamId },
    { enabled: !!streamId, refetchInterval: 10000 }
  );

  const { data: chatMessages, refetch: refetchChat } = trpc.creatorLive.getChat.useQuery(
    { streamId },
    { enabled: !!streamId && stream?.status === "live", refetchInterval: 3000 }
  );

  const joinStream = trpc.publicLive.joinStream.useMutation();
  const leaveStream = trpc.publicLive.leaveStream.useMutation();
  const sendChat = trpc.creatorLive.sendChat.useMutation({
    onSuccess: () => { setChatMsg(""); refetchChat(); },
    onError: (e) => toast.error(e.message),
  });

  // Join/leave stream for viewer count
  useEffect(() => {
    if (stream?.status === "live" && !hasJoined) {
      joinStream.mutate({ streamId });
      setHasJoined(true);
    }
    return () => {
      if (hasJoined) leaveStream.mutate({ streamId });
    };
  }, [stream?.status]);

  // Live elapsed timer
  useEffect(() => {
    if (!stream?.startedAt) return;
    const interval = setInterval(() => {
      setElapsed(formatDuration(stream.startedAt!));
    }, 1000);
    return () => clearInterval(interval);
  }, [stream?.startedAt]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full border-2 border-[oklch(0.72_0.2_220)] border-t-transparent animate-spin mx-auto" />
          <p className="text-white/50 text-sm">Loading stream...</p>
        </div>
      </div>
    );
  }

  if (error || !stream) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm">
          <AlertCircle className="w-12 h-12 text-white/20 mx-auto" />
          <h2 className="text-xl font-bold text-white">Stream Not Found</h2>
          <p className="text-white/50 text-sm">This stream doesn't exist or has ended.</p>
          <Link href="/live-tv">
            <Button className="bg-[oklch(0.72_0.2_220)] text-[oklch(0.08_0.01_264)] font-bold">
              Browse Live Streams
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isLive = stream.status === "live";
  const isEnded = stream.status === "ended";

  return (
    <>
      <SEO
        title={`${stream.title} — ${stream.creatorName} | ZTVLIVE`}
        description={stream.description ?? `Watch ${stream.creatorName} live on ZTVLIVE`}
        url={`/live/${streamId}`}
      />

      <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-4">
        {/* Back nav */}
        <div className="flex items-center gap-3">
          <Link href="/live-tv">
            <button className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Live TV
            </button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          {/* Video Player */}
          <div className="space-y-4">
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="aspect-video bg-black relative">
                {isLive && stream.playbackType === "youtube" && stream.playbackId ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${stream.playbackId}?autoplay=1&mute=0`}
                    className="w-full h-full"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                ) : isEnded ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-black">
                    <Clock className="w-12 h-12 text-white/20" />
                    <p className="text-white/50 text-sm font-medium">This stream has ended</p>
                    {stream.playbackId && (
                      <a
                        href={`https://www.youtube.com/watch?v=${stream.playbackId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-[oklch(0.72_0.2_220)] text-sm hover:underline"
                      >
                        <Play className="w-4 h-4" /> Watch Replay on YouTube
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-black">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                      <Radio className="w-8 h-8 text-white/20" />
                    </div>
                    <div className="text-center">
                      <p className="text-white/50 text-sm font-medium">Stream starting soon</p>
                      <p className="text-white/30 text-xs mt-1">The creator is setting up their stream</p>
                    </div>
                  </div>
                )}

                {/* Live badge */}
                {isLive && (
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />LIVE
                    </span>
                    <span className="bg-black/60 text-white/80 text-xs px-2 py-1 rounded-full">{elapsed}</span>
                  </div>
                )}

                {/* Viewer count */}
                {isLive && (
                  <div className="absolute top-3 right-3">
                    <span className="flex items-center gap-1.5 bg-black/60 text-white/80 text-xs px-2.5 py-1 rounded-full">
                      <Eye className="w-3 h-3" /> {(stream.viewerCount ?? 0).toLocaleString()} watching
                    </span>
                  </div>
                )}
              </div>

              {/* Stream info */}
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h1 className="text-lg font-black text-white leading-tight">{stream.title}</h1>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-sm text-white/60 font-medium">{stream.creatorName}</span>
                      <span className="text-white/20">·</span>
                      <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                        isLive ? "bg-red-500/20 text-red-400" :
                        isEnded ? "bg-white/5 text-white/40" :
                        "bg-yellow-500/20 text-yellow-400"
                      }`}>
                        {isLive ? <><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />LIVE</> :
                         isEnded ? "Ended" : "Upcoming"}
                      </span>
                      {stream.category && (
                        <span className="text-xs text-white/30 capitalize px-2 py-0.5 rounded-full bg-white/5">{stream.category}</span>
                      )}
                    </div>
                    {stream.description && (
                      <p className="text-sm text-white/50 mt-3 leading-relaxed">{stream.description}</p>
                    )}
                    {stream.tags && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {stream.tags.split(",").map((tag: string) => (
                          <span key={tag} className="text-xs text-[oklch(0.72_0.2_220)] bg-[oklch(0.72_0.2_220/0.1)] px-2 py-0.5 rounded-full">
                            #{tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        toast.success("Stream link copied!");
                      }}
                      className="text-white/50 hover:text-white border border-white/10"
                    >
                      <Share2 className="w-3.5 h-3.5 mr-1.5" />Share
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Other live streams */}
            <OtherLiveStreams currentId={streamId} />
          </div>

          {/* Chat Panel */}
          <div className="glass-card rounded-2xl overflow-hidden flex flex-col" style={{ height: "600px" }}>
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-[oklch(0.72_0.2_220)]" />
              <h3 className="font-bold text-white text-sm">Live Chat</h3>
              {isLive && (
                <span className="ml-auto flex items-center gap-1 text-xs text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />LIVE
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {!isLive ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-white/30 text-xs text-center">
                    {isEnded ? "This stream has ended" : "Chat will be available when the stream goes live"}
                  </p>
                </div>
              ) : !chatMessages || chatMessages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-white/30 text-xs text-center">No messages yet — say hello! 👋</p>
                </div>
              ) : (
                <>
                  {[...chatMessages].reverse().map((msg: any) => (
                    <div key={msg.id} className={`flex items-start gap-2 ${msg.isCreator ? "bg-[oklch(0.72_0.2_220/0.08)] rounded-lg p-2" : ""}`}>
                      <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white/60">
                        {msg.displayName?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold ${msg.isCreator ? "text-[oklch(0.72_0.2_220)]" : "text-white/70"}`}>
                            {msg.displayName}
                          </span>
                          {msg.isCreator && (
                            <span className="text-[9px] bg-[oklch(0.72_0.2_220/0.2)] text-[oklch(0.72_0.2_220)] px-1 rounded">CREATOR</span>
                          )}
                          <span className="text-[10px] text-white/20">{formatTime(msg.createdAt)}</span>
                        </div>
                        <p className="text-xs text-white/80 mt-0.5">{msg.message}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </>
              )}
            </div>

            <div className="p-3 border-t border-white/10">
              {!isAuthenticated ? (
                <div className="text-center py-2">
                  <p className="text-white/30 text-xs mb-2">Sign in to chat</p>
                  <Link href="/sign-in">
                    <Button size="sm" className="bg-[oklch(0.72_0.2_220)] text-[oklch(0.08_0.01_264)] font-bold text-xs w-full">
                      Sign In to Chat
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={chatMsg}
                    onChange={e => setChatMsg(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && chatMsg.trim() && isLive) {
                        sendChat.mutate({ streamId, message: chatMsg });
                      }
                    }}
                    placeholder={isLive ? "Say something..." : "Stream not live yet"}
                    disabled={!isLive}
                    maxLength={500}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[oklch(0.72_0.2_220/0.5)] disabled:opacity-40"
                  />
                  <Button
                    size="sm"
                    onClick={() => { if (chatMsg.trim()) sendChat.mutate({ streamId, message: chatMsg }); }}
                    disabled={!chatMsg.trim() || !isLive || sendChat.isPending}
                    className="bg-[oklch(0.72_0.2_220)] text-[oklch(0.08_0.01_264)] px-3"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function OtherLiveStreams({ currentId }: { currentId: number }) {
  const { data: liveStreams } = trpc.publicLive.getLiveStreams.useQuery({ limit: 6 });
  const others = liveStreams?.filter((s: any) => s.id !== currentId) ?? [];
  if (others.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-white/10">
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <Radio className="w-4 h-4 text-red-400" />
          Other Live Streams
        </h3>
      </div>
      <div className="divide-y divide-white/5">
        {others.slice(0, 4).map((s: any) => (
          <Link key={s.id} href={`/live/${s.id}`}>
            <div className="flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors cursor-pointer">
              <div className="w-16 h-10 rounded-lg bg-black flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                {s.thumbnailUrl ? (
                  <img src={s.thumbnailUrl} alt={s.title} className="w-full h-full object-cover" />
                ) : (
                  <Radio className="w-5 h-5 text-white/20" />
                )}
                <span className="absolute top-0.5 left-0.5 flex items-center gap-0.5 bg-red-600 text-white text-[8px] font-bold px-1 py-0.5 rounded">
                  <span className="w-1 h-1 rounded-full bg-white animate-pulse" />LIVE
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{s.title}</p>
                <p className="text-[11px] text-white/40">{s.creatorName}</p>
              </div>
              <span className="flex items-center gap-1 text-[10px] text-white/30 flex-shrink-0">
                <Eye className="w-3 h-3" />{(s.viewerCount ?? 0).toLocaleString()}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
