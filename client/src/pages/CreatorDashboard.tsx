import React, { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  BarChart3, DollarSign, Upload, Calendar, Play, Clock, CheckCircle,
  XCircle, AlertCircle, ArrowRight, Users, Youtube, Plus, Trash2,
  Video, Eye, ExternalLink, Loader2, Download, FileDown, Radio,
  Copy, Key, Wifi, WifiOff, MessageCircle, Send, ChevronRight,
} from "lucide-react";

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_CONFIG = {
  pending: { icon: Clock, color: "oklch(0.75 0.18 60)", label: "Pending Review" },
  approved: { icon: CheckCircle, color: "oklch(0.65 0.22 150)", label: "Approved" },
  rejected: { icon: XCircle, color: "oklch(0.6 0.22 25)", label: "Rejected" },
  live: { icon: Play, color: "oklch(0.72 0.2 220)", label: "Live" },
};

type ImportRow = {
  youtubeId: string;
  title: string;
  description: string;
  category: string;
  tags: string;
  duration: string;
};

function extractYouTubeId(input: string): string {
  // Handle full URLs like https://youtube.com/watch?v=ABC or https://youtu.be/ABC
  const match = input.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : input.trim();
}

type ImportMode = "channel" | "manual";
type ChannelStep = "input" | "preview" | "importing" | "done";

type FetchedVideo = {
  youtubeId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  alreadyImported: boolean;
};

type ImportSummary = {
  imported: number;
  skipped: number;
  total: number;
  importedTitles: string[];
  skippedTitles: string[];
  channelName: string;
};

