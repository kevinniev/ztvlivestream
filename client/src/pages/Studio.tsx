import { useEffect, useRef, useState, useCallback, useMemo } from "react";
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
import {
  getBackgroundFilter,
  getBackgroundRenderState,
  getExposureFilter,
  type BackgroundAssetState,
  type BackgroundModelState,
} from "@/lib/studioBackground";
import { hasStudioBackgroundAccess, validateCustomBackground } from "@/lib/studioCustomBackground";
import {
  BACKGROUND_CATEGORY_OPTIONS,
  type BackgroundCategory,
  isFavoriteBackground,
  makeCustomBackgroundKey,
  makePresetBackgroundKey,
  matchesBackgroundCategory,
  sortBackgroundsByFavorite,
} from "@/lib/studioBackgroundFavorites";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Camera, CameraOff, Mic, MicOff, Radio, Settings, Sparkles, Lock, ChevronRight,
  Monitor, Layers, Zap, Crown, Check, Plus, Trash2, GripVertical,
  Play, Pause,
  Users, Clock, ChevronUp, ChevronDown, ImagePlus, SlidersHorizontal, Star,
} from "lucide-react";

const VIRTUAL_SETS = [
  { id: "none", name: "No Background", description: "Your real environment", url: null, free: true, emoji: "\u{1F3A5}", category: "office" as const },
  { id: "podcast-booth", name: "Podcast Booth", description: "Professional podcast studio with blue neon lighting", url: "/manus-storage/podcast-booth_0938538b.jpg", free: true, emoji: "\u{1F399}", category: "office" as const },
  { id: "barbershop", name: "Barbershop Set", description: "Classic barbershop with mirrors and styling chairs", url: "/manus-storage/barbershop_15d1b50d.jpg", free: true, emoji: "\u2702\uFE0F", category: "creative" as const },
  { id: "late-night-stage", name: "Late Night Stage", description: "Animated late-night talk show stage with city backdrop", url: "/manus-storage/late-night-stage_7850a33b.jpg", free: false, emoji: "\u{1F303}", category: "abstract" as const },
  { id: "rooftop-city", name: "Rooftop City View", description: "Premium rooftop with golden city skyline at night", url: "/manus-storage/rooftop-city_fea640b6.jpg", free: false, emoji: "\u{1F3D9}", category: "abstract" as const },
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

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function drawCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
  brightness: number,
  contrast: number,
) {
  const sourceWidth = image.naturalWidth || width;
  const sourceHeight = image.naturalHeight || height;
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  context.save();
  context.filter = getBackgroundFilter(brightness, contrast);
  context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
  context.restore();
}

function drawMirroredCameraFrame(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
  brightness: number,
) {
  context.save();
  context.filter = getExposureFilter(brightness);
  context.scale(-1, 1);
  context.drawImage(video, -width, 0, width, height);
  context.restore();
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The image could not be read."));
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("The image could not be read."));
    reader.readAsDataURL(file);
  });
}

