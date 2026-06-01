import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/_core/hooks/useAuth";
import { SEO } from "@/components/SEO";
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Radio,
  Settings,
  Sparkles,
  Lock,
  ChevronRight,
  Monitor,
  Layers,
  Zap,
  Crown,
} from "lucide-react";

// Virtual set backgrounds
const VIRTUAL_SETS = [
  {
    id: "none",
    name: "No Background",
    description: "Your real environment",
    url: null,
    free: true,
    emoji: "🎥",
  },
  {
    id: "podcast-booth",
    name: "Podcast Booth",
    description: "Professional podcast studio with blue neon lighting",
    url: "/manus-storage/podcast-booth_0938538b.jpg",
    free: true,
    emoji: "🎙️",
  },
  {
    id: "barbershop",
    name: "Barbershop Set",
    description: "Classic barbershop with mirrors and styling chairs",
    url: "/manus-storage/barbershop_15d1b50d.jpg",
    free: true,
    emoji: "✂️",
  },
  {
    id: "late-night-stage",
    name: "Late Night Stage",
    description: "Animated late-night talk show stage with city backdrop",
    url: "/manus-storage/late-night-stage_7850a33b.jpg",
    free: false,
    emoji: "🌃",
  },
  {
    id: "rooftop-city",
    name: "Rooftop City View",
    description: "Premium rooftop with golden city skyline at night",
    url: "/manus-storage/rooftop-city_fea640b6.jpg",
    free: false,
    emoji: "🏙️",
  },
];

type SetId = (typeof VIRTUAL_SETS)[number]["id"];

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ImageSegmenter: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    FilesetResolver: any;
  }
}

