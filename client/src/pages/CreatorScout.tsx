import { useState } from "react";
import { SEO } from "@/components/SEO";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Users,
  Radar,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  TrendingUp,
  Youtube,
  Instagram,
  Twitter,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  BarChart3,
  Zap,
} from "lucide-react";

// ── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  new: { label: "New", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  contacted: { label: "Contacted", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  applied: { label: "Applied", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  approved: { label: "Approved", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  rejected: { label: "Rejected", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  unresponsive: { label: "No Response", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
} as const;

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  youtube: <Youtube className="w-4 h-4 text-red-500" />,
  instagram: <Instagram className="w-4 h-4 text-pink-500" />,
  twitter: <Twitter className="w-4 h-4 text-sky-400" />,
  tiktok: <span className="text-xs font-bold text-white">TT</span>,
};

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <Card className="bg-gray-900/60 border-gray-800">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
          <p className="text-sm text-gray-400">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Prospect row ──────────────────────────────────────────────────────────────

function ProspectRow({ prospect, onStatusChange }: {
  prospect: any;
  onStatusChange: (id: number, status: string) => void;
}) {
  const tags = (() => { try { return JSON.parse(prospect.tags || "[]"); } catch { return []; } })();

  return (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-900/40 border border-gray-800 hover:border-blue-500/40 transition-all group">
      {/* Platform icon */}
      <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0 mt-1">
        {PLATFORM_ICONS[prospect.platform] ?? <Users className="w-4 h-4 text-gray-400" />}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-white">{prospect.displayName || prospect.handle}</span>
          <span className="text-gray-500 text-sm">{prospect.handle}</span>
          <Badge variant="outline" className={`text-xs ${STATUS_CONFIG[prospect.status as keyof typeof STATUS_CONFIG]?.color ?? ""}`}>
            {STATUS_CONFIG[prospect.status as keyof typeof STATUS_CONFIG]?.label ?? prospect.status}
          </Badge>
          <Badge variant="outline" className="text-xs text-violet-400 border-violet-500/30 bg-violet-500/10">
            Score: {prospect.score}
          </Badge>
        </div>
        <p className="text-gray-400 text-sm mt-1 line-clamp-2">{prospect.bio}</p>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
          <span>{(prospect.followerCount || 0).toLocaleString()} followers</span>
          <span>{(prospect.avgViews || 0).toLocaleString()} avg views</span>
          <span>{prospect.engagementRate || "—"} engagement</span>
          <span className="capitalize">{prospect.niche}</span>
        </div>
        {tags.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {tags.slice(0, 4).map((tag: string) => (
              <span key={tag} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>
        )}
        {prospect.notes && (
          <p className="text-xs text-blue-400/80 mt-1 italic">💡 {prospect.notes}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 flex-shrink-0">
        <a
          href={prospect.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
        >
          View <ExternalLink className="w-3 h-3" />
        </a>
        <Select value={prospect.status} onValueChange={(v) => onStatusChange(prospect.id, v)}>
          <SelectTrigger className="h-7 text-xs w-32 bg-gray-800 border-gray-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CreatorScout() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [nicheFilter, setNicheFilter] = useState<string>("all");
  const [isScanning, setIsScanning] = useState(false);

  const { data: stats, refetch: refetchStats } = trpc.scout.stats.useQuery(undefined, { enabled: user?.role === "admin" });
  const { data: prospectsData, refetch: refetchProspects } = trpc.scout.prospects.useQuery(
    { status: statusFilter as any, niche: nicheFilter === "all" ? undefined : nicheFilter, limit: 50 },
    { enabled: user?.role === "admin" }
  );
  const { data: scanHistory, refetch: refetchHistory } = trpc.scout.scanHistory.useQuery(undefined, { enabled: user?.role === "admin" });
  const { data: niches } = trpc.scout.niches.useQuery();

  const updateStatus = trpc.scout.updateStatus.useMutation({
    onSuccess: () => { refetchProspects(); refetchStats(); },
  });

  const runScan = trpc.scout.runScan.useMutation({
    onSuccess: (result) => {
      toast.success(`Scan complete! Found ${result.prospectsNew} new creators across ${result.niches.length} niches.`);
      refetchProspects();
      refetchStats();
      refetchHistory();
      setIsScanning(false);
    },
    onError: (err) => {
      toast.error(`Scan failed: ${err.message}`);
      setIsScanning(false);
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Radar className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Creator Scout</h1>
          <p className="text-gray-400 mb-6">Sign in to access the Creator Scout dashboard.</p>
          <Link href="/"><Button>Go Home</Button></Link>
        </div>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Restricted</h1>
          <p className="text-gray-400 mb-6">Creator Scout is available to admins only.</p>
          <Link href="/"><Button>Go Home</Button></Link>
        </div>
      </div>
    );
  }

  const handleStatusChange = (id: number, status: string) => {
    updateStatus.mutate({ id, status: status as any });
  };

  const handleRunScan = () => {
    setIsScanning(true);
    runScan.mutate({});
  };

  return (
    <>
      <SEO title="Admin — Creator Scout" url="/admin/creator-scout" noIndex />
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-white transition-colors">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </Link>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
              <Radar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Creator Scout</h1>
              <p className="text-xs text-gray-400">AI-powered creator discovery engine</p>
            </div>
          </div>
          <Button
            onClick={handleRunScan}
            disabled={isScanning}
            className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white"
          >
            {isScanning ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Scanning...</>
            ) : (
              <><Zap className="w-4 h-4 mr-2" /> Run Scan</>
            )}
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Prospects" value={stats?.total ?? 0} icon={<Users className="w-5 h-5 text-white" />} color="bg-blue-600/20" />
          <StatCard label="New Leads" value={stats?.new ?? 0} icon={<TrendingUp className="w-5 h-5 text-white" />} color="bg-green-600/20" />
          <StatCard label="Contacted" value={stats?.contacted ?? 0} icon={<MessageSquare className="w-5 h-5 text-white" />} color="bg-yellow-600/20" />
          <StatCard label="Approved" value={stats?.approved ?? 0} icon={<CheckCircle className="w-5 h-5 text-white" />} color="bg-violet-600/20" />
        </div>

        {/* How it works banner */}
        {(stats?.total ?? 0) === 0 && (
          <Card className="bg-gradient-to-r from-blue-900/40 to-violet-900/40 border-blue-500/30">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-600/20 rounded-xl">
                  <Radar className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Creator Scout is Ready</h3>
                  <p className="text-gray-300 text-sm mb-4">
                    The AI engine scans for creators in Tech, Gaming, Culture, News, Podcasts, and Sports niches.
                    It scores each prospect (0–100) based on follower count, engagement rate, and content fit for ZTVLIVE.
                    Runs automatically every 6 hours — or click <strong>Run Scan</strong> to start now.
                  </p>
                  <div className="flex gap-6 text-sm text-gray-400">
                    <span className="flex items-center gap-1"><Play className="w-3 h-3 text-blue-400" /> Auto-scans every 6 hours</span>
                    <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-400" /> Deduplication built-in</span>
                    <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3 text-violet-400" /> AI fit scoring (0–100)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="prospects">
          <TabsList className="bg-gray-900 border border-gray-800">
            <TabsTrigger value="prospects">Prospects ({prospectsData?.total ?? 0})</TabsTrigger>
            <TabsTrigger value="history">Scan History</TabsTrigger>
          </TabsList>

          {/* Prospects Tab */}
          <TabsContent value="prospects" className="space-y-4 mt-4">
            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-gray-900 border-gray-700">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={nicheFilter} onValueChange={setNicheFilter}>
                <SelectTrigger className="w-40 bg-gray-900 border-gray-700">
                  <SelectValue placeholder="All niches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Niches</SelectItem>
                  {niches?.map((n) => (
                    <SelectItem key={n.id} value={n.id}>{n.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Prospect list */}
            {!prospectsData || prospectsData.items.length === 0 ? (
              <Card className="bg-gray-900/40 border-gray-800">
                <CardContent className="p-12 text-center">
                  <Radar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg font-medium">No prospects yet</p>
                  <p className="text-gray-500 text-sm mt-1">Click <strong>Run Scan</strong> to discover your first batch of creators.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {prospectsData.items.map((p) => (
                  <ProspectRow key={p.id} prospect={p} onStatusChange={handleStatusChange} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Scan History Tab */}
          <TabsContent value="history" className="mt-4">
            {!scanHistory || scanHistory.length === 0 ? (
              <Card className="bg-gray-900/40 border-gray-800">
                <CardContent className="p-12 text-center">
                  <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No scans run yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {scanHistory.map((run) => (
                  <Card key={run.id} className="bg-gray-900/40 border-gray-800">
                    <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${run.status === "completed" ? "bg-green-500" : run.status === "failed" ? "bg-red-500" : "bg-yellow-500 animate-pulse"}`} />
                        <div>
                          <p className="text-sm font-medium text-white capitalize">{run.triggeredBy} scan</p>
                          <p className="text-xs text-gray-500">{new Date(run.startedAt).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex gap-6 text-sm text-gray-400">
                        <span><span className="text-white font-medium">{run.prospectsFound}</span> found</span>
                        <span><span className="text-green-400 font-medium">{run.prospectsNew}</span> new</span>
                        <span><span className="text-gray-500 font-medium">{run.prospectsSkipped}</span> skipped</span>
                      </div>
                      <Badge variant="outline" className={`capitalize ${run.status === "completed" ? "text-green-400 border-green-500/30" : run.status === "failed" ? "text-red-400 border-red-500/30" : "text-yellow-400 border-yellow-500/30"}`}>
                        {run.status}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </>
  );
}
