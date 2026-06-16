import { useState } from "react";
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
  Video, Eye, ExternalLink, Loader2, Download,
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

function BulkImportSection() {
  const { user } = useAuth();
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
    // Parse pasted YouTube URLs or IDs (one per line)
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
          <h3 className="text-base font-bold text-white">Bulk YouTube Import</h3>
        </div>
        <p className="text-sm text-white/50">Your account needs Creator status to import videos. Contact support to upgrade.</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Youtube className="w-5 h-5 text-red-400" />
          <h2 className="text-base font-bold text-white">Bulk YouTube Import</h2>
          <span className="text-xs text-white/30 ml-1">— import your videos from YouTube to ZTVLIVE</span>
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
        {/* Column headers */}
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

export default function CreatorDashboard() {
  const { isAuthenticated, user } = useAuth();
  const { data: mySlots, isLoading } = trpc.creator.mySlots.useQuery(undefined, { enabled: isAuthenticated });

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

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Views", value: "—", icon: BarChart3, color: "oklch(0.72 0.2 220)" },
            { label: "Est. Earnings", value: "—", icon: DollarSign, color: "oklch(0.65 0.22 150)" },
            { label: "Upload Slots", value: mySlots?.length ?? "—", icon: Upload, color: "oklch(0.65 0.25 290)" },
            { label: "Audience", value: "—", icon: Users, color: "oklch(0.75 0.18 60)" },
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

        {/* Bulk YouTube Import */}
        <BulkImportSection />

        {/* My Videos on ZTVLIVE */}
        <MyVideosSection />

        {/* Upload Slots */}
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
      </div>
    </>
  );
}