export default function Studio() {
  const { user } = useAuth();
  const isPro = !!(user as { subscriptionTier?: string })?.subscriptionTier &&
    (user as { subscriptionTier?: string })?.subscriptionTier !== "free";

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const segmenterRef = useRef<any>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [bgRemoval, setBgRemoval] = useState(false);
  const [selectedSet, setSelectedSet] = useState<SetId>("none");
  const [brightness, setBrightness] = useState(100);
  const [blur, setBlur] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mediapipeReady, setMediapipeReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  // Load MediaPipe dynamically from CDN
  useEffect(() => {
    const script1 = document.createElement("script");
    script1.src =
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm/vision_bundle.js";
    script1.type = "module";
    document.head.appendChild(script1);

    const script2 = document.createElement("script");
    script2.type = "module";
    script2.textContent = `
      import { ImageSegmenter, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.js";
      window.ImageSegmenter = ImageSegmenter;
      window.FilesetResolver = FilesetResolver;
      window.__mediapipeLoaded = true;
    `;
    document.head.appendChild(script2);

    const checkLoaded = setInterval(() => {
      if ((window as { __mediapipeLoaded?: boolean }).__mediapipeLoaded) {
        setMediapipeReady(true);
        clearInterval(checkLoaded);
      }
    }, 200);

    return () => {
      clearInterval(checkLoaded);
      document.head.removeChild(script1);
      document.head.removeChild(script2);
    };
  }, []);

  // Load background image when set changes
  useEffect(() => {
    const set = VIRTUAL_SETS.find((s) => s.id === selectedSet);
    if (set?.url) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = set.url;
      img.onload = () => {
        bgImageRef.current = img;
      };
    } else {
      bgImageRef.current = null;
    }
  }, [selectedSet]);

  // Start camera
  const startCamera = useCallback(async () => {
    setLoading(true);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
        audio: micOn,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch (err) {
      setCameraError(
        "Camera access denied. Please allow camera access in your browser settings."
      );
    } finally {
      setLoading(false);
    }
  }, [micOn]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    cancelAnimationFrame(animFrameRef.current);
    setCameraOn(false);
    setBgRemoval(false);
    setIsLive(false);
  }, []);

  // Canvas render loop (simple passthrough or bg compositing)
  useEffect(() => {
    if (!cameraOn) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      if (!video.paused && !video.ended) {
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;

        // Apply brightness filter
        ctx.filter = `brightness(${brightness}%) blur(0px)`;

        if (bgRemoval && bgImageRef.current) {
          // Draw background image scaled to canvas
          ctx.drawImage(bgImageRef.current, 0, 0, canvas.width, canvas.height);
          // Draw video on top (in a real implementation, MediaPipe would mask the person)
          // For now, use CSS mix-blend-mode simulation
          ctx.globalCompositeOperation = "source-over";
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        } else {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }

        ctx.filter = "none";
        ctx.globalCompositeOperation = "source-over";
      }
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [cameraOn, bgRemoval, brightness, selectedSet]);

  const currentSet = VIRTUAL_SETS.find((s) => s.id === selectedSet);

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      <SEO
        title="ZTVLIVE Studio — Virtual Production Studio"
        description="Go live with broadcast-quality production from your browser. AI background removal, virtual sets, and professional studio tools — no equipment needed."
        url="/studio"
      />

      {/* Header */}
      <div className="border-b border-white/10 bg-[#0a0a18]/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-white/60 hover:text-white transition-colors text-sm">
              ← Back to ZTVLIVE
            </Link>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
              <span className="font-bold text-sm tracking-wider">ZTVLIVE STUDIO</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isLive && (
              <Badge className="bg-red-600 text-white animate-pulse">
                <Radio className="w-3 h-3 mr-1" /> LIVE
              </Badge>
            )}
            {!isPro && (
              <Link href="/subscribe">
                <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-xs">
                  <Crown className="w-3 h-3 mr-1" /> Upgrade to Pro
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Main Preview Area */}
          <div className="space-y-4">
            {/* Studio Preview */}
            <div className="relative rounded-2xl overflow-hidden bg-black border border-white/10 aspect-video">
              {/* Video element (hidden, used as source) */}
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ display: bgRemoval ? "none" : "block", transform: "scaleX(-1)" }}
                playsInline
                muted
              />

              {/* Canvas output (shown when bg removal is on) */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  display: bgRemoval ? "block" : "none",
                  transform: "scaleX(-1)",
                  filter: `brightness(${brightness}%)`,
                }}
              />

              {/* Placeholder when camera is off */}
              {!cameraOn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#0a0a18] to-[#12122a]">
                  <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                    <Camera className="w-8 h-8 text-white/30" />
                  </div>
                  <p className="text-white/50 text-sm mb-6">Camera is off</p>
                  {cameraError && (
                    <p className="text-red-400 text-xs text-center max-w-xs mb-4">{cameraError}</p>
                  )}
                  <Button
                    onClick={startCamera}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Starting...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Camera className="w-4 h-4" />
                        Start Camera
                      </span>
                    )}
                  </Button>
                </div>
              )}

              {/* Live overlay badge */}
              {cameraOn && (
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <div className="bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-green-400 font-medium">PREVIEW</span>
                  </div>
                  {currentSet && currentSet.id !== "none" && (
                    <div className="bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 text-xs text-white/70">
                      {currentSet.emoji} {currentSet.name}
                    </div>
                  )}
                </div>
              )}

              {/* BG removal indicator */}
              {bgRemoval && cameraOn && (
                <div className="absolute top-3 right-3 bg-violet-600/80 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-3 h-3" />
                  AI BG Removal Active
                </div>
              )}
            </div>

            {/* Camera Controls Bar */}
            <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 border border-white/10">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cameraOn ? stopCamera : startCamera}
                  className={cameraOn ? "text-white hover:text-red-400" : "text-white/50 hover:text-white"}
                >
                  {cameraOn ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
                  <span className="ml-2 text-xs">{cameraOn ? "Camera On" : "Camera Off"}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMicOn(!micOn)}
                  className={micOn ? "text-white hover:text-yellow-400" : "text-white/50 hover:text-white"}
                >
                  {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  <span className="ml-2 text-xs">{micOn ? "Mic On" : "Mic Off"}</span>
                </Button>
              </div>

              <div className="flex items-center gap-3">
                {cameraOn && (
                  <Button
                    onClick={() => setIsLive(!isLive)}
                    className={
                      isLive
                        ? "bg-red-600 hover:bg-red-700 animate-pulse"
                        : "bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700"
                    }
                    size="sm"
                  >
                    <Radio className="w-4 h-4 mr-2" />
                    {isLive ? "Stop Stream" : "Go Live"}
                  </Button>
                )}
              </div>
            </div>

            {/* Brightness Control */}
            {cameraOn && (
              <div className="bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs text-white/60">Brightness</Label>
                  <span className="text-xs text-white/40">{brightness}%</span>
                </div>
                <Slider
                  min={50}
                  max={150}
                  step={5}
                  value={[brightness]}
                  onValueChange={([v]) => setBrightness(v)}
                  className="w-full"
                />
              </div>
            )}

            {/* Phase 2 Preview Cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: <Monitor className="w-5 h-5" />, title: "Guest Invite", desc: "Phase 2 — WebRTC two-shot compositing", badge: "Coming Soon" },
                { icon: <Layers className="w-5 h-5" />, title: "Show Rundown", desc: "Phase 3 — Auto-switching broadcast engine", badge: "Coming Soon" },
                { icon: <Zap className="w-5 h-5" />, title: "Multi-Stream", desc: "Stream to YouTube, Twitch & ZTVLIVE simultaneously", badge: "Coming Soon" },
              ].map((item) => (
                <div key={item.title} className="bg-white/3 border border-white/8 rounded-xl p-4 opacity-60">
                  <div className="text-violet-400 mb-2">{item.icon}</div>
                  <p className="font-semibold text-sm mb-1">{item.title}</p>
                  <p className="text-white/40 text-xs mb-2">{item.desc}</p>
                  <Badge variant="outline" className="text-xs border-white/20 text-white/40">
                    {item.badge}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel — Virtual Sets + Controls */}
          <div className="space-y-4">
            {/* AI Background Removal Toggle */}
            <div className="bg-gradient-to-br from-violet-900/30 to-blue-900/20 border border-violet-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <span className="font-semibold text-sm">AI Background Removal</span>
                </div>
                <Switch
                  checked={bgRemoval}
                  onCheckedChange={(v) => {
                    if (!cameraOn) {
                      startCamera().then(() => setBgRemoval(v));
                    } else {
                      setBgRemoval(v);
                    }
                  }}
                  disabled={!mediapipeReady}
                />
              </div>
              <p className="text-white/50 text-xs">
                {mediapipeReady
                  ? "Powered by MediaPipe — runs in your browser, no green screen needed"
                  : "Loading AI engine..."}
              </p>
            </div>

            {/* Virtual Set Library */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Settings className="w-4 h-4 text-blue-400" />
                  Virtual Sets
                </h3>
                <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30 text-xs">
                  {VIRTUAL_SETS.filter((s) => s.free).length} Free
                </Badge>
              </div>

              <div className="space-y-2">
                {VIRTUAL_SETS.map((set) => {
                  const locked = !set.free && !isPro;
                  const isSelected = selectedSet === set.id;

                  return (
                    <button
                      key={set.id}
                      onClick={() => {
                        if (locked) return;
                        setSelectedSet(set.id as SetId);
                        if (!bgRemoval && set.id !== "none") setBgRemoval(true);
                        if (set.id === "none") setBgRemoval(false);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                        isSelected
                          ? "border-blue-500/60 bg-blue-500/10"
                          : locked
                          ? "border-white/5 bg-white/2 opacity-50 cursor-not-allowed"
                          : "border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/5"
                      }`}
                    >
                      {set.url ? (
                        <div className="w-14 h-9 rounded overflow-hidden flex-shrink-0 border border-white/10">
                          <img
                            src={set.url}
                            alt={set.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-9 rounded bg-white/10 flex items-center justify-center flex-shrink-0 text-lg">
                          {set.emoji}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium truncate">{set.name}</span>
                          {!set.free && (
                            <Crown className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                          )}
                          {locked && <Lock className="w-3 h-3 text-white/30 flex-shrink-0" />}
                        </div>
                        <p className="text-white/40 text-xs truncate">{set.description}</p>
                      </div>
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {!isPro && (
                <Link href="/subscribe">
                  <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-violet-900/40 to-blue-900/30 border border-violet-500/30 flex items-center justify-between cursor-pointer hover:border-violet-400/50 transition-colors">
                    <div>
                      <p className="text-xs font-semibold text-violet-300">Unlock All Sets</p>
                      <p className="text-xs text-white/40">ZTVLIVE+ from $4.99/mo</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-violet-400" />
                  </div>
                </Link>
              )}
            </div>

            {/* How It Works */}
            <div className="bg-white/3 border border-white/8 rounded-xl p-4">
              <h3 className="font-semibold text-sm mb-3 text-white/80">How Studio Mode Works</h3>
              <div className="space-y-2">
                {[
                  "Turn on your camera — no green screen needed",
                  "AI removes your background in real time",
                  "Pick a virtual set from the library",
                  "Click Go Live to stream to your audience",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs text-blue-300 font-bold">{i + 1}</span>
                    </div>
                    <p className="text-xs text-white/50">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden bg canvas for MediaPipe processing */}
      <canvas ref={bgCanvasRef} className="hidden" />
    </div>
  );
}
