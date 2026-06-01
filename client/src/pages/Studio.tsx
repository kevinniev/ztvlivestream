import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { SEO } from "@/components/SEO";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Camera, CameraOff, Mic, MicOff, Radio, Settings, Sparkles, Lock, ChevronRight,
  Monitor, Layers, Zap, Crown, Copy, Check, Plus, Trash2, GripVertical,
  Play, Pause, Youtube, Twitch, Globe, ToggleLeft, ToggleRight,
  Users, Clock, ChevronUp, ChevronDown,
} from "lucide-react";

const VIRTUAL_SETS = [
  { id: "none", name: "No Background", description: "Your real environment", url: null, free: true, emoji: "\u{1F3A5}" },
  { id: "podcast-booth", name: "Podcast Booth", description: "Professional podcast studio with blue neon lighting", url: "/manus-storage/podcast-booth_0938538b.jpg", free: true, emoji: "\u{1F399}" },
  { id: "barbershop", name: "Barbershop Set", description: "Classic barbershop with mirrors and styling chairs", url: "/manus-storage/barbershop_15d1b50d.jpg", free: true, emoji: "\u2702\uFE0F" },
  { id: "late-night-stage", name: "Late Night Stage", description: "Animated late-night talk show stage with city backdrop", url: "/manus-storage/late-night-stage_7850a33b.jpg", free: false, emoji: "\u{1F303}" },
  { id: "rooftop-city", name: "Rooftop City View", description: "Premium rooftop with golden city skyline at night", url: "/manus-storage/rooftop-city_fea640b6.jpg", free: false, emoji: "\u{1F3D9}" },
];

type SetId = (typeof VIRTUAL_SETS)[number]["id"];
type StudioTab = "camera" | "guests" | "rundown" | "multistream";

type Segment = {
  id: string;
  name: string;
  type: "intro" | "interview" | "break" | "outro" | "custom";
  durationSeconds: number;
  lowerThird?: string;
  notes?: string;
};

type Destination = {
  id?: number;
  platform: "youtube" | "twitch" | "ztvlive" | "custom";
  label: string;
  rtmpUrl: string;
  streamKey: string;
  enabled: boolean;
};

// BodyPix net ref type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BodyPixNet = any;

const SEGMENT_TYPES: { value: Segment["type"]; label: string; color: string; emoji: string }[] = [
  { value: "intro", label: "Intro", color: "bg-blue-600/30 border-blue-500/40 text-blue-300", emoji: "\u{1F3AC}" },
  { value: "interview", label: "Interview", color: "bg-violet-600/30 border-violet-500/40 text-violet-300", emoji: "\u{1F399}" },
  { value: "break", label: "Break", color: "bg-yellow-600/30 border-yellow-500/40 text-yellow-300", emoji: "\u23F8\uFE0F" },
  { value: "outro", label: "Outro", color: "bg-green-600/30 border-green-500/40 text-green-300", emoji: "\u{1F389}" },
  { value: "custom", label: "Custom", color: "bg-white/10 border-white/20 text-white/70", emoji: "\u2728" },
];