function ChannelImportSection({ isCreator }: { isCreator: boolean }) {
  const [channelUrl, setChannelUrl] = useState("");
  const [channelCategory, setChannelCategory] = useState("other");
  const [channelMaxVideos, setChannelMaxVideos] = useState("200");
  const [step, setStep] = useState<ChannelStep>("input");
  const [fetchedVideos, setFetchedVideos] = useState<FetchedVideo[]>([]);
  const [channelInfo, setChannelInfo] = useState<{ channelName: string; channelThumbnail: string; channelVideoCount: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  const fetchMutation = trpc.creator.fetchChannelVideos.useMutation({
    onSuccess: (res) => {
      setFetchedVideos(res.videos);
      setChannelInfo({ channelName: res.channelName, channelThumbnail: res.channelThumbnail, channelVideoCount: res.channelVideoCount });
      // Pre-select all non-imported videos
      const newSelected = new Set(res.videos.filter(v => !v.alreadyImported).map(v => v.youtubeId));
      setSelectedIds(newSelected);
      setStep("preview");
      setProgress(100);
      setProgressLabel(`Found ${res.videos.length} videos`);
    },
    onError: (err) => {
      toast.error(err.message);
      setStep("input");
      setProgress(0);
    },
  });

  const importMutation = trpc.creator.importYoutubeChannel.useMutation({
    onSuccess: (res) => {
      setSummary({ ...res, channelName: channelInfo?.channelName ?? "" });
      setShowSummary(true);
      setStep("done");
      setProgress(100);
      setProgressLabel(`Import complete — ${res.imported} videos added`);
    },
    onError: (err) => {
      toast.error(err.message);
      setStep("preview");
    },
  });

  const handleFetch = () => {
    if (!channelUrl.trim()) { toast.error("Please enter your YouTube channel URL"); return; }
    setStep("importing");
    setProgress(10);
    setProgressLabel("Resolving channel...");
    // Animate progress while fetching
    let p = 10;
    const interval = setInterval(() => {
      p = Math.min(p + Math.random() * 8, 85);
      setProgress(p);
      if (p < 30) setProgressLabel("Resolving channel...");
      else if (p < 55) setProgressLabel("Fetching video list...");
      else if (p < 75) setProgressLabel("Loading thumbnails...");
      else setProgressLabel("Almost done...");
    }, 600);
    fetchMutation.mutate(
      { channelUrl: channelUrl.trim(), maxVideos: Math.min(500, Math.max(1, parseInt(channelMaxVideos) || 200)) },
      { onSettled: () => clearInterval(interval) }
    );
  };

  const handleConfirmImport = () => {
    const selected = fetchedVideos.filter(v => selectedIds.has(v.youtubeId));
    if (selected.length === 0) { toast.error("Select at least one video to import"); return; }
    setStep("importing");
    setProgress(5);
    setProgressLabel(`Importing ${selected.length} videos...`);
    let p = 5;
    const interval = setInterval(() => {
      p = Math.min(p + (90 / selected.length) * 0.8, 90);
      setProgress(p);
      setProgressLabel(`Saving videos to ZTVLIVE...`);
    }, 400);
    importMutation.mutate(
      { category: channelCategory as any, selectedVideos: selected.map(v => ({ youtubeId: v.youtubeId, title: v.title, description: v.description, thumbnailUrl: v.thumbnailUrl, publishedAt: v.publishedAt })) },
      { onSettled: () => clearInterval(interval) }
    );
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(fetchedVideos.filter(v => !v.alreadyImported).map(v => v.youtubeId)));
  const deselectAll = () => setSelectedIds(new Set());

  const filteredVideos = fetchedVideos.filter(v =>
    !searchFilter || v.title.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const newCount = fetchedVideos.filter(v => !v.alreadyImported).length;
  const selectedCount = selectedIds.size;

  if (!isCreator) {
    return (
      <div className="glass-card rounded-2xl p-6 border border-yellow-500/20 bg-yellow-500/5">
        <div className="flex items-center gap-3 mb-2">
          <Youtube className="w-5 h-5 text-yellow-400" />
          <h3 className="text-base font-bold text-white">YouTube Import</h3>
        </div>
        <p className="text-sm text-white/50">Your account needs Creator status to import videos. Contact support to upgrade.</p>
      </div>
    );
  }

  return (
    <>
      {/* Summary Popup */}
      {showSummary && summary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
          <div className="glass-card rounded-2xl overflow-hidden w-full max-w-lg border border-green-500/30 shadow-2xl">
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-green-500/20 to-[oklch(0.72_0.2_220/0.15)] border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Import Complete!</h3>
                  <p className="text-xs text-white/40 mt-0.5">{summary.channelName && `From: ${summary.channelName}`}</p>
                </div>
              </div>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-3 divide-x divide-white/10 border-b border-white/10">
              <div className="p-4 text-center">
                <p className="text-2xl font-black text-green-400">{summary.imported}</p>
                <p className="text-xs text-white/40 mt-0.5">Imported</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-2xl font-black text-white/40">{summary.skipped}</p>
                <p className="text-xs text-white/40 mt-0.5">Already Existed</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-2xl font-black text-[oklch(0.72_0.2_220)]">{summary.total}</p>
                <p className="text-xs text-white/40 mt-0.5">Total Selected</p>
              </div>
            </div>
            {/* Imported titles list */}
            {summary.importedTitles.length > 0 && (
              <div className="px-6 py-4 border-b border-white/10">
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Successfully Imported</p>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {summary.importedTitles.map((t, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                      <span className="text-xs text-white/70 truncate">{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Skipped titles */}
            {summary.skippedTitles.length > 0 && (
              <div className="px-6 py-4 border-b border-white/10">
                <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-2">Already on ZTVLIVE (Skipped)</p>
                <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1">
                  {summary.skippedTitles.map((t, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <XCircle className="w-3 h-3 text-white/20 flex-shrink-0" />
                      <span className="text-xs text-white/30 truncate">{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="px-6 py-4 flex gap-3">
              <Button onClick={() => setShowSummary(false)}
                className="flex-1 bg-[oklch(0.72_0.2_220)] text-[oklch(0.08_0.01_264)] font-bold">
                Done
              </Button>
              <Button variant="outline" onClick={() => { setShowSummary(false); setStep("input"); setFetchedVideos([]); setChannelUrl(""); setProgress(0); }}
                className="border-white/20 text-white hover:bg-white/10">
                Import Another Channel
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card rounded-2xl overflow-hidden border border-red-500/20">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-red-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center flex-shrink-0">
              <Youtube className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold text-white">Import Your Entire YouTube Channel</h2>
              <p className="text-xs text-white/40 mt-0.5">Paste your channel URL, preview all videos, select what to import</p>
            </div>
            {/* Step indicator */}
            <div className="flex items-center gap-1.5 text-xs">
              {(["1. Fetch", "2. Preview", "3. Import"] as const).map((label, i) => {
                const stepNum = i + 1;
                const currentNum = step === "input" ? 1 : step === "preview" ? 2 : 3;
                const done = currentNum > stepNum;
                const active = currentNum === stepNum;
                return (
                  <>
                    <span key={label} className={`px-2 py-0.5 rounded-full font-semibold ${
                      done ? "bg-green-500/20 text-green-400" :
                      active ? "bg-red-600 text-white" :
                      "bg-white/5 text-white/30"
                    }`}>{done ? "✓ " : ""}{label}</span>
                    {i < 2 && <ChevronRight className="w-3 h-3 text-white/20" />}
                  </>
                );
              })}
            </div>
          </div>
        </div>

        {/* Progress bar — shown during fetch/import */}
        {(step === "importing" || (step === "preview" && progress > 0 && progress < 100)) && (
          <div className="px-6 pt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-white/50">{progressLabel}</span>
              <span className="text-xs font-bold text-[oklch(0.72_0.2_220)]">{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, oklch(0.72 0.2 220), oklch(0.56 0.24 290))",
                }}
              />
            </div>
          </div>
        )}

        {/* ── STEP 1: Input ── */}
        {step === "input" && (
          <div className="p-6 space-y-5">
            <div>
              <label className="text-sm font-semibold text-white mb-2 block">Your YouTube Channel URL</label>
              <Input
                placeholder="https://youtube.com/@YourChannel  or  https://youtube.com/channel/UCxxxxxxx"
                value={channelUrl}
                onChange={e => setChannelUrl(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleFetch(); }}
                className="h-11 text-sm bg-white/5 border-white/15 text-white placeholder-white/25 focus:border-red-500/50"
              />
              <p className="text-xs text-white/30 mt-1.5">
                Accepted: <code className="text-white/50">@handle</code> · <code className="text-white/50">/channel/UCxxx</code> · <code className="text-white/50">/c/name</code> · <code className="text-white/50">/user/name</code>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-white/50 mb-1.5 block uppercase tracking-wider">Default Category</label>
                <Select value={channelCategory} onValueChange={setChannelCategory}>
                  <SelectTrigger className="h-9 text-sm bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["tech", "gaming", "sports", "movies", "podcasts", "news", "music", "other"].map(c => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-white/50 mb-1.5 block uppercase tracking-wider">Max Videos to Fetch</label>
                <Input type="number" min={1} max={500} value={channelMaxVideos} onChange={e => setChannelMaxVideos(e.target.value)}
                  className="h-9 text-sm bg-white/5 border-white/10 text-white" />
              </div>
            </div>
            <Button onClick={handleFetch} disabled={!channelUrl.trim()}
              className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold text-base">
              <Youtube className="w-5 h-5 mr-2" /> Fetch Channel Videos
            </Button>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-white/3 border border-white/8">
              <AlertCircle className="w-4 h-4 text-white/30 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-white/30">We'll fetch your video list first so you can preview and select which ones to import. No videos are saved until you confirm.</p>
            </div>
          </div>
        )}

        {/* ── STEP 2: Preview & Select ── */}
        {step === "preview" && fetchedVideos.length > 0 && (
          <div className="flex flex-col">
            {/* Channel info + controls */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center gap-4 flex-wrap">
              {channelInfo?.channelThumbnail && (
                <img src={channelInfo.channelThumbnail} alt="" className="w-10 h-10 rounded-full border border-white/20" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{channelInfo?.channelName || "Your Channel"}</p>
                <p className="text-xs text-white/40">{fetchedVideos.length} videos fetched · {newCount} new · {fetchedVideos.length - newCount} already imported</p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search videos..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  className="h-8 w-40 text-xs bg-white/5 border-white/10 text-white placeholder-white/30"
                />
                <Button size="sm" variant="outline" onClick={selectAll}
                  className="border-white/20 text-white hover:bg-white/10 text-xs h-8">Select All New</Button>
                <Button size="sm" variant="outline" onClick={deselectAll}
                  className="border-white/20 text-white hover:bg-white/10 text-xs h-8">Deselect All</Button>
              </div>
            </div>

            {/* Video grid */}
            <div className="overflow-y-auto" style={{ maxHeight: "480px" }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                {filteredVideos.map(video => {
                  const isSelected = selectedIds.has(video.youtubeId);
                  return (
                    <button
                      key={video.youtubeId}
                      onClick={() => !video.alreadyImported && toggleSelect(video.youtubeId)}
                      disabled={video.alreadyImported}
                      className={`relative rounded-xl overflow-hidden border text-left transition-all ${
                        video.alreadyImported
                          ? "border-white/5 opacity-40 cursor-not-allowed"
                          : isSelected
                          ? "border-[oklch(0.72_0.2_220)] ring-1 ring-[oklch(0.72_0.2_220/0.4)] shadow-lg shadow-[oklch(0.72_0.2_220/0.1)]"
                          : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-video bg-black">
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`; }}
                        />
                        {/* Selection overlay */}
                        <div className={`absolute inset-0 flex items-center justify-center transition-all ${
                          isSelected ? "bg-[oklch(0.72_0.2_220/0.2)]" : "bg-transparent"
                        }`}>
                          <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? "bg-[oklch(0.72_0.2_220)] border-[oklch(0.72_0.2_220)]"
                              : "bg-black/40 border-white/40"
                          }`}>
                            {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                          </div>
                        </div>
                        {video.alreadyImported && (
                          <div className="absolute top-1.5 right-1.5 bg-green-500/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                            IMPORTED
                          </div>
                        )}
                      </div>
                      {/* Title */}
                      <div className="p-2.5">
                        <p className="text-xs font-semibold text-white line-clamp-2 leading-snug">{video.title}</p>
                        {video.publishedAt && (
                          <p className="text-[10px] text-white/30 mt-1">{new Date(video.publishedAt).toLocaleDateString()}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Confirm bar */}
            <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between gap-4 bg-white/3">
              <div>
                <p className="text-sm font-bold text-white">{selectedCount} video{selectedCount !== 1 ? "s" : ""} selected</p>
                <p className="text-xs text-white/40">{newCount - selectedCount > 0 ? `${newCount - selectedCount} new videos not selected` : "All new videos selected"}</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setStep("input"); setFetchedVideos([]); setProgress(0); }}
                  className="border-white/20 text-white hover:bg-white/10">
                  ← Back
                </Button>
                <Button
                  onClick={handleConfirmImport}
                  disabled={selectedCount === 0}
                  className="bg-gradient-to-r from-red-600 to-[oklch(0.56_0.24_290)] text-white font-bold px-6"
                >
                  <Youtube className="w-4 h-4 mr-2" /> Import {selectedCount} Video{selectedCount !== 1 ? "s" : ""} to ZTVLIVE
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Importing in progress ── */}
        {step === "importing" && (
          <div className="p-8 text-center">
            <Loader2 className="w-10 h-10 text-[oklch(0.72_0.2_220)] animate-spin mx-auto mb-4" />
            <p className="text-base font-bold text-white mb-1">{progressLabel}</p>
            <p className="text-sm text-white/40">Please don't close this page</p>
          </div>
        )}

        {/* ── STEP 4: Done ── */}
        {step === "done" && (
          <div className="p-8 text-center">
            <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-4" />
            <p className="text-base font-bold text-white mb-1">All done!</p>
            <p className="text-sm text-white/40 mb-4">Your videos are now live on ZTVLIVE.</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => setShowSummary(true)} variant="outline" className="border-white/20 text-white hover:bg-white/10">
                View Summary
              </Button>
              <Button onClick={() => { setStep("input"); setFetchedVideos([]); setChannelUrl(""); setProgress(0); setSummary(null); }}
                className="bg-[oklch(0.72_0.2_220)] text-[oklch(0.08_0.01_264)] font-bold">
                Import Another Channel
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function BulkImportSection() {
  const { user } = useAuth();
  const [mode, setMode] = useState<ImportMode>("channel");

  const [rows, setRows] = useState<ImportRow[]>([
    { youtubeId: "", title: "", description: "", category: "tech", tags: "", duration: "" },
  ]);
  const [pasteText, setPasteText] = useState("");
  const [showPaste, setShowPaste] = useState(false);

  const importMutation = trpc.creator.bulkImportYoutube.useMutation({
    onSuccess: (res) => {
      toast.success(`Imported ${res.imported} video${res.imported !== 1 ? "s" : ""}${res.skipped > 0 ? ` (${res.skipped} already existed)` : ""}!`);
      setRows([{ youtubeId: "", title: "", description: "", category: "tech", tags: "", duration: "" }]);
    },
    onError: (err) => toast.error(err.message),
  });

  const isCreator = user?.role === "creator" || user?.role === "admin";

  const addRow = () => setRows(r => [...r, { youtubeId: "", title: "", description: "", category: "tech", tags: "", duration: "" }]);
  const removeRow = (i: number) => setRows(r => r.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: keyof ImportRow, val: string) =>
    setRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

  const handlePasteParse = () => {
    const lines = pasteText.split("\n").map(l => l.trim()).filter(Boolean);
    const newRows: ImportRow[] = lines.map(line => ({
      youtubeId: extractYouTubeId(line),
      title: "",
      description: "",
      category: "tech",
      tags: "",
      duration: "",
    }));
    if (newRows.length > 0) {
      setRows(newRows);
      setShowPaste(false);
      setPasteText("");
      toast.info(`Parsed ${newRows.length} video ID${newRows.length !== 1 ? "s" : ""}. Fill in titles and click Import.`);
    }
  };

  const handleImport = () => {
    const valid = rows.filter(r => r.youtubeId.trim() && r.title.trim());
    if (valid.length === 0) {
      toast.error("Add at least one video with a YouTube ID and title");
      return;
    }
    importMutation.mutate({
      items: valid.map(r => ({
        youtubeId: extractYouTubeId(r.youtubeId),
        title: r.title,
        description: r.description || undefined,
        category: r.category as any,
        tags: r.tags || undefined,
        duration: r.duration || undefined,
      })),
    });
  };

  if (!isCreator) {
    return (
      <div className="glass-card rounded-2xl p-6 border border-yellow-500/20 bg-yellow-500/5">
        <div className="flex items-center gap-3 mb-2">
          <Youtube className="w-5 h-5 text-yellow-400" />
          <h3 className="text-base font-bold text-white">YouTube Import</h3>
        </div>
        <p className="text-sm text-white/50">Your account needs Creator status to import videos. Contact support to upgrade.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mode Switcher */}
      <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
        <button
          onClick={() => setMode("channel")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            mode === "channel"
              ? "bg-red-600 text-white shadow-lg"
              : "text-white/50 hover:text-white hover:bg-white/10"
          }`}
        >
          <Youtube className="w-4 h-4" />
          Import Entire Channel
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold">RECOMMENDED</span>
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            mode === "manual"
              ? "bg-[oklch(0.72_0.2_220)] text-[oklch(0.08_0.01_264)] shadow-lg"
              : "text-white/50 hover:text-white hover:bg-white/10"
          }`}
        >
          <Plus className="w-4 h-4" />
          Add Individual Videos
        </button>
      </div>

      {/* ── CHANNEL IMPORT MODE ── */}
      {mode === "channel" && <ChannelImportSection isCreator={isCreator} />}

      {/* ── MANUAL IMPORT MODE ──────────────────────────────────────────── */}
      {mode === "manual" && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Youtube className="w-5 h-5 text-red-400" />
              <h2 className="text-base font-bold text-white">Add Individual Videos</h2>
              <span className="text-xs text-white/30 ml-1">— import specific videos by URL or ID</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowPaste(!showPaste)}
                className="border-white/20 text-white hover:bg-white/10 text-xs">
                <Download className="w-3.5 h-3.5 mr-1" /> Paste URLs
              </Button>
              <Button size="sm" variant="outline" onClick={addRow}
                className="border-white/20 text-white hover:bg-white/10 text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
              </Button>
            </div>
          </div>

          {showPaste && (
            <div className="px-6 py-4 bg-white/3 border-b border-white/10">
              <p className="text-xs text-white/50 mb-2">Paste YouTube URLs or video IDs (one per line):</p>
              <textarea
                className="w-full h-24 bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:border-[oklch(0.72_0.2_220/0.5)]"
                placeholder={"https://youtube.com/watch?v=ABC123\nhttps://youtu.be/DEF456\nGHI789"}
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
              />
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={handlePasteParse}
                  className="bg-[oklch(0.72_0.2_220)] text-[oklch(0.08_0.01_264)] font-bold text-xs">
                  Parse URLs
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowPaste(false)}
                  className="text-white/40 text-xs">Cancel</Button>
              </div>
            </div>
          )}

          <div className="p-4 space-y-3">
            <div className="grid grid-cols-[180px_1fr_130px_1fr_80px_36px] gap-2 px-1">
              {["YouTube ID / URL", "Title *", "Category", "Tags", "Duration", ""].map((h, i) => (
                <span key={i} className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">{h}</span>
              ))}
            </div>

            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-[180px_1fr_130px_1fr_80px_36px] gap-2 items-center">
                <Input
                  placeholder="Video ID or URL"
                  value={row.youtubeId}
                  onChange={e => updateRow(i, "youtubeId", e.target.value)}
                  className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder-white/25"
                />
                <Input
                  placeholder="Video title *"
                  value={row.title}
                  onChange={e => updateRow(i, "title", e.target.value)}
                  className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder-white/25"
                />
                <Select value={row.category} onValueChange={val => updateRow(i, "category", val)}>
                  <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["tech", "gaming", "sports", "movies", "podcasts", "news", "music", "other"].map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="tags, comma, separated"
                  value={row.tags}
                  onChange={e => updateRow(i, "tags", e.target.value)}
                  className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder-white/25"
                />
                <Input
                  placeholder="e.g. 12:34"
                  value={row.duration}
                  onChange={e => updateRow(i, "duration", e.target.value)}
                  className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder-white/25"
                />
                <button onClick={() => removeRow(i)} disabled={rows.length === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-20">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
            <p className="text-xs text-white/30">
              {rows.filter(r => r.youtubeId && r.title).length} of {rows.length} rows ready to import
            </p>
            <Button onClick={handleImport} disabled={importMutation.isPending}
              className="bg-gradient-to-r from-[oklch(0.72_0.2_220)] to-[oklch(0.56_0.24_290)] text-white font-bold text-sm">
              {importMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing...</>
              ) : (
                <><Youtube className="w-4 h-4 mr-2" /> Import to ZTVLIVE</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function MyVideosSection() {
  const { isAuthenticated } = useAuth();
  const { data: myVideos, isLoading } = trpc.creator.myVideos.useQuery(undefined, { enabled: isAuthenticated });

  if (isLoading) return (
    <div className="glass-card rounded-2xl p-6 space-y-3">
      {[1,2,3].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}
    </div>
  );

  if (!myVideos || myVideos.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Video className="w-5 h-5 text-[oklch(0.72_0.2_220)]" />
          <h2 className="text-base font-bold text-white">My Videos on ZTVLIVE</h2>
          <span className="ml-2 px-2 py-0.5 rounded-full bg-[oklch(0.72_0.2_220/0.15)] text-[oklch(0.72_0.2_220)] text-xs font-bold">
            {myVideos.length}
          </span>
        </div>
      </div>
      <div className="divide-y divide-white/5">
        {myVideos.slice(0, 20).map((v: any) => (
          <div key={v.id} className="flex items-center gap-4 px-6 py-3">
            <img
              src={v.thumbnailUrl || `https://img.youtube.com/vi/${v.youtubeId}/mqdefault.jpg`}
              alt={v.title}
              className="w-20 h-12 object-cover rounded-lg bg-white/5 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{v.title}</p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs text-white/30 capitalize">{v.category}</span>
                {v.duration && <span className="text-xs text-white/25">{v.duration}</span>}
                <span className="flex items-center gap-1 text-xs text-white/25">
                  <Eye className="w-3 h-3" /> {(v.viewCount ?? 0).toLocaleString()}
                </span>
              </div>
            </div>
            <a
              href={`/watch/${v.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-[oklch(0.72_0.2_220)] hover:underline flex-shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" /> View
            </a>
          </div>
        ))}
        {myVideos.length > 20 && (
          <div className="px-6 py-3 text-center text-xs text-white/30">
            +{myVideos.length - 20} more videos
          </div>
        )}
      </div>
    </div>
  );
}

type DashTab = "overview" | "imports" | "videos" | "slots" | "revenue" | "golive";

type StreamStatus = "idle" | "setting_up" | "live" | "ended";

function GoLiveSection() {
  const { user } = useAuth();
  const [streamStatus, setStreamStatus] = useState<StreamStatus>("idle");
  const [activeStream, setActiveStream] = useState<any>(null);
  const [form, setForm] = useState({ title: "", description: "", category: "live" as string, playbackType: "youtube" as "youtube" | "daily" | "rtmp", playbackId: "", chatEnabled: true });
  const [chatMsg, setChatMsg] = useState("");
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const { data: myStreams, refetch: refetchStreams } = trpc.creatorLive.myStreams.useQuery({ limit: 10, offset: 0 });
  const { data: chatMessages, refetch: refetchChat } = trpc.creatorLive.getChat.useQuery(
    { streamId: activeStream?.id ?? 0 },
    { enabled: !!activeStream && streamStatus === "live", refetchInterval: 3000 }
  );

  const createStream = trpc.creatorLive.create.useMutation({
    onSuccess: (stream) => { setActiveStream(stream); setStreamStatus("setting_up"); },
    onError: (e) => toast.error(e.message),
  });
  const startStream = trpc.creatorLive.start.useMutation({
    onSuccess: () => { setStreamStatus("live"); toast.success("You are now LIVE! 🔴"); refetchStreams(); },
    onError: (e) => toast.error(e.message),
  });
  const endStream = trpc.creatorLive.end.useMutation({
    onSuccess: () => { setStreamStatus("ended"); toast.success("Stream ended. Your stream history has been saved."); refetchStreams(); },
    onError: (e) => toast.error(e.message),
  });
  const updateStream = trpc.creatorLive.update.useMutation();
  const sendChat = trpc.creatorLive.sendChat.useMutation({
    onSuccess: () => { setChatMsg(""); refetchChat(); },
    onError: (e) => toast.error(e.message),
  });

  const isCreator = user?.role === "creator" || user?.role === "admin";

  const copyStreamKey = () => {
    if (activeStream?.streamKey) {
      navigator.clipboard.writeText(activeStream.streamKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
      toast.success("Stream key copied!");
    }
  };

  const handleCreateStream = () => {
    if (!form.title.trim()) { toast.error("Please enter a stream title"); return; }
    createStream.mutate({
      title: form.title,
      description: form.description,
      category: form.category as any,
      playbackType: form.playbackType,
      playbackId: form.playbackId || undefined,
      chatEnabled: form.chatEnabled,
    });
  };

  if (!isCreator) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center border border-red-500/20">
        <Radio className="w-10 h-10 text-white/20 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white mb-2">Creator Account Required</h3>
        <p className="text-white/50 text-sm">Your account needs Creator status to go live. Contact support to upgrade.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="glass-card rounded-2xl p-5 border border-[oklch(0.65_0.25_290/0.3)] bg-gradient-to-r from-[oklch(0.65_0.25_290/0.08)] to-[oklch(0.72_0.2_220/0.08)]">
        <div className="flex items-center gap-3 mb-2">
          <Radio className="w-5 h-5 text-[oklch(0.65_0.25_290)]" />
          <h2 className="text-base font-bold text-white">Go Live on ZTVLIVE</h2>
          <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold border border-red-500/30">BETA</span>
        </div>
        <p className="text-sm text-white/50">Stream directly to your ZTVLIVE audience. Use your browser camera or connect OBS/Streamlabs via stream key.</p>
      </div>

      {streamStatus === "idle" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Stream Setup Form */}
          <div className="glass-card rounded-2xl p-6 space-y-5">
            <h3 className="font-bold text-white text-base flex items-center gap-2"><Play className="w-4 h-4 text-[oklch(0.72_0.2_220)]" />Set Up Your Stream</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 mb-1.5 block font-medium">Stream Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="What are you streaming today?"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[oklch(0.72_0.2_220/0.5)]"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1.5 block font-medium">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Tell viewers what to expect..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[oklch(0.72_0.2_220/0.5)] resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block font-medium">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[oklch(0.72_0.2_220/0.5)]"
                  >
                    {["live","tech","gaming","sports","movies","podcasts","news","music","other"].map(c => (
                      <option key={c} value={c} className="bg-[oklch(0.12_0.02_264)]">{c.charAt(0).toUpperCase()+c.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block font-medium">Stream Method</label>
                  <select
                    value={form.playbackType}
                    onChange={e => setForm(f => ({ ...f, playbackType: e.target.value as any }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[oklch(0.72_0.2_220/0.5)]"
                  >
                    <option value="youtube" className="bg-[oklch(0.12_0.02_264)]">YouTube Live (embed)</option>
                    <option value="rtmp" className="bg-[oklch(0.12_0.02_264)]">OBS / External Encoder</option>
                  </select>
                </div>
              </div>
              {form.playbackType === "youtube" && (
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block font-medium">YouTube Live Video ID or URL</label>
                  <input
                    value={form.playbackId}
                    onChange={e => setForm(f => ({ ...f, playbackId: e.target.value }))}
                    placeholder="e.g. dQw4w9WgXcQ or full YouTube URL"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[oklch(0.72_0.2_220/0.5)]"
                  />
                  <p className="text-xs text-white/30 mt-1">Start a live stream on YouTube Studio first, then paste the video ID here to embed it on ZTVLIVE.</p>
                </div>
              )}
            </div>
            <Button
              onClick={handleCreateStream}
              disabled={createStream.isPending}
              className="w-full bg-gradient-to-r from-[oklch(0.65_0.25_290)] to-[oklch(0.72_0.2_220)] text-white font-bold"
            >
              {createStream.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Setting up...</> : <><ChevronRight className="w-4 h-4 mr-2" />Continue to Stream Setup</>}
            </Button>
          </div>

          {/* How It Works */}
          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-5 border border-white/8">
              <h3 className="font-bold text-white text-sm mb-4">How to Go Live on ZTVLIVE</h3>
              <div className="space-y-3">
                {[
                  { step: "1", title: "Set up your stream", desc: "Enter your stream title, category, and choose your streaming method" },
                  { step: "2", title: "Connect your encoder", desc: "Use OBS, Streamlabs, or YouTube Studio with your unique stream key" },
                  { step: "3", title: "Go Live", desc: "Click Go Live — your stream appears on ZTVLIVE instantly" },
                  { step: "4", title: "Engage your audience", desc: "Chat with viewers in real time and build your ZTVLIVE community" },
                ].map(item => (
                  <div key={item.step} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[oklch(0.65_0.25_290/0.2)] border border-[oklch(0.65_0.25_290/0.4)] flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-[oklch(0.65_0.25_290)]">{item.step}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="text-xs text-white/40">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-card rounded-2xl p-5 border border-white/8">
              <h3 className="font-bold text-white text-sm mb-3">Recommended Software</h3>
              <div className="space-y-2">
                {[
                  { name: "OBS Studio", desc: "Free, professional-grade (Windows/Mac/Linux)", url: "https://obsproject.com" },
                  { name: "Streamlabs", desc: "Easy to use with alerts and overlays", url: "https://streamlabs.com" },
                  { name: "YouTube Studio", desc: "Built-in browser streaming, no software needed", url: "https://studio.youtube.com" },
                ].map(s => (
                  <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-lg bg-white/3 hover:bg-white/6 border border-white/8 transition-colors group">
                    <div>
                      <p className="text-sm font-medium text-white">{s.name}</p>
                      <p className="text-xs text-white/40">{s.desc}</p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-white/30 group-hover:text-white/60" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {(streamStatus === "setting_up" || streamStatus === "live") && activeStream && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          {/* Main stream panel */}
          <div className="space-y-4">
            {/* Stream preview */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="aspect-video bg-black relative">
                {activeStream.playbackType === "youtube" && activeStream.playbackId ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${activeStream.playbackId}?autoplay=1&mute=0`}
                    className="w-full h-full"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${streamStatus === "live" ? "bg-red-500/20 animate-pulse" : "bg-white/5"}`}>
                      <Radio className={`w-8 h-8 ${streamStatus === "live" ? "text-red-400" : "text-white/20"}`} />
                    </div>
                    {streamStatus === "live" ? (
                      <div className="text-center">
                        <div className="flex items-center gap-2 justify-center mb-1">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-red-400 font-bold text-sm">LIVE</span>
                        </div>
                        <p className="text-white/50 text-xs">Stream is live — viewers can watch at<br /><span className="text-[oklch(0.72_0.2_220)]">/live/{activeStream.id}</span></p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-white/50 text-sm">Waiting for stream signal...</p>
                        <p className="text-white/30 text-xs mt-1">Connect your encoder and click Go Live</p>
                      </div>
                    )}
                  </div>
                )}
                {streamStatus === "live" && (
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />LIVE
                    </span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-white">{activeStream.title}</h3>
                {activeStream.description && <p className="text-sm text-white/50 mt-1">{activeStream.description}</p>}
                <div className="flex items-center gap-3 mt-3">
                  {streamStatus === "setting_up" ? (
                    <Button onClick={() => startStream.mutate({ streamId: activeStream.id })} disabled={startStream.isPending}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold">
                      <Radio className="w-4 h-4 mr-2" />{startStream.isPending ? "Starting..." : "Go Live Now"}
                    </Button>
                  ) : (
                    <Button onClick={() => endStream.mutate({ streamId: activeStream.id })} disabled={endStream.isPending}
                      variant="outline" className="border-red-500/40 text-red-400 hover:bg-red-500/10">
                      <WifiOff className="w-4 h-4 mr-2" />{endStream.isPending ? "Ending..." : "End Stream"}
                    </Button>
                  )}
                  <a href={`/live/${activeStream.id}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="border-white/20 text-white/60 hover:text-white">
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" />View Public Page
                    </Button>
                  </a>
                </div>
              </div>
            </div>

            {/* Stream Key (for OBS/RTMP) */}
            <div className="glass-card rounded-2xl p-5 border border-[oklch(0.75_0.18_60/0.2)] bg-[oklch(0.75_0.18_60/0.03)]">
              <div className="flex items-center gap-2 mb-3">
                <Key className="w-4 h-4 text-[oklch(0.75_0.18_60)]" />
                <h3 className="font-bold text-white text-sm">Stream Key & RTMP Settings</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-white/40 mb-1 block">RTMP Server URL</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-[oklch(0.72_0.2_220)] font-mono">rtmp://live.ztvlivestream.com/live</code>
                    <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText("rtmp://live.ztvlivestream.com/live"); toast.success("Copied!"); }} className="text-white/40 hover:text-white">
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Stream Key</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/70 font-mono truncate">
                      {showStreamKey ? activeStream.streamKey : "•".repeat(32)}
                    </code>
                    <Button size="sm" variant="ghost" onClick={() => setShowStreamKey(s => !s)} className="text-white/40 hover:text-white">
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={copyStreamKey} className="text-white/40 hover:text-white">
                      {copiedKey ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-white/30">⚠️ Keep your stream key private. Anyone with this key can stream to your channel.</p>
              </div>
            </div>
          </div>

          {/* Live Chat Panel */}
          <div className="glass-card rounded-2xl overflow-hidden flex flex-col" style={{ height: "600px" }}>
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-[oklch(0.72_0.2_220)]" />
              <h3 className="font-bold text-white text-sm">Live Chat</h3>
              {streamStatus === "live" && <span className="ml-auto flex items-center gap-1 text-xs text-red-400"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />LIVE</span>}
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {streamStatus !== "live" ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-white/30 text-xs text-center">Chat will appear here once you go live</p>
                </div>
              ) : !chatMessages || chatMessages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-white/30 text-xs text-center">No messages yet — be the first to chat!</p>
                </div>
              ) : (
                [...chatMessages].reverse().map((msg: any) => (
                  <div key={msg.id} className={`flex items-start gap-2 ${msg.isCreator ? "bg-[oklch(0.72_0.2_220/0.08)] rounded-lg p-2" : ""}`}>
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white/60">
                      {msg.displayName?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <span className={`text-xs font-bold ${msg.isCreator ? "text-[oklch(0.72_0.2_220)]" : "text-white/70"}`}>{msg.displayName}</span>
                      {msg.isCreator && <span className="ml-1 text-[9px] bg-[oklch(0.72_0.2_220/0.2)] text-[oklch(0.72_0.2_220)] px-1 rounded">CREATOR</span>}
                      <p className="text-xs text-white/80 mt-0.5">{msg.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-3 border-t border-white/10 flex gap-2">
              <input
                value={chatMsg}
                onChange={e => setChatMsg(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && chatMsg.trim() && streamStatus === "live") { sendChat.mutate({ streamId: activeStream.id, message: chatMsg }); } }}
                placeholder={streamStatus === "live" ? "Say something..." : "Go live to chat"}
                disabled={streamStatus !== "live"}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none disabled:opacity-40"
              />
              <Button size="sm" onClick={() => { if (chatMsg.trim()) sendChat.mutate({ streamId: activeStream.id, message: chatMsg }); }}
                disabled={!chatMsg.trim() || streamStatus !== "live" || sendChat.isPending}
                className="bg-[oklch(0.72_0.2_220)] text-[oklch(0.08_0.01_264)] px-3">
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {streamStatus === "ended" && (
        <div className="glass-card rounded-2xl p-8 text-center border border-green-500/20">
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-2">Stream Ended</h3>
          <p className="text-white/50 text-sm mb-4">Your stream has been saved to your history. Viewers can replay it via the VOD link.</p>
          <Button onClick={() => { setStreamStatus("idle"); setActiveStream(null); setForm({ title: "", description: "", category: "live", playbackType: "youtube", playbackId: "", chatEnabled: true }); }}
            className="bg-[oklch(0.72_0.2_220)] text-[oklch(0.08_0.01_264)] font-bold">
            Start New Stream
          </Button>
        </div>
      )}

      {/* Stream History */}
      {myStreams && myStreams.length > 0 && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h3 className="font-bold text-white text-sm flex items-center gap-2"><Wifi className="w-4 h-4 text-[oklch(0.72_0.2_220)]" />Stream History</h3>
          </div>
          <div className="divide-y divide-white/5">
            {myStreams.map((s: any) => (
              <div key={s.id} className="flex items-center gap-4 px-6 py-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.status === "live" ? "bg-red-500 animate-pulse" : s.status === "ended" ? "bg-white/20" : "bg-yellow-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{s.title}</p>
                  <p className="text-xs text-white/30">{s.status === "live" ? "🔴 Currently Live" : s.status === "ended" ? `Ended · ${s.viewerCount} peak viewers` : "Scheduled"}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  s.status === "live" ? "bg-red-500/20 text-red-400" :
                  s.status === "ended" ? "bg-white/5 text-white/40" :
                  "bg-yellow-500/20 text-yellow-400"
                }`}>{s.status}</span>
                {s.status === "live" && (
                  <a href={`/live/${s.id}`} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost" className="text-[oklch(0.72_0.2_220)] hover:text-white text-xs">
                      <ExternalLink className="w-3.5 h-3.5 mr-1" />Watch
                    </Button>
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreatorDashboard() {
  const { isAuthenticated, user } = useAuth();
  const { data: mySlots, isLoading } = trpc.creator.mySlots.useQuery(undefined, { enabled: isAuthenticated });
  const { data: analytics } = trpc.creator.myAnalytics.useQuery(undefined, { enabled: isAuthenticated });
  const { data: revenueHistory } = trpc.creator.myRevenueHistory.useQuery({ limit: 20, offset: 0 }, { enabled: isAuthenticated });
  const requestPayoutMutation = trpc.creator.requestPayout.useMutation();
  const [activeTab, setActiveTab] = useState<DashTab>("overview");
  const [payoutForm, setPayoutForm] = useState({ amount: "", method: "paypal" as "paypal" | "bank_transfer" | "check", paymentDetails: "" });

  // Allow deep-link to imports tab via URL hash
  useState(() => {
    if (typeof window !== "undefined" && window.location.hash === "#imports") {
      setActiveTab("imports");
    }
  });

  if (!isAuthenticated) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 py-20 text-center">
        <BarChart3 className="w-12 h-12 text-white/20 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Creator Dashboard</h2>
        <p className="text-white/50 text-sm mb-6">Sign in to access your creator dashboard</p>
        <Button
          onClick={() => (window.location.href = getLoginUrl())}
          className="bg-[oklch(0.72_0.2_220)] text-[oklch(0.08_0.01_264)] font-bold"
        >
          Sign In
        </Button>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Creator Dashboard"
        description="Manage your ZTVLIVE creator account. View analytics, manage upload slots, and track your earnings."
        url="/creator/dashboard"
        noIndex
      />

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white mb-1">Creator Dashboard</h1>
            <p className="text-white/50 text-sm">Welcome back, {user?.name ?? "Creator"}</p>
          </div>
          <Link href="/creator/book-slot">
            <Button className="bg-[oklch(0.72_0.2_220)] text-[oklch(0.08_0.01_264)] font-bold">
              <Upload className="w-4 h-4 mr-2" />
              Book Slot
            </Button>
          </Link>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/10 overflow-x-auto">
          {([
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "golive", label: "Go Live", icon: Radio },
            { id: "imports", label: "Imports", icon: FileDown },
            { id: "videos", label: "My Videos", icon: Video },
            { id: "slots", label: "Upload Slots", icon: Upload },
            { id: "revenue", label: "Revenue", icon: DollarSign },
          ] as { id: DashTab; label: string; icon: React.ElementType }[]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-[oklch(0.72_0.2_220)] text-[oklch(0.08_0.01_264)] shadow-lg"
                  : "text-white/50 hover:text-white hover:bg-white/10"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.id === "imports" && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">NEW</span>
              )}
              {tab.id === "golive" && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold animate-pulse">LIVE</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "golive" && <GoLiveSection />}

        {activeTab === "imports" && (
          <div className="space-y-6">
            <div className="glass-card rounded-2xl p-5 border border-[oklch(0.72_0.2_220/0.2)] bg-[oklch(0.72_0.2_220/0.05)]">
              <div className="flex items-center gap-3 mb-2">
                <FileDown className="w-5 h-5 text-[oklch(0.72_0.2_220)]" />
                <h2 className="text-base font-bold text-white">Import Your Content</h2>
              </div>
              <p className="text-sm text-white/50">Import your existing YouTube videos directly to ZTVLIVE. Your content will be reviewed and published to your creator channel.</p>
            </div>
            <BulkImportSection />
            <MyVideosSection />
          </div>
        )}

        {activeTab === "videos" && <MyVideosSection />}

        {activeTab === "overview" && (
          <>
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Views", value: analytics ? analytics.totalViews.toLocaleString() : "—", icon: BarChart3, color: "oklch(0.72 0.2 220)" },
            { label: "Total Revenue", value: analytics ? `$${analytics.totalRevenue.toFixed(2)}` : "$0.00", icon: DollarSign, color: "oklch(0.65 0.22 150)" },
            { label: "My Videos", value: analytics ? analytics.totalVideos.toLocaleString() : "—", icon: Video, color: "oklch(0.65 0.25 290)" },
            { label: "Pending Payout", value: analytics ? `$${analytics.pendingRevenue.toFixed(2)}` : "$0.00", icon: Users, color: "oklch(0.75 0.18 60)" },
          ].map((stat) => (
            <div key={stat.label} className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                <span className="text-xs text-white/40">{stat.label}</span>
              </div>
              <p className="text-2xl font-black text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/creator/book-slot">
            <div className="glass-card rounded-xl p-4 hover:border-[oklch(0.72_0.2_220/0.4)] transition-all cursor-pointer group">
              <Upload className="w-6 h-6 text-[oklch(0.72_0.2_220)] mb-2" />
              <p className="text-sm font-semibold text-white">Book Upload Slot</p>
              <p className="text-xs text-white/40 mt-1">Schedule your next content slot</p>
              <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-[oklch(0.72_0.2_220)] mt-2 transition-colors" />
            </div>
          </Link>
          <Link href="/schedule">
            <div className="glass-card rounded-xl p-4 hover:border-[oklch(0.65_0.25_290/0.4)] transition-all cursor-pointer group">
              <Calendar className="w-6 h-6 text-[oklch(0.65_0.25_290)] mb-2" />
              <p className="text-sm font-semibold text-white">My Schedule</p>
              <p className="text-xs text-white/40 mt-1">View your upcoming broadcast slots</p>
              <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-[oklch(0.65_0.25_290)] mt-2 transition-colors" />
            </div>
          </Link>
          <Link href="/creator/rights">
            <div className="glass-card rounded-xl p-4 hover:border-[oklch(0.65_0.22_150/0.4)] transition-all cursor-pointer group">
              <AlertCircle className="w-6 h-6 text-[oklch(0.65_0.22_150)] mb-2" />
              <p className="text-sm font-semibold text-white">Rights & Legal</p>
              <p className="text-xs text-white/40 mt-1">Content rights and legal information</p>
              <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-[oklch(0.65_0.22_150)] mt-2 transition-colors" />
            </div>
          </Link>
        </div>

        {/* Upload Slots (overview quick view) */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-base font-bold text-white">My Upload Slots</h2>
            <Link href="/creator/book-slot">
              <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10 text-xs">
                + New Slot
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : !mySlots || mySlots.length === 0 ? (
            <div className="p-12 text-center">
              <Upload className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-white/40 text-sm">No upload slots yet</p>
              <p className="text-white/25 text-xs mt-1">Book your first slot to get started</p>
              <Link href="/creator/book-slot">
                <Button size="sm" className="mt-4 bg-[oklch(0.72_0.2_220)] text-[oklch(0.08_0.01_264)] font-semibold text-xs">
                  Book First Slot
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {mySlots.map((slot) => {
                const statusConfig = STATUS_CONFIG[slot.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
                return (
                  <div key={slot.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{slot.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-white/40">{formatDate(slot.scheduledAt)}</span>
                        {slot.category && (
                          <span className="text-xs text-white/30 capitalize">{slot.category}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <statusConfig.icon className="w-3.5 h-3.5" style={{ color: statusConfig.color }} />
                      <span className="text-xs font-medium" style={{ color: statusConfig.color }}>
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Revenue info */}
        <div className="glass-card rounded-2xl p-6 border-[oklch(0.65_0.22_150/0.2)]">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="w-5 h-5 text-[oklch(0.65_0.22_150)]" />
            <h3 className="text-base font-bold text-white">Revenue Share</h3>
            <span className="ml-auto text-lg font-black text-[oklch(0.65_0.22_150)]">70%</span>
          </div>
          <p className="text-sm text-white/60 leading-relaxed">
            You earn <strong className="text-white">70%</strong> of all advertising revenue generated by your content. Payments are processed monthly via PayPal or bank transfer once you reach the $50 minimum threshold.
          </p>
          <div className="mt-4 flex gap-3">
            <Link href="/creator">
              <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10 text-xs">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
          </>
        )}

        {activeTab === "slots" && (
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-base font-bold text-white">My Upload Slots</h2>
              <Link href="/creator/book-slot">
                <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10 text-xs">
                  + New Slot
                </Button>
              </Link>
            </div>
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : !mySlots || mySlots.length === 0 ? (
              <div className="p-12 text-center">
                <Upload className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="text-white/40 text-sm">No upload slots yet</p>
                <Link href="/creator/book-slot">
                  <Button size="sm" className="mt-4 bg-[oklch(0.72_0.2_220)] text-[oklch(0.08_0.01_264)] font-semibold text-xs">
                    Book First Slot
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {mySlots.map((slot) => {
                  const statusConfig = STATUS_CONFIG[slot.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
                  return (
                    <div key={slot.id} className="flex items-center gap-4 px-6 py-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{slot.title}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-white/40">{formatDate(slot.scheduledAt)}</span>
                          {slot.category && <span className="text-xs text-white/30 capitalize">{slot.category}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <statusConfig.icon className="w-3.5 h-3.5" style={{ color: statusConfig.color }} />
                        <span className="text-xs font-medium" style={{ color: statusConfig.color }}>
                          {statusConfig.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "revenue" && (
          <div className="space-y-6">
            {/* Revenue Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-card rounded-xl p-5">
                <p className="text-xs text-white/40 mb-1">Total Earned</p>
                <p className="text-3xl font-black text-[oklch(0.65_0.22_150)]">${analytics?.totalRevenue.toFixed(2) ?? "0.00"}</p>
                <p className="text-xs text-white/30 mt-1">All time</p>
              </div>
              <div className="glass-card rounded-xl p-5">
                <p className="text-xs text-white/40 mb-1">Pending Payout</p>
                <p className="text-3xl font-black text-[oklch(0.75_0.18_60)]">${analytics?.pendingRevenue.toFixed(2) ?? "0.00"}</p>
                <p className="text-xs text-white/30 mt-1">Min. $50 to request</p>
              </div>
              <div className="glass-card rounded-xl p-5">
                <p className="text-xs text-white/40 mb-1">Revenue Share</p>
                <p className="text-3xl font-black text-white">70%</p>
                <p className="text-xs text-white/30 mt-1">Of all ad revenue</p>
              </div>
            </div>

            {/* Revenue History */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10">
                <h3 className="text-base font-bold text-white">Revenue History</h3>
              </div>
              {!revenueHistory || revenueHistory.items.length === 0 ? (
                <div className="p-12 text-center">
                  <DollarSign className="w-10 h-10 text-white/10 mx-auto mb-3" />
                  <p className="text-white/40 text-sm">No revenue events yet</p>
                  <p className="text-white/25 text-xs mt-1">Revenue is tracked as your videos generate ad views</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {revenueHistory.items.map((event) => (
                    <div key={event.id} className="flex items-center gap-4 px-6 py-3">
                      <div className="flex-1">
                        <p className="text-sm text-white capitalize">{event.eventType.replace("_", " ")}</p>
                        <p className="text-xs text-white/40">{new Date(event.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[oklch(0.65_0.22_150)]">+${event.creatorShare.toFixed(2)}</p>
                        <p className="text-xs text-white/30 capitalize">{event.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payout Request */}
            {(analytics?.pendingRevenue ?? 0) >= 50 && (
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-base font-bold text-white mb-4">Request Payout</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Amount (USD, min $50)</label>
                    <Input
                      type="number"
                      min={50}
                      max={analytics?.pendingRevenue ?? 0}
                      value={payoutForm.amount}
                      onChange={(e) => setPayoutForm((f) => ({ ...f, amount: e.target.value }))}
                      className="bg-white/5 border-white/10 text-white"
                      placeholder="50.00"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Payment Method</label>
                    <Select value={payoutForm.method} onValueChange={(v) => setPayoutForm((f) => ({ ...f, method: v as any }))}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paypal">PayPal</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Payment Details (PayPal email / account info)</label>
                    <Input
                      value={payoutForm.paymentDetails}
                      onChange={(e) => setPayoutForm((f) => ({ ...f, paymentDetails: e.target.value }))}
                      className="bg-white/5 border-white/10 text-white"
                      placeholder="your@paypal.com"
                    />
                  </div>
                  <Button
                    onClick={async () => {
                      const amount = parseFloat(payoutForm.amount);
                      if (!amount || amount < 50) { toast.error("Minimum payout is $50"); return; }
                      if (!payoutForm.paymentDetails) { toast.error("Payment details required"); return; }
                      await requestPayoutMutation.mutateAsync({ amount, method: payoutForm.method, paymentDetails: payoutForm.paymentDetails });
                      toast.success("Payout request submitted! We'll process it within 5 business days.");
                      setPayoutForm({ amount: "", method: "paypal", paymentDetails: "" });
                    }}
                    disabled={requestPayoutMutation.isPending}
                    className="w-full bg-[oklch(0.65_0.22_150)] text-white font-bold"
                  >
                    {requestPayoutMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Request Payout"}
                  </Button>
                </div>
              </div>
            )}

            <div className="glass-card rounded-2xl p-5 border border-white/5">
              <p className="text-sm text-white/50 leading-relaxed">
                <strong className="text-white">Revenue Share Policy:</strong> You earn <strong className="text-white">70%</strong> of all advertising revenue generated by your content on ZTVLIVE. Revenue is calculated monthly and credited to your account. Payouts are processed within 5 business days of request via PayPal or bank transfer. Minimum payout threshold is <strong className="text-white">$50 USD</strong>.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