export default function Studio() {
  const { user } = useAuth();
  const subscription = user as { role?: string; subscriptionTier?: string; subscriptionStatus?: string } | null;
  const isPro = hasStudioBackgroundAccess(subscription);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const personCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const softMaskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const customBackgroundInputRef = useRef<HTMLInputElement>(null);
  const customBackgroundUrlRef = useRef<string | null>(null);
  const customBackgroundUploadAttemptRef = useRef(0);
  const segmenterRef = useRef<BodyPixNet>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [bgRemoval, setBgRemoval] = useState(false);
  const [selectedSet, setSelectedSet] = useState<SetId>("none");
  const [brightness, setBrightness] = useState(125);
  const [backgroundBrightness, setBackgroundBrightness] = useState(100);
  const [backgroundContrast, setBackgroundContrast] = useState(100);
  const [customBackground, setCustomBackground] = useState<{ id?: number; name: string; url: string; persistent: boolean } | null>(null);
  const [backgroundCategory, setBackgroundCategory] = useState<BackgroundCategory>("all");
  const [loading, setLoading] = useState(false);
  const [modelState, setModelState] = useState<BackgroundModelState>("loading");
  const [assetState, setAssetState] = useState<BackgroundAssetState>("idle");
  const [renderFailure, setRenderFailure] = useState(false);
  const [rendererAttempt, setRendererAttempt] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<StudioTab>("camera");

  const { data: savedCustomBackgrounds, refetch: refetchCustomBackgrounds } = trpc.studio.myCustomBackgrounds.useQuery(undefined, { enabled: Boolean(user && isPro) });
  const { data: savedBackgroundFavorites, refetch: refetchBackgroundFavorites } = trpc.studio.myBackgroundFavorites.useQuery(undefined, { enabled: Boolean(user) });
  const uploadCustomBackground = trpc.studio.uploadCustomBackground.useMutation();
  const setBackgroundFavorite = trpc.studio.setBackgroundFavorite.useMutation({
    onSuccess: () => void refetchBackgroundFavorites(),
    onError: (error) => toast.error(error.message || "Could not update your favorite background."),
  });

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

  // Load the browser-local segmentation model without blocking Studio controls.
  useEffect(() => {
    let cancelled = false;
    segmenterRef.current = null;
    setModelState("loading");
    (async () => {
      try {
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
          setModelState("ready");
        }
      } catch {
        if (!cancelled) setModelState("error");
      }
    })();
    return () => { cancelled = true; };
  }, [rendererAttempt]);

  useEffect(() => {
    const set = VIRTUAL_SETS.find((s) => s.id === selectedSet);
    const backgroundUrl = selectedSet === "custom" ? customBackground?.url : set?.url;
    setRenderFailure(false);
    if (!backgroundUrl) {
      bgImageRef.current = null;
      setAssetState("idle");
      return;
    }
    let cancelled = false;
    setAssetState("loading");
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      if (cancelled) return;
      bgImageRef.current = image;
      setAssetState("ready");
    };
    image.onerror = () => {
      if (cancelled) return;
      bgImageRef.current = null;
      setAssetState("error");
    };
    image.src = backgroundUrl;
    return () => { cancelled = true; };
  }, [customBackground?.url, rendererAttempt, selectedSet]);

  useEffect(() => {
    return () => {
      if (customBackgroundUrlRef.current) URL.revokeObjectURL(customBackgroundUrlRef.current);
    };
  }, []);

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
    setCameraOn(false);
  }, []);

  // The canvas is the only visible preview. It must therefore compose the virtual
  // set itself; a background DOM layer behind a full-size raw-video canvas is hidden.
  useEffect(() => {
    if (!cameraOn) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let frameId = 0;
    let lastSegTime = 0;
    let renderingSegmentation = false;
    let hasCompositeFrame = false;

    const renderFrame = async () => {
      if (!video.videoWidth) { frameId = requestAnimationFrame(renderFrame); return; }
      const W = video.videoWidth, H = video.videoHeight;
      if (canvas.width !== W) canvas.width = W;
      if (canvas.height !== H) canvas.height = H;

      const net = segmenterRef.current;
      const now = performance.now();
      const canComposite = selectedSet !== "none" && bgRemoval && modelState === "ready" && assetState === "ready" && Boolean(net) && Boolean(bgImageRef.current) && !renderFailure;

      if (canComposite && !renderingSegmentation && now - lastSegTime > 85) {
        renderingSegmentation = true;
        lastSegTime = now;
        try {
          const segmentation = await net!.segmentPerson(video, {
            flipHorizontal: false,
            internalResolution: "high",
            segmentationThreshold: 0.6,
          });
          if (segmentation.data.length !== W * H) throw new Error("Unexpected segmentation dimensions");

          ctx.clearRect(0, 0, W, H);
          drawCover(ctx, bgImageRef.current!, W, H, backgroundBrightness, backgroundContrast);
          const personCanvas = personCanvasRef.current ?? document.createElement("canvas");
          const maskCanvas = maskCanvasRef.current ?? document.createElement("canvas");
          const softMaskCanvas = softMaskCanvasRef.current ?? document.createElement("canvas");
          personCanvasRef.current = personCanvas;
          maskCanvasRef.current = maskCanvas;
          softMaskCanvasRef.current = softMaskCanvas;
          personCanvas.width = W; personCanvas.height = H;
          maskCanvas.width = W; maskCanvas.height = H;
          softMaskCanvas.width = W; softMaskCanvas.height = H;
          const pCtx = personCanvas.getContext("2d", { willReadFrequently: true });
          const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true });
          const softMaskCtx = softMaskCanvas.getContext("2d");
          if (!pCtx || !maskCtx || !softMaskCtx) throw new Error("Canvas compositing is unavailable");

          pCtx.clearRect(0, 0, W, H);
          drawMirroredCameraFrame(pCtx, video, W, H, brightness);

          // The visible preview is mirrored, so the segmentation mask must be
          // mirrored too. Keeping both coordinate systems aligned is critical:
          // an unmirrored mask leaves the real room visible beside the presenter.
          const maskFrame = maskCtx.createImageData(W, H);
          for (let y = 0; y < H; y++) {
            const row = y * W;
            for (let x = 0; x < W; x++) {
              const sourceIndex = row + (W - 1 - x);
              maskFrame.data[(row + x) * 4 + 3] = segmentation.data[sourceIndex] ? 255 : 0;
            }
          }
          maskCtx.putImageData(maskFrame, 0, 0);
          softMaskCtx.clearRect(0, 0, W, H);
          softMaskCtx.save();
          softMaskCtx.filter = "blur(2.5px)";
          softMaskCtx.drawImage(maskCanvas, 0, 0);
          softMaskCtx.restore();

          pCtx.save();
          pCtx.globalCompositeOperation = "destination-in";
          pCtx.drawImage(softMaskCanvas, 0, 0);
          pCtx.restore();
          ctx.drawImage(personCanvas, 0, 0);
          hasCompositeFrame = true;
        } catch {
          setRenderFailure(true);
        } finally {
          renderingSegmentation = false;
        }
      } else if (!canComposite || !hasCompositeFrame) {
        ctx.clearRect(0, 0, W, H);
        drawMirroredCameraFrame(ctx, video, W, H, brightness);
      }

      frameId = requestAnimationFrame(renderFrame);
    };

    frameId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(frameId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetState, backgroundBrightness, backgroundContrast, bgRemoval, brightness, cameraOn, modelState, renderFailure, selectedSet]);

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
  const backgroundRenderState = getBackgroundRenderState({
    selectedSet,
    enabled: bgRemoval,
    modelState,
    assetState,
    hasRenderFailure: renderFailure,
  });
  const retryBackgroundRenderer = () => {
    setRenderFailure(false);
    setRendererAttempt((attempt) => attempt + 1);
  };
  const selectedBackgroundName = selectedSet === "custom" ? customBackground?.name ?? "Custom background" : currentSet?.name;
  const selectedBackgroundEmoji = selectedSet === "custom" ? "✦" : currentSet?.emoji;
  const favoriteBackgroundKeys = useMemo(
    () => new Set((savedBackgroundFavorites ?? []).map((favorite) => favorite.backgroundKey)),
    [savedBackgroundFavorites],
  );
  const filteredVirtualSets = useMemo(() => {
    const items = VIRTUAL_SETS.map((set) => ({
      ...set,
      backgroundKey: makePresetBackgroundKey(set.id),
      favorite: isFavoriteBackground(favoriteBackgroundKeys, makePresetBackgroundKey(set.id)),
    })).filter((set) => set.id !== "none" && matchesBackgroundCategory(
      backgroundCategory,
      { kind: "preset", preset: set },
      set.favorite,
    ));
    return sortBackgroundsByFavorite(items);
  }, [backgroundCategory, favoriteBackgroundKeys]);
  const filteredCustomBackgrounds = useMemo(() => {
    const items = (savedCustomBackgrounds ?? []).map((background) => ({
      ...background,
      name: background.fileName,
      backgroundKey: makeCustomBackgroundKey(background.id),
      favorite: isFavoriteBackground(favoriteBackgroundKeys, makeCustomBackgroundKey(background.id)),
    })).filter((background) => matchesBackgroundCategory(
      backgroundCategory,
      { kind: "custom" },
      background.favorite,
    ));
    return sortBackgroundsByFavorite(items);
  }, [backgroundCategory, favoriteBackgroundKeys, savedCustomBackgrounds]);
  const toggleFavorite = (backgroundKey: string, currentlyFavorite: boolean) => {
    if (!user) {
      toast.error("Sign in to save Studio favorites.");
      return;
    }
    setBackgroundFavorite.mutate({ backgroundKey, favorite: !currentlyFavorite });
  };
  const handleCustomBackgroundSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!isPro) {
      toast.error("Custom backgrounds are available with an active ZTVLIVE+ membership.");
      return;
    }
    const validation = validateCustomBackground(file);
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }
    const url = URL.createObjectURL(file);
    if (customBackgroundUrlRef.current) URL.revokeObjectURL(customBackgroundUrlRef.current);
    customBackgroundUrlRef.current = url;
    setCustomBackground({ name: file.name, url, persistent: false });
    setSelectedSet("custom");
    setBgRemoval(true);
    setRenderFailure(false);
    if (!cameraOn) startCamera();
    toast.success("Custom background applied while it saves securely.");
    const uploadAttempt = ++customBackgroundUploadAttemptRef.current;
    void fileToDataUrl(file)
      .then((dataUrl) => uploadCustomBackground.mutate({ fileName: file.name, dataUrl }, {
        onSuccess: (stored) => {
          if (uploadAttempt !== customBackgroundUploadAttemptRef.current) return;
          if (customBackgroundUrlRef.current) {
            URL.revokeObjectURL(customBackgroundUrlRef.current);
            customBackgroundUrlRef.current = null;
          }
          setCustomBackground({ id: stored.id, name: stored.fileName, url: stored.url, persistent: true });
          refetchCustomBackgrounds();
          toast.success("Custom background saved and applied.");
        },
        onError: (error) => toast.error(error.message || "Your preview is active, but the image could not be saved."),
      }))
      .catch((error) => toast.error(error instanceof Error ? error.message : "The image could not be read."));
  };
  const totalRundownSeconds = segments.reduce((sum, s) => sum + s.durationSeconds, 0);
  const addSegment = () => setSegments((p) => [...p, { id: crypto.randomUUID(), name: "New Segment", type: "custom", durationSeconds: 300 }]);
  const removeSegment = (id: string) => setSegments((p) => p.filter((s) => s.id !== id));
  const moveSegment = (idx: number, dir: -1 | 1) => { const a = [...segments], t = idx + dir; if (t < 0 || t >= a.length) return; [a[idx], a[t]] = [a[t], a[idx]]; setSegments(a); };
  const updateSegment = (id: string, u: Partial<Segment>) => setSegments((p) => p.map((s) => s.id === id ? { ...s, ...u } : s));
  const handleSaveRundown = () => { if (!user) { toast.error("Sign in to save rundowns"); return; } saveRundown.mutate({ rundownId: rundownSavedId, title: rundownTitle, segments }); };

  const TABS: { id: StudioTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: "camera", label: "Camera & BG", icon: <Camera className="w-4 h-4" /> },
    { id: "guests", label: "Guest Video", icon: <Users className="w-4 h-4" />, badge: "Setup needed" },
    { id: "rundown", label: "Show Rundown", icon: <Layers className="w-4 h-4" />, badge: "Planner" },
    { id: "multistream", label: "Stream Output", icon: <Zap className="w-4 h-4" />, badge: "Setup needed" },
  ];

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      <SEO title="ZTVLIVE Studio" description="Prepare browser-local virtual backgrounds and production rundowns for ZTVLIVE." url="/studio" />
      <div className="border-b border-white/10 bg-[#0a0a18]/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-white/60 hover:text-white transition-colors text-sm">Back to ZTVLIVE</Link>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" /><span className="font-bold text-sm tracking-wider">ZTVLIVE STUDIO</span></div>
          </div>
          <div className="flex items-center gap-2">
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
                <video ref={videoRef} className="hidden" playsInline muted />
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
                {cameraOn && (<div className="absolute top-3 left-3 flex items-center gap-2"><div className="bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-2 text-xs"><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /><span className="text-green-400 font-medium">PREVIEW</span></div>{selectedSet !== "none" && <div className="max-w-48 truncate bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 text-xs text-white/70">{selectedBackgroundEmoji} {selectedBackgroundName}</div>}</div>)}
                {cameraOn && backgroundRenderState === "active" && (<div className="absolute top-3 right-3 bg-violet-600/85 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5 text-xs"><Sparkles className="w-3 h-3" /> Virtual Set Active</div>)}
                {cameraOn && backgroundRenderState === "preparing" && (<div className="absolute top-3 right-3 bg-blue-600/85 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5 text-xs"><Monitor className="w-3 h-3" /> Preparing selected set…</div>)}
                {cameraOn && backgroundRenderState === "error" && (<div className="absolute top-3 right-3 flex items-center gap-2 rounded-full bg-rose-600/90 px-3 py-1 text-xs"><span>Virtual set unavailable</span><button onClick={retryBackgroundRenderer} className="font-bold underline underline-offset-2">Retry</button></div>)}
              </div>
              <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={cameraOn ? stopCamera : startCamera} className={cameraOn ? "text-white hover:text-red-400" : "text-white/50 hover:text-white"}>{cameraOn ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}<span className="ml-2 text-xs">{cameraOn ? "Camera On" : "Camera Off"}</span></Button>
                  <Button variant="ghost" size="sm" onClick={() => setMicOn(!micOn)} className={micOn ? "text-white hover:text-yellow-400" : "text-white/50 hover:text-white"}>{micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}<span className="ml-2 text-xs">{micOn ? "Mic On" : "Mic Off"}</span></Button>
                </div>
                {cameraOn && <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-200"><Radio className="mr-1 h-3 w-3" />Preview only</Badge>}
              </div>
              {cameraOn && (<div className="bg-white/5 rounded-xl px-4 py-3 border border-white/10"><div className="flex items-center justify-between mb-2"><Label className="text-xs text-white/60">Camera exposure</Label><span className="text-xs text-white/40">{brightness}%</span></div><Slider min={70} max={180} step={5} value={[brightness]} onValueChange={([v]) => setBrightness(v)} className="w-full" /></div>)}
            </div>
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-violet-900/30 to-blue-900/20 border border-violet-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-violet-400" /><span className="font-semibold text-sm">Virtual background</span></div>
                  <Switch checked={bgRemoval} onCheckedChange={(v) => {
                    setBgRemoval(v);
                    setRenderFailure(false);
                    if (!cameraOn) startCamera();
                  }} />
                </div>
                <p className="text-xs text-white/40">
                  {selectedSet === "none" ? "Choose a set to replace your camera background." : backgroundRenderState === "active" ? "Your selected set is applied in this browser preview." : backgroundRenderState === "error" ? "The preview remains local. Retry the browser-local renderer without affecting a stream." : "Preparing your selected set in this browser preview…"}
                </p>
              </div>
              <div className="bg-white/3 border border-white/8 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-sm flex items-center gap-2"><Settings className="w-4 h-4 text-blue-400" />Virtual Sets</h3><Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30 text-xs">{VIRTUAL_SETS.filter((s) => s.free).length} Free</Badge></div>
                <div className="-mx-1 mb-3 flex gap-1 overflow-x-auto px-1 pb-1" aria-label="Background categories">
                  {BACKGROUND_CATEGORY_OPTIONS.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setBackgroundCategory(category.id)}
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${backgroundCategory === category.id ? "border-violet-400/60 bg-violet-500/20 text-violet-100" : "border-white/10 bg-white/[0.03] text-white/55 hover:border-white/25 hover:text-white"}`}
                      aria-pressed={backgroundCategory === category.id}
                    >
                      {category.id === "favorites" && <Star className="mr-1 inline h-3 w-3" fill="currentColor" />}
                      {category.label}
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  {backgroundCategory === "all" && VIRTUAL_SETS.filter((set) => set.id === "none").map((set) => {
                    const isSelected = selectedSet === set.id;
                    return (
                      <button key={set.id} type="button" onClick={() => {
                        setSelectedSet(set.id as SetId);
                        setBgRemoval(false);
                        setRenderFailure(false);
                      }} className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${isSelected ? "border-blue-500/60 bg-blue-500/10" : "border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/5"}`}>
                        <div className="w-14 h-9 rounded bg-white/10 flex items-center justify-center flex-shrink-0 text-lg">{set.emoji}</div>
                        <div className="flex-1 min-w-0"><span className="text-xs font-medium">{set.name}</span><p className="text-white/40 text-xs truncate">{set.description}</p></div>
                        {isSelected && <Check className="h-3.5 w-3.5 flex-shrink-0 text-blue-300" />}
                      </button>
                    );
                  })}
                  {filteredVirtualSets.map((set) => {
                    const locked = !set.free && !isPro; const isSelected = selectedSet === set.id;
                    return (
                      <div key={set.id} className={`flex items-stretch overflow-hidden rounded-lg border transition-all ${isSelected ? "border-blue-500/60 bg-blue-500/10" : locked ? "border-white/5 bg-white/2 opacity-50" : "border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/5"}`}>
                      <button type="button" onClick={() => {
                          if (locked) return;
                          setSelectedSet(set.id as SetId);
                          setBgRemoval(set.id !== "none");
                          setRenderFailure(false);
                          if (set.id !== "none" && !cameraOn) startCamera();
                        }} className={`min-w-0 flex-1 flex items-center gap-3 p-3 text-left ${locked ? "cursor-not-allowed" : ""}`}>
                        {set.url ? <div className="w-14 h-9 rounded overflow-hidden flex-shrink-0 border border-white/10"><img src={set.url} alt={set.name} className="w-full h-full object-cover" /></div> : <div className="w-14 h-9 rounded bg-white/10 flex items-center justify-center flex-shrink-0 text-lg">{set.emoji}</div>}
                        <div className="flex-1 min-w-0"><div className="flex items-center gap-1.5"><span className="text-xs font-medium truncate">{set.name}</span>{!set.free && <Crown className="w-3 h-3 text-yellow-400 flex-shrink-0" />}{locked && <Lock className="w-3 h-3 text-white/30 flex-shrink-0" />}</div><p className="text-white/40 text-xs truncate">{set.description}</p></div>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />}
                      </button>
                      <button type="button" disabled={!user || setBackgroundFavorite.isPending} onClick={() => toggleFavorite(set.backgroundKey, set.favorite)} className={`grid w-10 shrink-0 place-items-center border-l border-white/10 transition-colors ${set.favorite ? "text-amber-300 hover:text-amber-200" : "text-white/40 hover:bg-white/5 hover:text-white"}`} aria-label={`${set.favorite ? "Remove" : "Add"} ${set.name} ${set.favorite ? "from" : "to"} favorites`} title={user ? `${set.favorite ? "Remove from" : "Add to"} favorites` : "Sign in to save favorites"}>
                        <Star className="h-4 w-4" fill={set.favorite ? "currentColor" : "none"} />
                      </button>
                      </div>
                    );
                  })}
                  {filteredVirtualSets.length === 0 && backgroundCategory !== "custom" && <p className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-xs text-white/40">No preset backgrounds match this filter yet.</p>}
                </div>
                <input ref={customBackgroundInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleCustomBackgroundSelection} />
                <button
                  type="button"
                  onClick={() => isPro ? customBackgroundInputRef.current?.click() : toast.error("Custom backgrounds are available with an active ZTVLIVE+ membership.")}
                  className={`mt-3 w-full rounded-xl border p-3 text-left transition-all ${isPro ? "border-violet-400/40 bg-violet-500/10 hover:border-violet-300 hover:bg-violet-500/15" : "border-white/5 bg-white/2 opacity-60"}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-14 place-items-center overflow-hidden rounded border border-white/10 bg-violet-500/15 text-violet-200">
                      {customBackground ? <img src={customBackground.url} alt="Selected custom background preview" className="h-full w-full object-cover" /> : <ImagePlus className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><span className="truncate text-xs font-semibold">{customBackground ? customBackground.name : "Your custom background"}</span>{!isPro && <Lock className="h-3 w-3 text-white/30" />}</div><p className="mt-0.5 text-xs text-white/40">{isPro ? uploadCustomBackground.isPending ? "Saving securely…" : "JPEG, PNG, or WebP · up to 10 MB" : "Available with active ZTVLIVE+"}</p></div>
                    <ChevronRight className="h-4 w-4 text-violet-300" />
                  </div>
                </button>
                {isPro && <p className="mt-2 text-xs leading-5 text-white/35">Your selected image is applied immediately, then saved to your Studio backgrounds. Do not use sensitive personal images.</p>}
                {isPro && filteredCustomBackgrounds.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-medium text-white/55">{backgroundCategory === "favorites" ? "Favorite uploads" : "Your saved backgrounds"}</p>
                    {filteredCustomBackgrounds.map((background) => (
                      <div key={background.id} className={`flex items-stretch overflow-hidden rounded-lg border transition-colors ${selectedSet === "custom" && customBackground?.id === background.id ? "border-violet-400/60 bg-violet-500/10" : "border-white/10 bg-white/3 hover:border-white/20"}`}>
                      <button type="button" onClick={() => {
                        if (customBackgroundUrlRef.current) {
                          URL.revokeObjectURL(customBackgroundUrlRef.current);
                          customBackgroundUrlRef.current = null;
                        }
                        setCustomBackground({ id: background.id, name: background.fileName, url: background.url, persistent: true });
                        setSelectedSet("custom");
                        setBgRemoval(true);
                        setRenderFailure(false);
                        if (!cameraOn) startCamera();
                      }} className="min-w-0 flex-1 p-2 text-left"><div className="flex items-center gap-2"><img src={background.url} alt="" className="h-8 w-12 rounded object-cover" /><span className="min-w-0 flex-1 truncate text-xs text-white/75">{background.fileName}</span>{selectedSet === "custom" && customBackground?.id === background.id && <Check className="h-3.5 w-3.5 text-violet-300" />}</div></button>
                      <button type="button" disabled={setBackgroundFavorite.isPending} onClick={() => toggleFavorite(background.backgroundKey, background.favorite)} className={`grid w-10 shrink-0 place-items-center border-l border-white/10 transition-colors ${background.favorite ? "text-amber-300 hover:text-amber-200" : "text-white/40 hover:bg-white/5 hover:text-white"}`} aria-label={`${background.favorite ? "Remove" : "Add"} ${background.fileName} ${background.favorite ? "from" : "to"} favorites`}>
                        <Star className="h-4 w-4" fill={background.favorite ? "currentColor" : "none"} />
                      </button>
                      </div>
                    ))}
                  </div>
                )}
                {isPro && backgroundCategory === "custom" && filteredCustomBackgrounds.length === 0 && <p className="mt-3 rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-xs text-white/40">Upload a personal Studio background to begin your collection.</p>}
                {!isPro && <Link href="/subscribe"><div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-violet-900/40 to-blue-900/30 border border-violet-500/30 flex items-center justify-between cursor-pointer hover:border-violet-400/50 transition-colors"><div><p className="text-xs font-semibold text-violet-300">Unlock All Sets</p><p className="text-xs text-white/40">ZTVLIVE+ from $4.99/mo</p></div><ChevronRight className="w-4 h-4 text-violet-400" /></div></Link>}
              </div>
              <div className="bg-white/3 border border-white/8 rounded-xl p-4">
                <div className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-cyan-300" /><div><h3 className="text-sm font-semibold">Background exposure</h3><p className="mt-0.5 text-xs text-white/40">Fine-tune the selected set independently from your camera.</p></div></div>
                <div className="mt-4 space-y-4">
                  <div><div className="mb-2 flex items-center justify-between"><Label className="text-xs text-white/60">Background brightness</Label><span className="text-xs text-white/40">{backgroundBrightness}%</span></div><Slider min={50} max={150} step={5} value={[backgroundBrightness]} onValueChange={([value]) => setBackgroundBrightness(value)} disabled={selectedSet === "none"} /></div>
                  <div><div className="mb-2 flex items-center justify-between"><Label className="text-xs text-white/60">Background contrast</Label><span className="text-xs text-white/40">{backgroundContrast}%</span></div><Slider min={50} max={150} step={5} value={[backgroundContrast]} onValueChange={([value]) => setBackgroundContrast(value)} disabled={selectedSet === "none"} /></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "guests" && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-blue-900/30 to-violet-900/20 border border-blue-500/30 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center"><Users className="w-5 h-5 text-blue-400" /></div><div><h2 className="font-bold text-lg">Guest Video</h2><p className="text-white/50 text-sm">A real guest call requires a connected media provider and signaling service.</p></div></div>
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4"><p className="text-sm font-semibold text-amber-100">Guest video is not connected yet.</p><p className="mt-1 text-xs leading-5 text-amber-100/65">This Studio does not currently have a guest-media route, signaling server, or two-person compositor. Invite links are intentionally disabled so guests are not sent to a non-functional page.</p></div>
              </div>
              <div className="bg-white/3 border border-white/8 rounded-xl p-5">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Monitor className="w-4 h-4 text-blue-400" />What is needed for guest video</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[{ step: "1", title: "Media provider", desc: "A connected WebRTC or broadcast service" }, { step: "2", title: "Secure signaling", desc: "A server route that joins host and guest" }, { step: "3", title: "Composite", desc: "A tested two-person scene for the output" }].map((item) => (
                    <div key={item.step} className="bg-white/3 rounded-lg p-3 border border-white/8"><div className="w-6 h-6 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center mb-2"><span className="text-xs text-blue-300 font-bold">{item.step}</span></div><p className="text-xs font-semibold mb-1">{item.title}</p><p className="text-xs text-white/40">{item.desc}</p></div>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-white/3 border border-white/8 rounded-xl p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-white/50" />Connection status</h3>
                <p className="py-4 text-center text-xs text-white/40">No guest media provider is connected.</p>
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
                  <div className="bg-violet-900/20 border border-violet-500/30 rounded-xl p-4 flex items-center justify-between">
                    <div><p className="text-violet-300 text-xs font-semibold uppercase tracking-wider mb-1">Rehearsal timing</p><p className="font-bold">{segments[currentSegmentIdx].name}</p>{segments[currentSegmentIdx].lowerThird && <p className="text-white/50 text-xs mt-1">{segments[currentSegmentIdx].lowerThird}</p>}</div>
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
                    {rundownRunning ? <span className="flex items-center gap-2"><Pause className="w-4 h-4" />Stop rehearsal</span> : <span className="flex items-center gap-2"><Play className="w-4 h-4" />Start rehearsal timer</span>}
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
          <div className="mx-auto max-w-3xl space-y-5 py-4">
            <div><h2 className="font-bold text-xl">Stream Output</h2><p className="mt-1 text-sm text-white/50">Broadcast output needs a connected and tested media relay before stream keys can be accepted.</p></div>
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6"><div className="flex items-start gap-3"><Zap className="mt-0.5 h-6 w-6 flex-none text-amber-200" /><div><h3 className="font-semibold text-amber-100">No broadcast transport is connected</h3><p className="mt-2 text-sm leading-6 text-amber-100/70">ZTVLIVE Studio currently has no RTMP relay, encoder, or provider connection to deliver browser video to YouTube, Twitch, or another destination. Stream-key fields and “Go Live” controls are disabled to prevent a false live state or storing credentials that cannot be used.</p></div></div></div>
            <div className="grid gap-3 sm:grid-cols-3">{[{ title: "1. Connect relay", text: "Provision a secure RTMP or browser-broadcast provider." }, { title: "2. Verify output", text: "Run a private test stream and verify playback health." }, { title: "3. Enable destinations", text: "Only then collect and encrypt destination credentials." }].map((item) => <div key={item.title} className="rounded-xl border border-white/10 bg-white/3 p-4"><p className="text-sm font-semibold">{item.title}</p><p className="mt-2 text-xs leading-5 text-white/45">{item.text}</p></div>)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