const PLATFORM_PRESETS: { platform: Destination["platform"]; label: string; rtmpUrl: string; icon: React.ReactNode; color: string }[] = [
  { platform: "youtube", label: "YouTube Live", rtmpUrl: "rtmp://a.rtmp.youtube.com/live2", icon: <Youtube className="w-4 h-4" />, color: "text-red-400" },
  { platform: "twitch", label: "Twitch", rtmpUrl: "rtmp://live.twitch.tv/app", icon: <Twitch className="w-4 h-4" />, color: "text-purple-400" },
  { platform: "ztvlive", label: "ZTVLIVE", rtmpUrl: "rtmp://live.ztvlivestream.com/live", icon: <Radio className="w-4 h-4" />, color: "text-blue-400" },
  { platform: "custom", label: "Custom RTMP", rtmpUrl: "", icon: <Globe className="w-4 h-4" />, color: "text-white/60" },
];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function Studio() {
  const { user } = useAuth();
  const isPro = !!(user as { subscriptionTier?: string })?.subscriptionTier &&
    (user as { subscriptionTier?: string })?.subscriptionTier !== "free";

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const segmenterRef = useRef<BodyPixNet>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [bgRemoval, setBgRemoval] = useState(false);
  const [selectedSet, setSelectedSet] = useState<SetId>("none");
  // bgMode: none | overlay (instant CSS bg) | ai (MediaPipe removal)
  const [bgMode, setBgMode] = useState<"none" | "overlay" | "ai">("none");
  const [brightness, setBrightness] = useState(100);
  const [loading, setLoading] = useState(false);
  const [mediapipeReady, setMediapipeReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [activeTab, setActiveTab] = useState<StudioTab>("camera");

  // Phase 2
  const [sessionTitle, setSessionTitle] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const createSession = trpc.studio.createSession.useMutation({
    onSuccess: (data) => { setInviteLink(`${window.location.origin}/studio/join?token=${data.inviteToken}`); toast.success("Guest invite link created!"); },
    onError: (e) => toast.error(e.message),
  });
  const { data: mySessions } = trpc.studio.mySessions.useQuery(undefined, { enabled: !!user });

  // Phase 3
  const [rundownTitle, setRundownTitle] = useState("My Show Rundown");
  const [segments, setSegments] = useState<Segment[]>([
    { id: crypto.randomUUID(), name: "Opening Intro", type: "intro", durationSeconds: 120, lowerThird: "Welcome to ZTVLIVE" },
    { id: crypto.randomUUID(), name: "Main Interview", type: "interview", durationSeconds: 1200, lowerThird: "" },
    { id: crypto.randomUUID(), name: "Commercial Break", type: "break", durationSeconds: 120, lowerThird: "" },
    { id: crypto.randomUUID(), name: "Closing Outro", type: "outro", durationSeconds: 60, lowerThird: "Thanks for watching!" },
  ]);
  const [activeSegmentIdx, setActiveSegmentIdx] = useState<number | null>(null);
  const [rundownSavedId, setRundownSavedId] = useState<string | undefined>(undefined);
  const [rundownRunning, setRundownRunning] = useState(false);
  const [currentSegmentIdx, setCurrentSegmentIdx] = useState(0);
  const [segmentElapsed, setSegmentElapsed] = useState(0);
  const rundownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveRundown = trpc.studio.saveRundown.useMutation({
    onSuccess: (data) => { setRundownSavedId(data.rundownId); toast.success("Rundown saved!"); },
    onError: (e) => toast.error(e.message),
  });
  const { data: myRundowns } = trpc.studio.myRundowns.useQuery(undefined, { enabled: !!user });

  // Phase 4
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [showAddDest, setShowAddDest] = useState(false);
  const [editingDest, setEditingDest] = useState<Destination | null>(null);
  const [destForm, setDestForm] = useState<Destination>({ platform: "youtube", label: "YouTube Live", rtmpUrl: "rtmp://a.rtmp.youtube.com/live2", streamKey: "", enabled: true });
  const { data: savedDestinations, refetch: refetchDests } = trpc.studio.myDestinations.useQuery(undefined, { enabled: !!user });
  const saveDestination = trpc.studio.saveDestination.useMutation({
    onSuccess: () => { refetchDests(); setShowAddDest(false); setEditingDest(null); toast.success("Destination saved!"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteDestination = trpc.studio.deleteDestination.useMutation({ onSuccess: () => { refetchDests(); toast.success("Destination removed"); } });
  const toggleDestination = trpc.studio.toggleDestination.useMutation({ onSuccess: () => refetchDests() });

  useEffect(() => {
    if (savedDestinations) {
      setDestinations(savedDestinations.map((d) => ({ id: d.id, platform: d.platform as Destination["platform"], label: d.label, rtmpUrl: d.rtmpUrl, streamKey: d.streamKey, enabled: d.enabled ?? true })));
    }
  }, [savedDestinations]);

  // Load BodyPix model on mount — runs in background, upgrades keying quality when ready
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Dynamic import so it doesn't block initial render
        const tf = await import("@tensorflow/tfjs");
        await tf.ready();
        const bodyPix = await import("@tensorflow-models/body-pix");
        const net = await bodyPix.load({
          architecture: "MobileNetV1",
          outputStride: 16,
          multiplier: 0.75,
          quantBytes: 2,
        });
        if (!cancelled) {
          segmenterRef.current = net;
          setMediapipeReady(true);
        }
      } catch (e) {
        console.warn("BodyPix load failed:", e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const set = VIRTUAL_SETS.find((s) => s.id === selectedSet);
    if (set?.url) { const img = new Image(); img.crossOrigin = "anonymous"; img.src = set.url; img.onload = () => { bgImageRef.current = img; }; }
    else { bgImageRef.current = null; }
  }, [selectedSet]);

  // Auto-upgrade from overlay to AI mode when MediaPipe becomes ready
  useEffect(() => {
    if (mediapipeReady && selectedSet !== "none" && bgMode === "overlay") {
      setBgRemoval(true);
      setBgMode("ai");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediapipeReady]);

  const startCamera = useCallback(async () => {
    setLoading(true); setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: "user" }, audio: micOn });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setCameraOn(true);
    } catch { setCameraError("Camera access denied. Please allow camera permissions."); }
    finally { setLoading(false); }
  }, [micOn]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false); setBgRemoval(false); setIsLive(false); cancelAnimationFrame(animFrameRef.current);
  }, []);

  // BodyPix net is loaded once on mount (see above); no per-activation init needed

  // Premium BodyPix render loop — runs every frame when camera is on
  useEffect(() => {
    if (!cameraOn) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let frameId = 0;
    let lastSegTime = 0;
    // Cached background pixel data to avoid re-drawing bg image every frame
    let cachedBgData: ImageData | null = null;
    let cachedBgId = "";

    const renderFrame = async () => {
      if (!video.videoWidth) { frameId = requestAnimationFrame(renderFrame); return; }
      const W = video.videoWidth, H = video.videoHeight;
      if (canvas.width !== W) canvas.width = W;
      if (canvas.height !== H) canvas.height = H;

      const net = segmenterRef.current;
      const now = performance.now();

      if (bgMode === "ai" && net && bgImageRef.current && (now - lastSegTime > 33)) {
        // ~30fps segmentation — premium quality
        lastSegTime = now;
        try {
          const segmentation = await net.segmentPerson(video, {
            flipHorizontal: false,
            internalResolution: "medium",
            segmentationThreshold: 0.7,
          });

          // Rebuild cached bg if set changed
          if (cachedBgId !== selectedSet || !cachedBgData) {
            const tmpC = document.createElement("canvas"); tmpC.width = W; tmpC.height = H;
            const tmpCtx = tmpC.getContext("2d");
            if (tmpCtx && bgImageRef.current) {
              tmpCtx.drawImage(bgImageRef.current, 0, 0, W, H);
              cachedBgData = tmpCtx.getImageData(0, 0, W, H);
              cachedBgId = selectedSet;
            }
          }

          // Draw video frame to read pixels
          ctx.save();
          ctx.scale(-1, 1);
          ctx.drawImage(video, -W, 0, W, H);
          ctx.restore();
          const frame = ctx.getImageData(0, 0, W, H);
          const fData = frame.data;
          const mask = segmentation.data; // 0 = background, 1 = person
          const bgD = cachedBgData?.data;
          // Declare smoothed outside if(bgD) so shadow pass can access it
          const smoothed = new Float32Array(mask.length);

          if (bgD) {
            // Premium feathered compositing: soft edge blend for broadcast quality
            // Build a smoothed alpha mask by averaging neighbors (3x3 box blur on mask)
            const radius = 2;
            for (let y = 0; y < H; y++) {
              for (let x = 0; x < W; x++) {
                let sum = 0, count = 0;
                for (let dy = -radius; dy <= radius; dy++) {
                  for (let dx = -radius; dx <= radius; dx++) {
                    const ny = y + dy, nx = x + dx;
                    if (ny >= 0 && ny < H && nx >= 0 && nx < W) {
                      sum += mask[ny * W + nx];
                      count++;
                    }
                  }
                }
                smoothed[y * W + x] = sum / count;
              }
            }

            for (let i = 0; i < mask.length; i++) {
              const px = i * 4;
              const personAlpha = smoothed[i]; // 0 = bg, 1 = person, 0-1 = edge blend
              // Blend: person * personAlpha + background * (1 - personAlpha)
              fData[px]     = Math.round(fData[px]     * personAlpha + bgD[px]     * (1 - personAlpha));
              fData[px + 1] = Math.round(fData[px + 1] * personAlpha + bgD[px + 1] * (1 - personAlpha));
              fData[px + 2] = Math.round(fData[px + 2] * personAlpha + bgD[px + 2] * (1 - personAlpha));
              fData[px + 3] = 255;
            }
          }

          // Apply brightness
          if (brightness !== 100) {
            const b = brightness / 100;
            for (let i = 0; i < fData.length; i += 4) {
              fData[i]     = Math.min(255, fData[i]     * b);
              fData[i + 1] = Math.min(255, fData[i + 1] * b);
              fData[i + 2] = Math.min(255, fData[i + 2] * b);
            }
          }

          ctx.putImageData(frame, 0, 0);

          // Subtle drop shadow: draw a dark semi-transparent silhouette offset slightly
          // This adds depth and separates the subject from the background
          const shadowCanvas = document.createElement("canvas");
          shadowCanvas.width = W; shadowCanvas.height = H;
          const sCtx = shadowCanvas.getContext("2d");
          if (sCtx) {
            const shadowData = sCtx.createImageData(W, H);
            const sD = shadowData.data;
            for (let i = 0; i < mask.length; i++) {
              const px = i * 4;
              if (smoothed[i] > 0.5) {
                sD[px] = 0; sD[px+1] = 0; sD[px+2] = 0;
                sD[px+3] = Math.round(smoothed[i] * 60); // 60/255 opacity shadow
              }
            }
            sCtx.putImageData(shadowData, 0, 0);
            ctx.drawImage(shadowCanvas, 3, 6); // offset shadow down-right
          }
        } catch {
          // Fallback: just draw video mirrored
          ctx.save(); ctx.scale(-1, 1); ctx.drawImage(video, -W, 0, W, H); ctx.restore();
        }
      } else {
        // No AI or model not ready — draw plain mirrored video
        ctx.save(); ctx.scale(-1, 1); ctx.drawImage(video, -W, 0, W, H); ctx.restore();
      }

      frameId = requestAnimationFrame(renderFrame);
    };

    frameId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(frameId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOn, bgMode, brightness, selectedSet]);

  useEffect(() => {
    if (rundownRunning) {
      rundownTimerRef.current = setInterval(() => {
        setSegmentElapsed((prev) => {
          const cur = segments[currentSegmentIdx];
          if (!cur) return prev;
          if (prev + 1 >= cur.durationSeconds) { if (currentSegmentIdx < segments.length - 1) { setCurrentSegmentIdx((i) => i + 1); return 0; } else { setRundownRunning(false); return prev; } }
          return prev + 1;
        });
      }, 1000);
    } else { if (rundownTimerRef.current) clearInterval(rundownTimerRef.current); }
    return () => { if (rundownTimerRef.current) clearInterval(rundownTimerRef.current); };
  }, [rundownRunning, currentSegmentIdx, segments]);

  const currentSet = VIRTUAL_SETS.find((s) => s.id === selectedSet);
  const enabledCount = destinations.filter((d) => d.enabled).length;
  const totalRundownSeconds = segments.reduce((sum, s) => sum + s.durationSeconds, 0);
  const handleCopyInvite = () => { if (!inviteLink) return; navigator.clipboard.writeText(inviteLink); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const addSegment = () => setSegments((p) => [...p, { id: crypto.randomUUID(), name: "New Segment", type: "custom", durationSeconds: 300 }]);
  const removeSegment = (id: string) => setSegments((p) => p.filter((s) => s.id !== id));
  const moveSegment = (idx: number, dir: -1 | 1) => { const a = [...segments], t = idx + dir; if (t < 0 || t >= a.length) return; [a[idx], a[t]] = [a[t], a[idx]]; setSegments(a); };
  const updateSegment = (id: string, u: Partial<Segment>) => setSegments((p) => p.map((s) => s.id === id ? { ...s, ...u } : s));
  const handleSaveRundown = () => { if (!user) { toast.error("Sign in to save rundowns"); return; } saveRundown.mutate({ rundownId: rundownSavedId, title: rundownTitle, segments }); };
  const handleEditDestination = (dest: Destination) => { setEditingDest(dest); setDestForm({ ...dest }); setShowAddDest(true); };

  const TABS: { id: StudioTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: "camera", label: "Camera & BG", icon: <Camera className="w-4 h-4" /> },
    { id: "guests", label: "Guest Invite", icon: <Users className="w-4 h-4" />, badge: "Phase 2" },
    { id: "rundown", label: "Show Rundown", icon: <Layers className="w-4 h-4" />, badge: "Phase 3" },
    { id: "multistream", label: "Multi-Stream", icon: <Zap className="w-4 h-4" />, badge: "Phase 4" },
  ];

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      <SEO title="ZTVLIVE Studio" description="Go live with broadcast-quality production from your browser." url="/studio" />
      <div className="border-b border-white/10 bg-[#0a0a18]/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-white/60 hover:text-white transition-colors text-sm">Back to ZTVLIVE</Link>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" /><span className="font-bold text-sm tracking-wider">ZTVLIVE STUDIO</span></div>
          </div>
          <div className="flex items-center gap-2">
            {isLive && <Badge className="bg-red-600 text-white animate-pulse"><Radio className="w-3 h-3 mr-1" /> LIVE</Badge>}
            {!isPro && <Link href="/subscribe"><Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-xs"><Crown className="w-3 h-3 mr-1" /> Upgrade to Pro</Button></Link>}
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id ? "border-blue-500 text-white" : "border-transparent text-white/50 hover:text-white/80"}`}>
              {tab.icon}{tab.label}
              {tab.badge && <span className="text-xs bg-violet-600/30 text-violet-300 border border-violet-500/30 rounded-full px-1.5 py-0.5 leading-none">{tab.badge}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === "camera" && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-black border border-white/10 aspect-video">
                {/* Instant CSS background overlay */}
                {bgMode !== "none" && currentSet?.url && (
                  <div className="absolute inset-0" style={{ backgroundImage: `url(${currentSet.url})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                )}
                {/* Video hidden — canvas handles all rendering including mirroring */}
                <video ref={videoRef} className="hidden" playsInline muted />
                {/* Canvas always visible when camera is on; handles mirroring + keying */}
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" style={{ display: cameraOn ? "block" : "none" }} />
                {!cameraOn && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#0a0a18] to-[#12122a]">
                    <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4"><Camera className="w-8 h-8 text-white/30" /></div>
                    <p className="text-white/50 text-sm mb-6">Camera is off</p>
                    {cameraError && <p className="text-red-400 text-xs text-center max-w-xs mb-4">{cameraError}</p>}
                    <Button onClick={startCamera} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                      {loading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Starting...</span> : <span className="flex items-center gap-2"><Camera className="w-4 h-4" />Start Camera</span>}
                    </Button>
                  </div>
                )}
                {cameraOn && (<div className="absolute top-3 left-3 flex items-center gap-2"><div className="bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-2 text-xs"><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /><span className="text-green-400 font-medium">PREVIEW</span></div>{currentSet && currentSet.id !== "none" && <div className="bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 text-xs text-white/70">{currentSet.emoji} {currentSet.name}</div>}</div>)}
                {bgMode === "ai" && cameraOn && (<div className="absolute top-3 right-3 bg-violet-600/80 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5 text-xs"><Sparkles className="w-3 h-3" /> AI BG Removal Active</div>)}
                {bgMode === "overlay" && cameraOn && selectedSet !== "none" && (<div className="absolute top-3 right-3 bg-blue-600/80 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5 text-xs"><Monitor className="w-3 h-3" /> Virtual Set Active{!mediapipeReady ? " · Loading AI..." : ""}</div>)}
              </div>
              <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={cameraOn ? stopCamera : startCamera} className={cameraOn ? "text-white hover:text-red-400" : "text-white/50 hover:text-white"}>{cameraOn ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}<span className="ml-2 text-xs">{cameraOn ? "Camera On" : "Camera Off"}</span></Button>
                  <Button variant="ghost" size="sm" onClick={() => setMicOn(!micOn)} className={micOn ? "text-white hover:text-yellow-400" : "text-white/50 hover:text-white"}>{micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}<span className="ml-2 text-xs">{micOn ? "Mic On" : "Mic Off"}</span></Button>
                </div>
                {cameraOn && <Button onClick={() => setIsLive(!isLive)} size="sm" className={isLive ? "bg-red-600 hover:bg-red-700 animate-pulse" : "bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700"}><Radio className="w-4 h-4 mr-2" />{isLive ? "Stop Stream" : "Go Live"}</Button>}
              </div>
              {cameraOn && (<div className="bg-white/5 rounded-xl px-4 py-3 border border-white/10"><div className="flex items-center justify-between mb-2"><Label className="text-xs text-white/60">Brightness</Label><span className="text-xs text-white/40">{brightness}%</span></div><Slider min={50} max={150} step={5} value={[brightness]} onValueChange={([v]) => setBrightness(v)} className="w-full" /></div>)}
            </div>
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-violet-900/30 to-blue-900/20 border border-violet-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-violet-400" /><span className="font-semibold text-sm">AI Background Removal</span></div>
                  <Switch checked={bgRemoval} onCheckedChange={(v) => {
                    setBgRemoval(v);
                    if (!cameraOn) startCamera();
                    if (v && mediapipeReady && selectedSet !== "none") setBgMode("ai");
                    else if (!v && selectedSet !== "none") setBgMode("overlay");
                    else if (!v) setBgMode("none");
                  }} />
                </div>
                <p className="text-xs text-white/40">
                  {mediapipeReady ? "AI model ready — full background removal active" : "Loading AI model... Virtual set overlay is active now"}
                </p>
              </div>
              <div className="bg-white/3 border border-white/8 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-sm flex items-center gap-2"><Settings className="w-4 h-4 text-blue-400" />Virtual Sets</h3><Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30 text-xs">{VIRTUAL_SETS.filter((s) => s.free).length} Free</Badge></div>
                <div className="space-y-2">
                  {VIRTUAL_SETS.map((set) => {
                    const locked = !set.free && !isPro; const isSelected = selectedSet === set.id;
                    return (
                      <button key={set.id} onClick={() => {
                          if (locked) return;
                          setSelectedSet(set.id as SetId);
                          if (set.id === "none") { setBgMode("none"); setBgRemoval(false); }
                          else { setBgMode(mediapipeReady && bgRemoval ? "ai" : "overlay"); if (!cameraOn) startCamera(); }
                        }} className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${isSelected ? "border-blue-500/60 bg-blue-500/10" : locked ? "border-white/5 bg-white/2 opacity-50 cursor-not-allowed" : "border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/5"}`}>
                        {set.url ? <div className="w-14 h-9 rounded overflow-hidden flex-shrink-0 border border-white/10"><img src={set.url} alt={set.name} className="w-full h-full object-cover" /></div> : <div className="w-14 h-9 rounded bg-white/10 flex items-center justify-center flex-shrink-0 text-lg">{set.emoji}</div>}
                        <div className="flex-1 min-w-0"><div className="flex items-center gap-1.5"><span className="text-xs font-medium truncate">{set.name}</span>{!set.free && <Crown className="w-3 h-3 text-yellow-400 flex-shrink-0" />}{locked && <Lock className="w-3 h-3 text-white/30 flex-shrink-0" />}</div><p className="text-white/40 text-xs truncate">{set.description}</p></div>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                {!isPro && <Link href="/subscribe"><div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-violet-900/40 to-blue-900/30 border border-violet-500/30 flex items-center justify-between cursor-pointer hover:border-violet-400/50 transition-colors"><div><p className="text-xs font-semibold text-violet-300">Unlock All Sets</p><p className="text-xs text-white/40">ZTVLIVE+ from $4.99/mo</p></div><ChevronRight className="w-4 h-4 text-violet-400" /></div></Link>}
              </div>
            </div>
          </div>
        )}

        {activeTab === "guests" && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-blue-900/30 to-violet-900/20 border border-blue-500/30 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center"><Users className="w-5 h-5 text-blue-400" /></div><div><h2 className="font-bold text-lg">Guest Invite</h2><p className="text-white/50 text-sm">Invite guests to join your studio session via a secure link</p></div></div>
                {!user ? (
                  <div className="text-center py-8"><p className="text-white/50 mb-4">Sign in to create guest invite sessions</p><Link href="/signin"><Button className="bg-blue-600 hover:bg-blue-700">Sign In</Button></Link></div>
                ) : (
                  <div className="space-y-4">
                    <div><Label className="text-xs text-white/60 mb-1.5 block">Session Title</Label><Input value={sessionTitle} onChange={(e) => setSessionTitle(e.target.value)} placeholder="e.g. The Hustle Report Episode 12" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" /></div>
                    <Button onClick={() => createSession.mutate({ title: sessionTitle || undefined, virtualSetId: selectedSet })} disabled={createSession.isPending} className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 w-full">
                      {createSession.isPending ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating...</span> : <span className="flex items-center gap-2"><Plus className="w-4 h-4" />Create Guest Invite Link</span>}
                    </Button>
                    {inviteLink && (
                      <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4">
                        <p className="text-green-400 text-xs font-semibold mb-2 flex items-center gap-1.5"><Check className="w-3 h-3" />Invite link created - valid for 24 hours</p>
                        <div className="flex items-center gap-2"><code className="flex-1 bg-black/30 rounded-lg px-3 py-2 text-xs text-white/70 break-all font-mono">{inviteLink}</code><Button size="sm" variant="outline" onClick={handleCopyInvite} className="flex-shrink-0 border-white/20 text-white/70 hover:text-white">{copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}</Button></div>
                        <p className="text-white/40 text-xs mt-2">Share this link with your guest. They will join in their browser.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="bg-white/3 border border-white/8 rounded-xl p-5">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Monitor className="w-4 h-4 text-blue-400" />How Guest Invites Work</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[{ step: "1", title: "Create Session", desc: "Generate a secure 24-hour invite link" }, { step: "2", title: "Guest Joins", desc: "Guest opens the link in their browser" }, { step: "3", title: "Two-Shot Composite", desc: "Both feeds appear side-by-side" }].map((item) => (
                    <div key={item.step} className="bg-white/3 rounded-lg p-3 border border-white/8"><div className="w-6 h-6 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center mb-2"><span className="text-xs text-blue-300 font-bold">{item.step}</span></div><p className="text-xs font-semibold mb-1">{item.title}</p><p className="text-xs text-white/40">{item.desc}</p></div>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-white/3 border border-white/8 rounded-xl p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-white/50" />Recent Sessions</h3>
                {!mySessions || mySessions.length === 0 ? <p className="text-white/30 text-xs text-center py-4">No sessions yet.</p> : (
                  <div className="space-y-2">{mySessions.map((s) => (<div key={s.sessionId} className="bg-white/3 border border-white/8 rounded-lg p-3"><div className="flex items-center justify-between mb-1"><span className="text-xs font-medium truncate">{s.title}</span><Badge className={`text-xs ${s.status === "live" ? "bg-red-600/30 text-red-300 border-red-500/30" : "bg-white/10 text-white/40 border-white/10"}`}>{s.status}</Badge></div><p className="text-white/30 text-xs">{new Date(s.createdAt).toLocaleDateString()}</p></div>))}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "rundown" && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3"><Input value={rundownTitle} onChange={(e) => setRundownTitle(e.target.value)} className="bg-white/5 border-white/10 text-white font-bold text-lg w-64" /><Badge className="bg-white/10 text-white/60 border-white/10 text-xs"><Clock className="w-3 h-3 mr-1" />{formatDuration(totalRundownSeconds)}</Badge></div>
                <div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={handleSaveRundown} disabled={saveRundown.isPending} className="border-white/20 text-white/70 hover:text-white text-xs">{saveRundown.isPending ? "Saving..." : "Save"}</Button><Button size="sm" onClick={addSegment} className="bg-blue-600 hover:bg-blue-700 text-xs"><Plus className="w-3 h-3 mr-1" />Add Segment</Button></div>
              </div>
              {rundownRunning && segments[currentSegmentIdx] && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 flex items-center justify-between">
                  <div><p className="text-red-400 text-xs font-semibold uppercase tracking-wider mb-1">Now Live</p><p className="font-bold">{segments[currentSegmentIdx].name}</p>{segments[currentSegmentIdx].lowerThird && <p className="text-white/50 text-xs mt-1">{segments[currentSegmentIdx].lowerThird}</p>}</div>
                  <div className="text-right"><p className="text-2xl font-mono font-bold text-red-400">{formatDuration(segments[currentSegmentIdx].durationSeconds - segmentElapsed)}</p><p className="text-white/40 text-xs">remaining</p></div>
                </div>
              )}
              <div className="space-y-2">
                {segments.map((seg, idx) => {
                  const typeInfo = SEGMENT_TYPES.find((t) => t.value === seg.type)!;
                  const isActive = rundownRunning && idx === currentSegmentIdx;
                  const isPast = rundownRunning && idx < currentSegmentIdx;
                  return (
                    <div key={seg.id} className={`rounded-xl border transition-all ${isActive ? "border-red-500/50 bg-red-900/10" : isPast ? "border-white/5 bg-white/2 opacity-40" : activeSegmentIdx === idx ? "border-blue-500/40 bg-blue-900/10" : "border-white/10 bg-white/3 hover:border-white/20"}`}>
                      <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setActiveSegmentIdx(activeSegmentIdx === idx ? null : idx)}>
                        <div className="flex flex-col gap-0.5"><button onClick={(e) => { e.stopPropagation(); moveSegment(idx, -1); }} className="text-white/20 hover:text-white/60"><ChevronUp className="w-3 h-3" /></button><button onClick={(e) => { e.stopPropagation(); moveSegment(idx, 1); }} className="text-white/20 hover:text-white/60"><ChevronDown className="w-3 h-3" /></button></div>
                        <GripVertical className="w-4 h-4 text-white/20 flex-shrink-0" />
                        <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-0.5"><span className="text-xs font-bold text-white/30 w-5 text-right">{idx + 1}</span><span className="font-medium text-sm truncate">{seg.name}</span><span className={`text-xs px-2 py-0.5 rounded-full border ${typeInfo.color}`}>{typeInfo.emoji} {typeInfo.label}</span></div>{seg.lowerThird && <p className="text-white/40 text-xs ml-7 truncate">{seg.lowerThird}</p>}</div>
                        <p className="text-sm font-mono font-semibold flex-shrink-0">{formatDuration(seg.durationSeconds)}</p>
                        <button onClick={(e) => { e.stopPropagation(); removeSegment(seg.id); }} className="text-white/20 hover:text-red-400 ml-1"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      {activeSegmentIdx === idx && (
                        <div className="border-t border-white/10 p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-3"><div><Label className="text-xs text-white/50 mb-1 block">Name</Label><Input value={seg.name} onChange={(e) => updateSegment(seg.id, { name: e.target.value })} className="bg-white/5 border-white/10 text-white text-sm" /></div><div><Label className="text-xs text-white/50 mb-1 block">Duration (sec)</Label><Input type="number" value={seg.durationSeconds} onChange={(e) => updateSegment(seg.id, { durationSeconds: Number(e.target.value) })} className="bg-white/5 border-white/10 text-white text-sm" /></div></div>
                          <div><Label className="text-xs text-white/50 mb-1 block">Type</Label><div className="flex flex-wrap gap-2">{SEGMENT_TYPES.map((t) => (<button key={t.value} onClick={() => updateSegment(seg.id, { type: t.value })} className={`text-xs px-3 py-1.5 rounded-full border transition-all ${seg.type === t.value ? t.color : "border-white/10 text-white/40 hover:border-white/20"}`}>{t.emoji} {t.label}</button>))}</div></div>
                          <div><Label className="text-xs text-white/50 mb-1 block">Lower Third</Label><Input value={seg.lowerThird ?? ""} onChange={(e) => updateSegment(seg.id, { lowerThird: e.target.value })} placeholder="e.g. John Smith, CEO" className="bg-white/5 border-white/10 text-white text-sm placeholder:text-white/20" /></div>
                          <div><Label className="text-xs text-white/50 mb-1 block">Producer Notes</Label><Textarea value={seg.notes ?? ""} onChange={(e) => updateSegment(seg.id, { notes: e.target.value })} placeholder="Internal notes..." className="bg-white/5 border-white/10 text-white text-sm placeholder:text-white/20 resize-none" rows={2} /></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-violet-900/30 to-blue-900/20 border border-violet-500/30 rounded-xl p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Play className="w-4 h-4 text-violet-400" />Rundown Control</h3>
                <div className="space-y-3">
                  <div className="bg-black/20 rounded-lg p-3 text-center"><p className="text-white/40 text-xs mb-1">Total Duration</p><p className="text-2xl font-mono font-bold">{formatDuration(totalRundownSeconds)}</p></div>
                  <Button onClick={() => { if (rundownRunning) { setRundownRunning(false); } else { setCurrentSegmentIdx(0); setSegmentElapsed(0); setRundownRunning(true); } }} className={`w-full ${rundownRunning ? "bg-red-600 hover:bg-red-700" : "bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700"}`}>
                    {rundownRunning ? <span className="flex items-center gap-2"><Pause className="w-4 h-4" />Stop</span> : <span className="flex items-center gap-2"><Play className="w-4 h-4" />Start Rundown</span>}
                  </Button>
                </div>
              </div>
              {myRundowns && myRundowns.length > 0 && (
                <div className="bg-white/3 border border-white/8 rounded-xl p-4">
                  <h3 className="font-semibold text-sm mb-3 text-white/80">Saved Rundowns</h3>
                  <div className="space-y-2">{myRundowns.map((r) => (<button key={r.rundownId} onClick={() => { setRundownTitle(r.title); setSegments(r.segments as Segment[]); setRundownSavedId(r.rundownId); toast.success("Rundown loaded!"); }} className="w-full text-left bg-white/3 border border-white/8 rounded-lg p-3 hover:border-white/20 transition-colors"><p className="text-xs font-medium truncate">{r.title}</p><p className="text-white/30 text-xs">{(r.segments as Segment[]).length} segments</p></button>))}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "multistream" && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div><h2 className="font-bold text-xl">Multi-Stream Output</h2><p className="text-white/50 text-sm">Stream to multiple platforms simultaneously</p></div>
                <Button onClick={() => { setEditingDest(null); setDestForm({ platform: "youtube", label: "YouTube Live", rtmpUrl: "rtmp://a.rtmp.youtube.com/live2", streamKey: "", enabled: true }); setShowAddDest(true); }} className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" />Add Destination</Button>
              </div>
              {destinations.length === 0 ? (
                <div className="border border-dashed border-white/10 rounded-2xl p-12 text-center"><Zap className="w-10 h-10 text-white/20 mx-auto mb-3" /><p className="text-white/40 mb-2">No stream destinations yet</p><Button onClick={() => setShowAddDest(true)} variant="outline" className="border-white/20 text-white/60 hover:text-white"><Plus className="w-4 h-4 mr-2" />Add First Destination</Button></div>
              ) : (
                <div className="space-y-3">
                  {destinations.map((dest) => {
                    const preset = PLATFORM_PRESETS.find((p) => p.platform === dest.platform);
                    return (
                      <div key={dest.id ?? dest.label} className={`rounded-xl border p-4 transition-all ${dest.enabled ? "border-white/15 bg-white/3" : "border-white/5 bg-white/1 opacity-50"}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3"><div className={`w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center ${preset?.color}`}>{preset?.icon}</div><div><p className="font-semibold text-sm">{dest.label}</p><p className="text-white/40 text-xs font-mono truncate max-w-xs">{dest.rtmpUrl}</p></div></div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => dest.id && toggleDestination.mutate({ id: dest.id, enabled: !dest.enabled })} className={`transition-colors ${dest.enabled ? "text-green-400 hover:text-green-300" : "text-white/30 hover:text-white/60"}`}>{dest.enabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}</button>
                            <Button size="sm" variant="ghost" onClick={() => handleEditDestination(dest)} className="text-white/40 hover:text-white text-xs">Edit</Button>
                            <Button size="sm" variant="ghost" onClick={() => dest.id && deleteDestination.mutate({ id: dest.id })} className="text-white/30 hover:text-red-400"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </div>
                        {dest.streamKey && <div className="mt-3 bg-black/20 rounded-lg px-3 py-2 flex items-center justify-between"><span className="text-xs text-white/40 font-mono">Stream Key: {"*".repeat(Math.min(dest.streamKey.length, 20))}</span><Badge className={`text-xs ${dest.enabled ? "bg-green-600/20 text-green-300 border-green-500/30" : "bg-white/5 text-white/30 border-white/10"}`}>{dest.enabled ? "Active" : "Disabled"}</Badge></div>}
                      </div>
                    );
                  })}
                </div>
              )}
              {showAddDest && (
                <div className="bg-white/3 border border-blue-500/30 rounded-2xl p-5 space-y-4">
                  <h3 className="font-semibold text-sm">{editingDest ? "Edit Destination" : "Add Stream Destination"}</h3>
                  <div><Label className="text-xs text-white/50 mb-2 block">Platform</Label><div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{PLATFORM_PRESETS.map((p) => (<button key={p.platform} onClick={() => setDestForm((f) => ({ ...f, platform: p.platform, label: p.label, rtmpUrl: p.rtmpUrl }))} className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all ${destForm.platform === p.platform ? "border-blue-500/60 bg-blue-500/10" : "border-white/10 bg-white/3 hover:border-white/20"}`}><span className={p.color}>{p.icon}</span><span className="text-xs font-medium">{p.label}</span></button>))}</div></div>
                  <div className="grid grid-cols-2 gap-3"><div><Label className="text-xs text-white/50 mb-1 block">Label</Label><Input value={destForm.label} onChange={(e) => setDestForm((f) => ({ ...f, label: e.target.value }))} className="bg-white/5 border-white/10 text-white text-sm" /></div><div><Label className="text-xs text-white/50 mb-1 block">RTMP URL</Label><Input value={destForm.rtmpUrl} onChange={(e) => setDestForm((f) => ({ ...f, rtmpUrl: e.target.value }))} className="bg-white/5 border-white/10 text-white text-sm font-mono" /></div></div>
                  <div><Label className="text-xs text-white/50 mb-1 block">Stream Key</Label><Input type="password" value={destForm.streamKey} onChange={(e) => setDestForm((f) => ({ ...f, streamKey: e.target.value }))} placeholder="Your stream key from the platform dashboard" className="bg-white/5 border-white/10 text-white text-sm placeholder:text-white/20" /></div>
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Switch checked={destForm.enabled} onCheckedChange={(v) => setDestForm((f) => ({ ...f, enabled: v }))} /><Label className="text-xs text-white/60">Enable this destination</Label></div><div className="flex items-center gap-2"><Button variant="ghost" size="sm" onClick={() => { setShowAddDest(false); setEditingDest(null); }} className="text-white/40 hover:text-white text-xs">Cancel</Button><Button size="sm" onClick={() => { if (editingDest?.id) { saveDestination.mutate({ ...destForm, id: editingDest.id }); } else { saveDestination.mutate(destForm); } }} disabled={saveDestination.isPending || !destForm.streamKey} className="bg-blue-600 hover:bg-blue-700 text-xs">{saveDestination.isPending ? "Saving..." : editingDest ? "Update" : "Add"}</Button></div></div>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-blue-900/30 to-violet-900/20 border border-blue-500/30 rounded-xl p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Radio className="w-4 h-4 text-blue-400" />Go Live to All</h3>
                <div className="space-y-3">
                  <div className="bg-black/20 rounded-lg p-3"><div className="flex items-center justify-between mb-1"><span className="text-xs text-white/50">Active Destinations</span><span className="text-lg font-bold text-blue-400">{enabledCount}</span></div><div className="flex items-center justify-between"><span className="text-xs text-white/50">Total Configured</span><span className="text-sm font-semibold">{destinations.length}</span></div></div>
                  <Button onClick={() => { if (!cameraOn) { toast.error("Turn on your camera first"); return; } if (enabledCount === 0) { toast.error("Enable at least one destination first"); return; } setIsLive(!isLive); toast.success(isLive ? "Stream stopped" : `Going live to ${enabledCount} destination${enabledCount > 1 ? "s" : ""}!`); }} className={`w-full ${isLive ? "bg-red-600 hover:bg-red-700 animate-pulse" : "bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700"}`} disabled={enabledCount === 0 && !isLive}>
                    <Radio className="w-4 h-4 mr-2" />{isLive ? "Stop All Streams" : `Go Live to ${enabledCount} Platform${enabledCount !== 1 ? "s" : ""}`}
                  </Button>
                  {enabledCount === 0 && <p className="text-white/30 text-xs text-center">Add and enable destinations to go live</p>}
                </div>
              </div>
              <div className="bg-white/3 border border-white/8 rounded-xl p-4">
                <h3 className="font-semibold text-sm mb-3 text-white/80">Multi-Stream Tips</h3>
                <div className="space-y-2">{["Get your stream key from each platform's Live Dashboard", "YouTube: Creator Studio > Go Live > Stream", "Twitch: Dashboard > Settings > Stream", "ZTVLIVE: Creator Dashboard > Stream Settings"].map((tip, i) => (<div key={i} className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0 mt-1.5" /><p className="text-xs text-white/40">{tip}</p></div>))}</div>
              </div>
            </div>
          </div>
        )}
      </div>
      <canvas ref={bgCanvasRef} className="hidden" />
    </div>
  );
}
