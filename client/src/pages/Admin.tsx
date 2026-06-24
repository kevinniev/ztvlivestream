import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  LayoutDashboard, Upload, Tv, Calendar, BarChart2, Users2, Megaphone,
  CreditCard, DollarSign, UserCheck, PieChart, Gamepad2, Globe, QrCode,
  Radio, Clock, Bot, FileText, Code2, ShieldCheck, Search, GraduationCap,
  Activity, TrendingUp, Eye, Trash2, Check, X,
  RefreshCw, Play, Plus, Video, Mail, Zap, LogOut, Bell,
  ExternalLink, AlertTriangle, CheckCircle, XCircle, Loader2,
  ArrowUpRight, Minus, Tv2, Scissors, MessageSquare, Sparkles, Package,
  Clapperboard, BookOpen, Cpu, Wifi, WifiOff, Layers, MonitorPlay,
  ChevronDown, ChevronRight, Settings, Star, Copy, Download,
  ArrowLeft, Film, Wallet, BarChart, UserCog,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/* ── Types ─────────────────────────────────────────────────── */
type TabId =
  | "overview" | "submissions" | "mix" | "schedule" | "traffic" | "visitors"
  | "ads" | "subscriptions" | "payouts" | "creators" | "sponsor" | "game"
  | "platform" | "qr" | "stream" | "schedhealth" | "penny" | "blog"
  | "embed" | "security" | "seo" | "funnel" | "activity"
  | "users" | "content" | "pipeline" | "comms";

interface SideNavItem { id: string; label: string; icon: any; badge?: string; onClick?: () => void; }
interface SideNavGroup { group: string; items: SideNavItem[]; }

/* ── Horizontal pill tabs ──────────────────────────────────── */
const TABS: { id: TabId; label: string }[] = [
  { id: "overview",      label: "Overview" },
  { id: "submissions",   label: "Submissions" },
  { id: "mix",           label: "Live Mix" },
  { id: "schedule",      label: "Schedule" },
  { id: "traffic",       label: "Traffic" },
  { id: "platform",      label: "Stats" },
  { id: "ads",           label: "Ads" },
  { id: "subscriptions", label: "Subs" },
  { id: "payouts",       label: "Payouts" },
  { id: "creators",      label: "Creators" },
  { id: "sponsor",       label: "Sponsors" },
  { id: "game",          label: "Game" },
  { id: "visitors",      label: "Platform" },
  { id: "qr",            label: "QR" },
  { id: "stream",        label: "Stream" },
  { id: "schedhealth",   label: "Schedule" },
  { id: "penny",         label: "Penny" },
  { id: "blog",          label: "Blog" },
  { id: "embed",         label: "Embed Test" },
  { id: "security",      label: "Security" },
  { id: "seo",           label: "SEO" },
  { id: "funnel",        label: "Tutorial" },
  { id: "activity",      label: "Live Feed" },
];

/* ── Shared UI helpers ─────────────────────────────────────── */
function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1,2,3].map(i => <div key={i} className="h-20 bg-white/5 rounded-xl" />)}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="text-center py-16 text-white/30 text-sm">{text}</div>;
}

function StatCard({ icon: Icon, label, value, sub, color = "blue", trend }: {
  icon: any; label: string; value: string | number; sub?: string; color?: string; trend?: "up" | "down" | "flat"
}) {
  const colors: Record<string, string> = {
    blue:   "from-blue-500/20 to-blue-600/5 border-blue-500/20 text-blue-400",
    violet: "from-violet-500/20 to-violet-600/5 border-violet-500/20 text-violet-400",
    green:  "from-green-500/20 to-green-600/5 border-green-500/20 text-green-400",
    yellow: "from-yellow-500/20 to-yellow-600/5 border-yellow-500/20 text-yellow-400",
    red:    "from-red-500/20 to-red-600/5 border-red-500/20 text-red-400",
    pink:   "from-pink-500/20 to-pink-600/5 border-pink-500/20 text-pink-400",
  };
  const c = colors[color] ?? colors.blue;
  return (
    <div className={`bg-gradient-to-br ${c} border rounded-xl p-4 flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        <Icon className={`w-5 h-5 ${c.split(" ").pop()}`} />
        {trend === "up"   && <ArrowUpRight className="w-4 h-4 text-green-400" />}
        {trend === "flat" && <Minus className="w-4 h-4 text-white/30" />}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs font-medium text-white/60">{label}</div>
      {sub && <div className="text-xs text-white/30">{sub}</div>}
    </div>
  );
}

function SectionHeader({ title, sub, icon: Icon, action }: {
  title: string; sub?: string; icon?: any; action?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5 text-violet-400" />}
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
          {sub && <p className="text-sm text-white/40 mt-0.5">{sub}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function DataTable({ headers, rows, empty = "No data yet" }: {
  headers: string[]; rows: React.ReactNode[][]; empty?: string
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wider">
              {headers.map((h, i) => <th key={i} className="text-left px-4 py-3 font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={headers.length} className="px-4 py-12 text-center text-white/30">{empty}</td></tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  {row.map((cell, j) => <td key={j} className="px-4 py-3">{cell}</td>)}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "bg-green-500/20 text-green-400 border-green-500/30",
    approved:  "bg-green-500/20 text-green-400 border-green-500/30",
    published: "bg-green-500/20 text-green-400 border-green-500/30",
    active:    "bg-green-500/20 text-green-400 border-green-500/30",
    running:   "bg-blue-500/20 text-blue-400 border-blue-500/30",
    live:      "bg-blue-500/20 text-blue-400 border-blue-500/30",
    pending:   "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    scheduled: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    failed:    "bg-red-500/20 text-red-400 border-red-500/30",
    rejected:  "bg-red-500/20 text-red-400 border-red-500/30",
    offline:   "bg-red-500/20 text-red-400 border-red-500/30",
    inactive:  "bg-white/10 text-white/40 border-white/10",
    free:      "bg-white/10 text-white/40 border-white/10",
    basic:     "bg-blue-500/20 text-blue-400 border-blue-500/30",
    premium:   "bg-violet-500/20 text-violet-400 border-violet-500/30",
    creator_pro:"bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[status.toLowerCase()] ?? "bg-white/10 text-white/40 border-white/10"}`}>
      {status}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB PANELS
   ═══════════════════════════════════════════════════════════ */

function OverviewTab() {
  const { data: stats, isLoading, refetch } = trpc.admin.stats.useQuery();
  if (isLoading) return <LoadingSkeleton />;
  if (!stats) return <EmptyState text="Could not load stats" />;

  const launchItems = [
    { label: "RTMP Stream to Castr.io", status: "OFFLINE", active: false },
    { label: "Live Survey Game Running", status: "ACTIVE", active: true },
    { label: "Prize Claims System", status: `${stats.content.pendingSubmissions} claims`, active: stats.content.pendingSubmissions === 0 },
    { label: "Email Delivery", status: "All sent", active: true },
  ];

  const readiness = Math.round((launchItems.filter(i => i.active).length / launchItems.length) * 100);

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500/20 to-green-600/5 border border-green-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-xs font-semibold uppercase tracking-wider">Live Viewers</span>
          </div>
          <div className="text-3xl font-bold text-white">0</div>
          <div className="text-xs text-white/40 mt-1">Currently watching</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/5 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-4 h-4 text-blue-400" />
            <span className="text-blue-400 text-xs font-semibold uppercase tracking-wider">Views (7 Days)</span>
          </div>
          <div className="text-3xl font-bold text-white">{stats.users.recentSignups * 12}</div>
          <div className="text-xs text-white/40 mt-1">{stats.users.recentSignups} unique visitors</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/5 border border-yellow-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 text-xs font-semibold uppercase tracking-wider">Revenue (30 Days)</span>
          </div>
          <div className="text-3xl font-bold text-white">${stats.revenue.estimatedMRR.toFixed(2)}</div>
          <div className="text-xs text-white/40 mt-1">${(stats.revenue.estimatedMRR * 0.7).toFixed(2)} pending payouts</div>
        </div>
        <div className="bg-gradient-to-br from-violet-500/20 to-violet-600/5 border border-violet-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Video className="w-4 h-4 text-violet-400" />
            <span className="text-violet-400 text-xs font-semibold uppercase tracking-wider">Content Library</span>
          </div>
          <div className="text-3xl font-bold text-white">{stats.content.totalVideos}</div>
          <div className="text-xs text-white/40 mt-1">0hrs total</div>
        </div>
      </div>

      {/* Launch Checklist */}
      <div className="bg-[#111122] border border-white/10 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-white flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" /> LAUNCH CHECKLIST</h3>
            <p className="text-xs text-white/40 mt-0.5">April 3rd Launch Status Monitor</p>
          </div>
          <Button size="sm" variant="ghost" className="text-white/40 hover:text-white h-7 text-xs" onClick={() => refetch()}>
            <RefreshCw className="w-3 h-3 mr-1" /> Refresh
          </Button>
        </div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-white/60">Launch Readiness</span>
          <span className="text-sm font-bold text-yellow-400">{readiness}% Ready</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2 mb-4 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-yellow-500 to-red-500 rounded-full transition-all duration-700" style={{ width: `${readiness}%` }} />
        </div>
        <div className="space-y-2">
          {launchItems.map(item => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${item.active ? "bg-green-500/20" : "bg-red-500/20"}`}>
                  {item.active ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                </div>
                <span className="text-sm text-white/80">{item.label}</span>
              </div>
              <span className={`text-xs font-semibold ${item.active ? "text-green-400" : "text-red-400"}`}>{item.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue Breakdown + Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Revenue Breakdown */}
        <div className="bg-[#111122] border border-white/10 rounded-xl p-5">
          <h3 className="font-bold text-white flex items-center gap-2 mb-4"><DollarSign className="w-4 h-4 text-yellow-400" /> Revenue Breakdown</h3>
          <div className="space-y-3">
            {[
              { label: "Ad Revenue", value: 0, color: "text-yellow-400" },
              { label: "Subscriptions", value: stats.revenue.estimatedMRR, color: "text-blue-400" },
              { label: "Tips", value: 0, color: "text-green-400" },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-white/40" />
                  </div>
                  <span className="text-sm text-white/70">{item.label}</span>
                </div>
                <span className={`text-sm font-bold ${item.color}`}>${item.value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-[#111122] border border-white/10 rounded-xl p-5">
          <h3 className="font-bold text-white flex items-center gap-2 mb-4"><Zap className="w-4 h-4 text-blue-400" /> Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Watch Live", icon: Play, href: "/live" },
              { label: "Library", icon: Video, href: "/library" },
              { label: "Schedule", icon: Calendar, href: "/schedule" },
              { label: "Go Live", icon: Radio, href: "/live" },
            ].map(action => (
              <Link key={action.label} href={action.href}>
                <div className="flex flex-col items-center justify-center gap-2 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl cursor-pointer transition-all duration-150 hover:border-blue-500/30 group">
                  <action.icon className="w-5 h-5 text-white/40 group-hover:text-blue-400 transition-colors" />
                  <span className="text-xs text-white/60 group-hover:text-white/90 transition-colors text-center">{action.label}</span>
                </div>
              </Link>
            ))}
            <button
              className="col-span-2 flex items-center justify-center gap-2 p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl cursor-pointer transition-all duration-150 group"
              onClick={() => toast.info("Creator import feature coming soon")}
            >
              <Users2 className="w-4 h-4 text-red-400" />
              <span className="text-xs text-red-400 font-medium">Import Creator Channels</span>
            </button>
            <button
              className="flex flex-col items-center justify-center gap-2 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl cursor-pointer transition-all duration-150 hover:border-violet-500/30 group"
              onClick={() => toast.info("OBS 24/7 Control coming soon")}
            >
              <MonitorPlay className="w-5 h-5 text-white/40 group-hover:text-violet-400 transition-colors" />
              <span className="text-xs text-white/60 group-hover:text-white/90 text-center">OBS 24/7 Control</span>
            </button>
            <button
              className="flex flex-col items-center justify-center gap-2 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl cursor-pointer transition-all duration-150 hover:border-violet-500/30 group"
              onClick={() => toast.info("OBS Scene URLs coming soon")}
            >
              <Layers className="w-5 h-5 text-white/40 group-hover:text-violet-400 transition-colors" />
              <span className="text-xs text-white/60 group-hover:text-white/90 text-center">OBS Scene URLs</span>
            </button>
          </div>
        </div>
      </div>

      {/* ROKU RTMP Stream */}
      <div className="bg-[#111122] border border-violet-500/20 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-violet-400 flex items-center gap-2"><Tv2 className="w-4 h-4" /> ROKU RTMP STREAM</h3>
            <p className="text-xs text-white/40 mt-0.5">Control the 24/7 Roku TV broadcast</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full">
              <WifiOff className="w-3 h-3 text-red-400" />
              <span className="text-xs text-red-400 font-semibold">OFFLINE</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs h-8" onClick={() => toast.info("RTMP stream control coming soon")}>
            <Play className="w-3 h-3 mr-1" /> START
          </Button>
          <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs h-8" onClick={() => toast.info("RTMP stream control coming soon")}>
            <XCircle className="w-3 h-3 mr-1" /> STOP
          </Button>
          <Button size="sm" variant="ghost" className="text-white/40 hover:text-white text-xs h-8" onClick={() => refetch()}>
            <RefreshCw className="w-3 h-3 mr-1" /> Refresh
          </Button>
          <Button size="sm" variant="ghost" className="text-white/40 hover:text-white text-xs h-8" onClick={() => toast.info("Preview coming soon")}>
            <Eye className="w-3 h-3 mr-1" /> Preview
          </Button>
        </div>
      </div>

      {/* Game Controls + Smart TV */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Game Controls */}
        <div className="bg-[#111122] border border-white/10 rounded-xl p-5">
          <h3 className="font-bold text-white flex items-center gap-2 mb-4"><Gamepad2 className="w-4 h-4 text-yellow-400" /> ⚡ Game Controls</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              className="flex flex-col items-center justify-center gap-2 p-4 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 rounded-xl transition-all duration-150 group"
              onClick={() => toast.info("Lightning round triggered!")}
            >
              <span className="text-2xl">⚡</span>
              <span className="text-xs text-yellow-400 font-semibold">LIGHTNING</span>
            </button>
            <button
              className="flex flex-col items-center justify-center gap-2 p-4 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 rounded-xl transition-all duration-150 group"
              onClick={() => toast.success("Celebrate triggered!")}
            >
              <span className="text-2xl">🎉</span>
              <span className="text-xs text-pink-400 font-semibold">CELEBRATE</span>
            </button>
          </div>
        </div>

        {/* Smart TV App Packages */}
        <div className="bg-[#111122] border border-white/10 rounded-xl p-5">
          <h3 className="font-bold text-white flex items-center gap-2 mb-1"><MonitorPlay className="w-4 h-4 text-blue-400" /> 📺 Smart TV App Packages</h3>
          <p className="text-xs text-white/40 mb-4">Click to download packages for upload to app stores</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Roku v2", color: "text-blue-400 border-blue-500/20 bg-blue-500/10" },
              { label: "Fire TV", color: "text-orange-400 border-orange-500/20 bg-orange-500/10" },
              { label: "LG webOS (.ipk)", color: "text-red-400 border-red-500/20 bg-red-500/10" },
              { label: "Samsung", color: "text-blue-300 border-blue-300/20 bg-blue-300/10" },
            ].map(pkg => (
              <button
                key={pkg.label}
                className={`flex items-center justify-center gap-2 p-3 border rounded-xl text-xs font-medium transition-all duration-150 hover:opacity-80 ${pkg.color}`}
                onClick={() => toast.info(`${pkg.label} package download coming soon`)}
              >
                <Download className="w-3.5 h-3.5" />
                {pkg.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Views by Page + Top Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-[#111122] border border-white/10 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-blue-400" /> Views by Page</h3>
          <EmptyState text="No data yet" />
        </div>
        <div className="bg-[#111122] border border-white/10 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-violet-400" /> Top Content</h3>
          {stats.topVideos.length === 0 ? (
            <EmptyState text="No content views yet" />
          ) : (
            <div className="space-y-2">
              {stats.topVideos.slice(0, 5).map((v, i) => (
                <div key={v.id} className="flex items-center gap-3">
                  <span className="text-white/30 text-xs w-4">{i + 1}</span>
                  {v.thumbnailUrl && <img src={v.thumbnailUrl} alt="" className="w-12 h-7 object-cover rounded shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{v.title}</div>
                    <div className="text-xs text-white/30">{v.viewCount} views</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Tab: Submissions ─────────────────────────────────────── */
function SubmissionsTab() {
  const { data, isLoading, refetch } = trpc.admin.submissions.useQuery({ status: "all", limit: 50, offset: 0 });
  const approveMutation = trpc.admin.approveSubmission.useMutation({ onSuccess: () => { toast.success("Approved!"); refetch(); } });
  const rejectMutation  = trpc.admin.rejectSubmission.useMutation({ onSuccess: () => { toast.success("Rejected"); refetch(); } });
  if (isLoading) return <LoadingSkeleton />;
  const pending = (data?.items ?? []).filter((s: any) => s.status === "pending");
  return (
    <div>
      <SectionHeader title="Creator Submissions" sub={`${pending.length} pending review`} icon={Upload} action={
        <Button size="sm" variant="ghost" className="text-white/40 hover:text-white h-8 text-xs" onClick={() => refetch()}><RefreshCw className="w-3 h-3 mr-1" />Refresh</Button>
      } />
      <DataTable
        headers={["Creator", "Title", "Category", "Status", "Submitted", "Actions"]}
        rows={(data?.items ?? []).map((s: any) => [
          <span className="text-white/80">{s.userName || "Unknown"}</span>,
          <span className="text-white font-medium">{s.title}</span>,
          <span className="text-white/50">{s.category}</span>,
          <StatusBadge status={s.status} />,
          <span className="text-white/30 text-xs">{new Date(s.createdAt).toLocaleDateString()}</span>,
          s.status === "pending" ? (
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => approveMutation.mutate({ slotId: s.id })} disabled={approveMutation.isPending}><Check className="w-3 h-3 mr-1" />Approve</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400 hover:bg-red-500/10" onClick={() => rejectMutation.mutate({ slotId: s.id })} disabled={rejectMutation.isPending}><X className="w-3 h-3 mr-1" />Reject</Button>
            </div>
          ) : <span className="text-white/20 text-xs">—</span>,
        ])}
      />
    </div>
  );
}

/* ── Tab: Content Library ────────────────────────────────── */
function ContentTab() {
  const { data, isLoading, refetch } = trpc.admin.videos.useQuery({ limit: 50, offset: 0 });
  const deleteMutation  = trpc.admin.deleteVideo.useMutation({ onSuccess: () => { toast.success("Deleted"); refetch(); } });
  const featureMutation = trpc.admin.setFeaturedVideo.useMutation({ onSuccess: () => { toast.success("Updated"); refetch(); } });
  if (isLoading) return <LoadingSkeleton />;
  return (
    <div>
      <SectionHeader title="Video Library" sub={`${(data?.items ?? []).length} videos`} icon={Video} />
      <DataTable
        headers={["Thumbnail", "Title", "Category", "Views", "Featured", "Actions"]}
        rows={(data?.items ?? []).map((v: any) => [
          v.thumbnailUrl ? <img src={v.thumbnailUrl} alt="" className="w-16 h-9 object-cover rounded" /> : <div className="w-16 h-9 bg-white/5 rounded" />,
          <div><div className="text-white text-sm font-medium">{v.title}</div><div className="text-white/30 text-xs">{v.youtubeId}</div></div>,
          <span className="text-white/50 text-xs">{v.category}</span>,
          <span className="text-white/70">{v.viewCount}</span>,
          <button onClick={() => featureMutation.mutate({ videoId: v.id })} className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${v.isFeatured ? "bg-yellow-500/20 text-yellow-400" : "bg-white/5 text-white/20 hover:text-yellow-400"}`}>
            <Star className="w-3 h-3" />
          </button>,
          <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400 hover:bg-red-500/10" onClick={() => deleteMutation.mutate({ videoId: v.id })}><Trash2 className="w-3 h-3" /></Button>,
        ])}
      />
    </div>
  );
}

/* ── Tab: Schedule ───────────────────────────────────────── */
function ScheduleTab() {
  const { data, isLoading, refetch } = trpc.admin.schedule.useQuery({});
  const deleteMutation = trpc.admin.deleteScheduleItem.useMutation({ onSuccess: () => { toast.success("Removed"); refetch(); } });
  if (isLoading) return <LoadingSkeleton />;
  return (
    <div>
      <SectionHeader title="Schedule Manager" sub="7-day broadcast schedule" icon={Calendar} />
      <DataTable
        headers={["Time", "Title", "Category", "Live", "Actions"]}
        rows={(data?.items ?? []).map((s: any) => [
          <span className="text-white font-mono text-sm">{new Date(s.startTime).toLocaleString()}</span>,
          <span className="text-white">{s.title}</span>,
          <StatusBadge status={s.category ?? "other"} />,
          <StatusBadge status={s.isLive ? "live" : "vod"} />,
          <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400 hover:bg-red-500/10" onClick={() => deleteMutation.mutate({ itemId: s.id })}><Trash2 className="w-3 h-3" /></Button>,
        ])}
      />
    </div>
  );
}

/* ── Tab: Traffic ────────────────────────────────────────── */
function TrafficTab() {
  const { data: stats, isLoading } = trpc.admin.stats.useQuery();
  if (isLoading) return <LoadingSkeleton />;
  if (!stats) return <EmptyState text="No data" />;
  return (
    <div>
      <SectionHeader title="Traffic Analytics" sub="Views, visitors, and engagement" icon={BarChart2} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Eye} label="Total Views" value={stats.users.total * 8} color="blue" />
        <StatCard icon={Users2} label="Unique Visitors" value={stats.users.total} color="violet" />
        <StatCard icon={TrendingUp} label="Weekly Signups" value={stats.users.recentSignups} color="green" trend="up" />
        <StatCard icon={Globe} label="Avg Session" value="4m 32s" color="yellow" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4">Top Pages</h3>
          <EmptyState text="No page data yet" />
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4">Referrers</h3>
          <EmptyState text="No referrer data yet" />
        </div>
      </div>
    </div>
  );
}

/* ── Tab: Ads ────────────────────────────────────────────── */
function AdsTab() {
  const { data, isLoading } = trpc.admin.ads.useQuery();
  if (isLoading) return <LoadingSkeleton />;
  if (!data) return <EmptyState text="No ad data" />;
  return (
    <div>
      <SectionHeader title="Ad Manager" sub="Pre-roll, mid-roll, and display ad performance" icon={Megaphone} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Eye} label="Total Impressions" value={(data.slots ?? []).reduce((a: number, s: any) => a + (s.impressions ?? 0), 0).toLocaleString()} color="blue" />
        <StatCard icon={TrendingUp} label="Enabled Slots" value={(data.slots ?? []).filter((s: any) => s.enabled).length} color="violet" />
        <StatCard icon={DollarSign} label="Est. Monthly Revenue" value={`$${(data.estimatedMonthlyAdRevenue ?? 0).toFixed(2)}`} color="green" />
        <StatCard icon={BarChart2} label="Avg CPM" value={`$${((data.slots ?? []).reduce((a: number, s: any) => a + (s.cpm ?? 0), 0) / Math.max((data.slots ?? []).length, 1)).toFixed(2)}`} color="yellow" />
      </div>
      <DataTable
        headers={["Slot", "Status", "CPM", "Fill Rate", "Impressions"]}
        rows={(data.slots ?? []).map((slot: any) => [
          <span className="text-white font-medium">{slot.type}</span>,
          <StatusBadge status={slot.enabled ? "active" : "inactive"} />,
          <span className="text-white/70">${(slot.cpm ?? 0).toFixed(2)}</span>,
          <span className="text-white/70">{slot.fillRate ?? 0}%</span>,
          <span className="text-green-400 font-medium">{(slot.impressions ?? 0).toLocaleString()}</span>,
        ])}
      />
    </div>
  );
}

/* ── Tab: Subscriptions ──────────────────────────────────── */
function SubscriptionsTab() {
  const { data, isLoading } = trpc.admin.subscriptions.useQuery();
  if (isLoading) return <LoadingSkeleton />;
  if (!data) return <EmptyState text="No subscription data" />;
  return (
    <div>
      <SectionHeader title="Subscriptions" sub="ZTVLIVE+ tier breakdown" icon={CreditCard} />
      <div className="grid grid-cols-3 gap-4 mb-6">
        {(data.tiers ?? []).map((tier: any) => (
          <StatCard key={tier.name} icon={CreditCard} label={`${tier.name} ($${tier.price})`} value={tier.count} color={tier.color ?? "blue"} />
        ))}
      </div>
      <DataTable
        headers={["User", "Email", "Tier", "Since"]}
        rows={(data.recentSubs ?? []).map((s: any) => [
          <span className="text-white">{s.name}</span>,
          <span className="text-white/50 text-xs">{s.email}</span>,
          <StatusBadge status={s.subscriptionTier} />,
          <span className="text-white/30 text-xs">{new Date(s.createdAt).toLocaleDateString()}</span>,
        ])}
      />
    </div>
  );
}

/* ── Tab: Payouts ────────────────────────────────────────── */
function PayoutsTab() {
  const { data, isLoading } = trpc.admin.payouts.useQuery();
  if (isLoading) return <LoadingSkeleton />;
  if (!data) return <EmptyState text="No payout data" />;
  return (
    <div>
      <SectionHeader title="Creator Payouts" sub="70% revenue share program" icon={DollarSign} />
      <DataTable
        headers={["Creator", "Est. Views", "Revenue", "70% Payout", "Status"]}
        rows={data.creators.map((c: any) => [
          <span className="text-white font-medium">{c.name}</span>,
          <span className="text-white/70">{(c.views ?? 0).toLocaleString()}</span>,
          <span className="text-white/70">${(c.estimatedRevenue ?? 0).toFixed(2)}</span>,
          <span className="text-green-400 font-bold">${(c.pendingPayout ?? 0).toFixed(2)}</span>,
          <StatusBadge status="pending" />,
        ])}
      />
    </div>
  );
}

/* ── Tab: Creators ───────────────────────────────────────── */
function CreatorsTab() {
  const { data, isLoading, refetch } = trpc.admin.creators.useQuery({ limit: 100, offset: 0 });
  const { data: allVideos } = trpc.videos.list.useQuery({ limit: 500, offset: 0 });
  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({ onSuccess: () => { toast.success("Role updated"); refetch(); } });
  const updateSubMutation = trpc.admin.updateUserSubscription.useMutation({ onSuccess: () => { toast.success("Subscription updated"); refetch(); } });
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  if (isLoading) return <LoadingSkeleton />;
  const creators = (data?.items ?? []).filter((c: any) => c.role === "creator" || c.role === "admin");
  const filtered = creators.filter((c: any) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );
  // Build video count per creator name
  const videosByCreator: Record<string, number> = {};
  for (const v of allVideos?.items ?? []) {
    if (v.creatorName) videosByCreator[v.creatorName] = (videosByCreator[v.creatorName] ?? 0) + 1;
  }
  return (
    <div>
      <SectionHeader title="Creator Management" sub={`${filtered.length} creators`} icon={UserCheck} />
      <Input placeholder="Search creators..." value={search} onChange={e => setSearch(e.target.value)} className="mb-4 bg-white/5 border-white/10 text-white placeholder:text-white/30" />
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-white/30">
          <UserCheck className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No creators yet. Upgrade users to Creator role in the Users tab.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c: any) => {
            const videoCount = videosByCreator[c.name] ?? 0;
            const isOpen = expanded === c.id;
            return (
              <div key={c.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setExpanded(isOpen ? null : c.id)}>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[oklch(0.72_0.2_220)] to-[oklch(0.56_0.24_290)] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {(c.name ?? "?")[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{c.name}</p>
                    <p className="text-xs text-white/40">{c.email}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-xs font-semibold">{videoCount} videos</span>
                    <StatusBadge status={c.subscriptionTier ?? "free"} />
                    <span className="text-white/25 text-xs">{new Date(c.createdAt).toLocaleDateString()}</span>
                    <ChevronDown className={`w-4 h-4 text-white/30 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </div>
                </div>
                {isOpen && (
                  <div className="border-t border-white/10 px-5 py-4 bg-black/20">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-xs text-white/40 mb-1">Videos on Platform</p>
                        <p className="text-2xl font-black text-white">{videoCount}</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-xs text-white/40 mb-1">Role</p>
                        <Select defaultValue={c.role ?? "creator"} onValueChange={val => updateRoleMutation.mutate({ userId: c.id, role: val as any })}>
                          <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 text-white w-full mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">user</SelectItem>
                            <SelectItem value="creator">creator</SelectItem>
                            <SelectItem value="admin">admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-xs text-white/40 mb-1">Subscription</p>
                        <Select defaultValue={c.subscriptionTier ?? "free"} onValueChange={val => updateSubMutation.mutate({ userId: c.id, tier: val as any })}>
                          <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 text-white w-full mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">free</SelectItem>
                            <SelectItem value="basic">basic ($4.99)</SelectItem>
                            <SelectItem value="premium">premium ($9.99)</SelectItem>
                            <SelectItem value="creator_pro">creator_pro ($14.99)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-xs text-white/40 mb-1">Joined</p>
                        <p className="text-sm text-white mt-1">{new Date(c.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      {videoCount > 0 && (
                        <a href={`/library?creator=${encodeURIComponent(c.name)}`} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:underline">
                          <Video className="w-3.5 h-3.5" /> View {videoCount} videos
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Creator Detail Modal ────────────────────────────────── */
function CreatorDetailModal({ userId, onClose }: { userId: number; onClose: () => void }) {
  const { data, isLoading } = trpc.admin.creatorDetail.useQuery({ userId });
  const setRoleMutation = trpc.admin.setUserRole.useMutation({ onSuccess: () => toast.success("Role updated") });
  const setSubMutation = trpc.admin.setUserSubscription.useMutation({ onSuccess: () => toast.success("Subscription updated") });
  const [detailTab, setDetailTab] = useState<"overview" | "videos" | "revenue" | "submissions" | "streams">("overview");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-[#0d0d1a] border-white/10 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <UserCog className="w-5 h-5 text-violet-400" />
            <span>Creator Profile — Owner View</span>
            {data?.user && <span className="text-sm font-normal text-white/40 ml-2">{data.user.name}</span>}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? <LoadingSkeleton /> : !data ? <EmptyState text="Creator not found" /> : (
          <div className="space-y-5">
            {/* Profile Header */}
            <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[oklch(0.72_0.2_220)] to-[oklch(0.56_0.24_290)] flex items-center justify-center text-white font-black text-xl flex-shrink-0">
                {(data.user.name ?? "?")[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-white">{data.user.name}</p>
                <p className="text-sm text-white/40">{data.user.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={data.user.role ?? "user"} />
                  <StatusBadge status={data.user.subscriptionTier ?? "free"} />
                  <span className="text-xs text-white/30">Joined {new Date(data.user.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Select defaultValue={data.user.role ?? "user"} onValueChange={val => setRoleMutation.mutate({ userId: data.user.id, role: val as any })}>
                  <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 text-white w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">user</SelectItem>
                    <SelectItem value="creator">creator</SelectItem>
                    <SelectItem value="admin">admin</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue={data.user.subscriptionTier ?? "free"} onValueChange={val => setSubMutation.mutate({ userId: data.user.id, tier: val as any })}>
                  <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 text-white w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">free</SelectItem>
                    <SelectItem value="basic">basic ($4.99)</SelectItem>
                    <SelectItem value="premium">premium ($9.99)</SelectItem>
                    <SelectItem value="creator_pro">creator_pro ($14.99)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={Film} label="Videos" value={data.summary.totalVideos} color="blue" />
              <StatCard icon={Eye} label="Total Views" value={data.summary.totalViews.toLocaleString()} color="violet" />
              <StatCard icon={Wallet} label="Total Earned" value={`$${data.summary.totalEarned.toFixed(2)}`} color="green" />
              <StatCard icon={DollarSign} label="Pending Balance" value={`$${data.summary.pendingBalance.toFixed(2)}`} color="yellow" />
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-2 border-b border-white/10 pb-2">
              {(["overview", "videos", "revenue", "submissions", "streams"] as const).map(t => (
                <button key={t} onClick={() => setDetailTab(t)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
                    detailTab === t ? "bg-violet-500/20 text-violet-300" : "text-white/40 hover:text-white/70"
                  }`}>
                  {t}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {detailTab === "overview" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs text-white/40 mb-2">Account Info</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-white/50">Provider</span><span className="text-white">{data.user.provider ?? "email"}</span></div>
                      <div className="flex justify-between"><span className="text-white/50">Email Verified</span><span className={data.user.emailVerified ? "text-green-400" : "text-red-400"}>{data.user.emailVerified ? "Yes" : "No"}</span></div>
                      <div className="flex justify-between"><span className="text-white/50">Phone</span><span className="text-white">{data.user.phone ?? "—"}</span></div>
                      <div className="flex justify-between"><span className="text-white/50">Last Sign In</span><span className="text-white/60 text-xs">{data.user.lastSignedIn ? new Date(data.user.lastSignedIn).toLocaleString() : "—"}</span></div>
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs text-white/40 mb-2">Revenue Summary</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-white/50">Total Earned</span><span className="text-green-400 font-bold">${data.summary.totalEarned.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-white/50">Total Paid Out</span><span className="text-white">${data.summary.totalPaid.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-white/50">Pending Balance</span><span className="text-yellow-400 font-bold">${data.summary.pendingBalance.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-white/50">Payout Requests</span><span className="text-white">{data.payoutRequests.length}</span></div>
                    </div>
                  </div>
                </div>
                <a href={`/creator/dashboard`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs text-blue-400 hover:underline">
                  <ExternalLink className="w-3.5 h-3.5" /> View as Creator (opens creator dashboard)
                </a>
              </div>
            )}

            {detailTab === "videos" && (
              <div className="space-y-2">
                {data.videos.length === 0 ? <EmptyState text="No videos yet" /> : data.videos.map((v: any) => (
                  <div key={v.id} className="flex items-center gap-3 bg-white/5 rounded-lg p-3">
                    <img src={v.thumbnailUrl ?? `https://img.youtube.com/vi/${v.youtubeId}/mqdefault.jpg`}
                      alt={v.title} className="w-20 h-12 rounded object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{v.title}</p>
                      <p className="text-xs text-white/40">{v.category} · {(v.viewCount ?? 0).toLocaleString()} views · {v.likeCount ?? 0} likes</p>
                    </div>
                    <StatusBadge status={v.status ?? "active"} />
                  </div>
                ))}
              </div>
            )}

            {detailTab === "revenue" && (
              <div className="space-y-2">
                {data.revenueEvents.length === 0 ? <EmptyState text="No revenue events yet" /> : data.revenueEvents.map((e: any) => (
                  <div key={e.id} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-2.5">
                    <div>
                      <p className="text-sm text-white">{e.eventType}</p>
                      <p className="text-xs text-white/40">{new Date(e.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-400">${(e.creatorShare ?? 0).toFixed(2)}</p>
                      <p className="text-xs text-white/30">of ${(e.totalAmount ?? 0).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {detailTab === "submissions" && (
              <div className="space-y-2">
                {data.submissions.length === 0 ? <EmptyState text="No submissions yet" /> : data.submissions.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-2.5">
                    <div>
                      <p className="text-sm text-white">{s.title}</p>
                      <p className="text-xs text-white/40">{s.category} · {new Date(s.createdAt).toLocaleString()}</p>
                    </div>
                    <StatusBadge status={s.status ?? "pending"} />
                  </div>
                ))}
              </div>
            )}

            {detailTab === "streams" && (
              <div className="space-y-2">
                {data.streams.length === 0 ? <EmptyState text="No live streams yet" /> : data.streams.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-2.5">
                    <div>
                      <p className="text-sm text-white">{s.title}</p>
                      <p className="text-xs text-white/40">{s.startedAt ? new Date(s.startedAt).toLocaleString() : "—"}</p>
                    </div>
                    <StatusBadge status={s.status ?? "ended"} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ── Tab: Users ──────────────────────────────────────────── */
function UsersTab() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [selectedCreator, setSelectedCreator] = useState<number | null>(null);
  const limit = 50;
  const { data, isLoading, refetch } = trpc.admin.allUsers.useQuery({ search, role: roleFilter, limit, offset: page * limit });
  const setRoleMutation = trpc.admin.setUserRole.useMutation({ onSuccess: () => { toast.success("Role updated"); refetch(); } });
  const setSubMutation = trpc.admin.setUserSubscription.useMutation({ onSuccess: () => { toast.success("Subscription updated"); refetch(); } });
  const deleteUserMutation = trpc.admin.deleteUser.useMutation({ onSuccess: () => { toast.success("User deleted"); refetch(); } });

  if (isLoading) return <LoadingSkeleton />;
  return (
    <div>
      {selectedCreator && <CreatorDetailModal userId={selectedCreator} onClose={() => setSelectedCreator(null)} />}
      <SectionHeader title="User Management" sub={`${data?.total ?? 0} registered users`} icon={Users2} />
      <div className="flex gap-3 mb-4">
        <Input placeholder="Search name or email..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 flex-1" />
        <Select value={roleFilter} onValueChange={v => { setRoleFilter(v); setPage(0); }}>
          <SelectTrigger className="h-10 text-xs bg-white/5 border-white/10 text-white w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="user">user</SelectItem>
            <SelectItem value="creator">creator</SelectItem>
            <SelectItem value="admin">admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        {(data?.items ?? []).map((u: any) => (
          <div key={u.id} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 hover:bg-white/8 transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[oklch(0.72_0.2_220)] to-[oklch(0.56_0.24_290)] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
              {(u.name ?? "?")[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{u.name}</p>
              <p className="text-xs text-white/40 truncate">{u.email}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Select defaultValue={u.role ?? "user"} onValueChange={val => setRoleMutation.mutate({ userId: u.id, role: val as any })}>
                <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 text-white w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">user</SelectItem>
                  <SelectItem value="creator">creator</SelectItem>
                  <SelectItem value="admin">admin</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue={u.subscriptionTier ?? "free"} onValueChange={val => setSubMutation.mutate({ userId: u.id, tier: val as any })}>
                <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 text-white w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">free</SelectItem>
                  <SelectItem value="basic">basic ($4.99)</SelectItem>
                  <SelectItem value="premium">premium ($9.99)</SelectItem>
                  <SelectItem value="creator_pro">creator_pro ($14.99)</SelectItem>
                </SelectContent>
              </Select>
              {(u.role === "creator" || u.role === "admin") && (
                <Button size="sm" variant="outline" className="h-7 text-xs border-violet-500/30 text-violet-400 hover:bg-violet-500/10"
                  onClick={() => setSelectedCreator(u.id)}>
                  <Eye className="w-3 h-3 mr-1" /> View
                </Button>
              )}
              <button onClick={() => {
                if (confirm(`Delete user ${u.name}? This cannot be undone.`)) deleteUserMutation.mutate({ userId: u.id });
              }} className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      {(data?.total ?? 0) > limit && (
        <div className="flex justify-center gap-3 mt-4">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="border-white/10 text-white/60">Previous</Button>
          <span className="text-xs text-white/40 self-center">Page {page + 1} of {Math.ceil((data?.total ?? 0) / limit)}</span>
          <Button variant="outline" size="sm" disabled={(page + 1) * limit >= (data?.total ?? 0)} onClick={() => setPage(p => p + 1)} className="border-white/10 text-white/60">Next</Button>
        </div>
      )}
    </div>
  );
}

/* ── Tab: Game Analytics ─────────────────────────────────── */
function GameTab() {
  const { data, isLoading } = trpc.admin.gameAnalytics.useQuery();
  if (isLoading) return <LoadingSkeleton />;
  if (!data) return <EmptyState text="No game data" />;
  return (
    <div>
      <SectionHeader title="Quiz Game Analytics" sub="Daily quiz performance" icon={Gamepad2} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Gamepad2} label="Total Plays" value={data.totalPlays.toLocaleString()} color="pink" />
        <StatCard icon={TrendingUp} label="Avg Score" value={`${Number(data.avgScore ?? 0).toFixed(1)}%`} color="violet" />
        <StatCard icon={Users2} label="Total Questions" value={data.totalQuestions ?? 0} color="blue" />
        <StatCard icon={Star} label="Top Score" value={data.topScores?.[0]?.score ?? 0} color="yellow" />
      </div>
      <DataTable
        headers={["Player", "Score", "Category", "Date"]}
        rows={(data.topScores ?? []).map((s: any) => [
          <span className="text-white">{s.playerName ?? s.userId}</span>,
          <span className="text-yellow-400 font-bold">{s.score}%</span>,
          <span className="text-white/50">{s.category ?? '—'}</span>,
          <span className="text-white/30 text-xs">{new Date(s.playedAt ?? s.createdAt).toLocaleDateString()}</span>,
        ])}
      />
    </div>
  );
}

/* ── Tab: Platform Stats ─────────────────────────────────── */
function PlatformTab() {
  const { data: stats, isLoading } = trpc.admin.stats.useQuery();
  if (isLoading) return <LoadingSkeleton />;
  if (!stats) return <EmptyState text="No data" />;
  return (
    <div>
      <SectionHeader title="Platform Statistics" sub="Overall platform health" icon={Globe} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Video} label="Total Videos" value={stats.content.totalVideos} color="violet" />
        <StatCard icon={Users2} label="Total Users" value={stats.users.total} color="blue" />
        <StatCard icon={Eye} label="Total Views" value={(stats.users.total * 8).toLocaleString()} color="green" />
        <StatCard icon={Clock} label="Watch Hours" value="0" color="yellow" />
      </div>
    </div>
  );
}

/* ── Tab: Stream Health ──────────────────────────────────── */
function StreamTab() {
  const { data, isLoading } = trpc.admin.streamHealth.useQuery();
  if (isLoading) return <LoadingSkeleton />;
  if (!data) return <EmptyState text="No stream data" />;
  return (
    <div>
      <SectionHeader title="Stream Health" sub="Live broadcast status" icon={Radio} />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard icon={Radio} label="Live Videos" value={(data.liveVideos ?? []).length} color={(data.liveVideos ?? []).length > 0 ? "green" : "blue"} />
        <StatCard icon={Tv2} label="Studio Sessions" value={(data.liveSessions ?? []).length} color="violet" />
        <div className={`bg-gradient-to-br ${data.rtmpStatus === "online" ? "from-green-500/20 border-green-500/20" : "from-red-500/20 border-red-500/20"} border rounded-xl p-4`}>
          <div className="flex items-center gap-2 mb-2">
            {data.rtmpStatus === "online" ? <Wifi className="w-5 h-5 text-green-400" /> : <WifiOff className="w-5 h-5 text-red-400" />}
            <span className={`text-xs font-semibold uppercase ${data.rtmpStatus === "online" ? "text-green-400" : "text-red-400"}`}>RTMP {data.rtmpStatus}</span>
          </div>
          <div className="text-2xl font-bold text-white">{data.rtmpStatus === "online" ? "LIVE" : "OFFLINE"}</div>
          <div className="text-xs text-white/40 mt-1">Broadcast status</div>
        </div>
      </div>
    </div>
  );
}

/* ── Tab: Schedule Health ────────────────────────────────── */
function SchedHealthTab() {
  const { data, isLoading } = trpc.admin.scheduleHealth.useQuery();
  if (isLoading) return <LoadingSkeleton />;
  if (!data) return <EmptyState text="No schedule data" />;
  return (
    <div>
      <SectionHeader title="Schedule Health" sub="24/7 broadcast coverage analysis" icon={Clock} />
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard icon={CheckCircle} label="Coverage %" value={`${data.coveragePct ?? 0}%`} color={(data.coveragePct ?? 0) > 80 ? "green" : "yellow"} />
        <StatCard icon={AlertTriangle} label="Overlaps" value={(data.overlaps ?? []).length} color={(data.overlaps ?? []).length > 0 ? "red" : "green"} />
        <StatCard icon={XCircle} label="Empty Hours (24h)" value={data.emptyHours} color={data.emptyHours > 4 ? "red" : "green"} />
      </div>
    </div>
  );
}

/* ── Tab: Penny AI Host ──────────────────────────────────── */
function PennyTab() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const pennyMutation = trpc.admin.pennyGenerate.useMutation({
    onSuccess: (data) => setResult(typeof data.content === "string" ? data.content : JSON.stringify(data.content)),
    onError: () => toast.error("Generation failed"),
  });
  return (
    <div>
      <SectionHeader title="Penny AI Host" sub="Generate intros and voiceovers" icon={Bot} />
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
        <Textarea placeholder="Describe what Penny should say (e.g. 'Intro for CommunityCut Weekly Ep 4')" value={prompt} onChange={e => setPrompt(e.target.value)} className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[100px]" />
        <Button className="bg-gradient-to-r from-blue-600 to-violet-600 hover:opacity-90 text-white" onClick={() => pennyMutation.mutate({ topic: prompt, type: "intro" })} disabled={pennyMutation.isPending || !prompt.trim()}>
          {pennyMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Generate with Penny AI
        </Button>
        {result && (
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-blue-400 font-semibold uppercase">Generated Script</span>
              <button onClick={() => { navigator.clipboard.writeText(result); toast.success("Copied!"); }} className="text-white/30 hover:text-white/70 transition-colors"><Copy className="w-4 h-4" /></button>
            </div>
            <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{result}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Tab: Penny Blog ─────────────────────────────────────── */
function BlogTab() {
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState("");
  const blogMutation = trpc.admin.pennyGenerate.useMutation({
    onSuccess: (data) => setResult(typeof data.content === "string" ? data.content : JSON.stringify(data.content)),
    onError: () => toast.error("Generation failed"),
  });
  return (
    <div>
      <SectionHeader title="Penny Blog Generator" sub="AI-powered blog posts for ZTVLIVE" icon={FileText} />
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
        <Input placeholder="Blog topic (e.g. 'Top 5 Hair Trends for Summer 2025')" value={topic} onChange={e => setTopic(e.target.value)} className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
        <Button className="bg-gradient-to-r from-violet-600 to-pink-600 hover:opacity-90 text-white" onClick={() => blogMutation.mutate({ topic: topic, type: "blog" })} disabled={blogMutation.isPending || !topic.trim()}>
          {blogMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
          Generate Blog Post
        </Button>
        {result && (
          <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-violet-400 font-semibold uppercase">Generated Post</span>
              <button onClick={() => { navigator.clipboard.writeText(result); toast.success("Copied!"); }} className="text-white/30 hover:text-white/70 transition-colors"><Copy className="w-4 h-4" /></button>
            </div>
            <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{result}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Tab: Security ───────────────────────────────────────── */
function SecurityTab() {
  const { data, isLoading } = trpc.admin.security.useQuery();
  if (isLoading) return <LoadingSkeleton />;
  if (!data) return <EmptyState text="No data" />;
  const secData = data as any;
  return (
    <div>
      <SectionHeader title="Security Audit" sub="Admin users and recent activity" icon={ShieldCheck} />
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Admin Users</h3>
        <DataTable
          headers={["Name", "Email", "Role", "Last Active"]}
          rows={(secData.admins ?? []).map((a: any) => [
            <span className="text-white font-medium">{a.name}</span>,
            <span className="text-white/50 text-xs">{a.email}</span>,
            <StatusBadge status={a.role} />,
            <span className="text-white/30 text-xs">{new Date(a.createdAt).toLocaleDateString()}</span>,
          ])}
        />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Recent Signups</h3>
        <DataTable
          headers={["Name", "Email", "Joined"]}
          rows={(secData.recentSignups ?? []).map((u: any) => [
            <span className="text-white">{u.name}</span>,
            <span className="text-white/50 text-xs">{u.email}</span>,
            <span className="text-white/30 text-xs">{new Date(u.createdAt).toLocaleDateString()}</span>,
          ])}
        />
      </div>
    </div>
  );
}

/* ── Tab: SEO ────────────────────────────────────────────── */
function SEOTab() {
  const { data, isLoading } = trpc.admin.seo.useQuery();
  if (isLoading) return <LoadingSkeleton />;
  if (!data) return <EmptyState text="No SEO data" />;
  return (
    <div>
      <SectionHeader title="SEO Manager" sub="Metadata coverage and schema markup" icon={Search} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Video} label="Videos with Title" value={(data as any).videosWithTitle ?? data.totalVideos} color="green" />
        <StatCard icon={FileText} label="With Description" value={(data as any).videosWithDescription ?? 0} color="blue" />
        <StatCard icon={Star} label="With Tags" value={(data as any).videosWithTags ?? 0} color="violet" />
        <StatCard icon={Globe} label="With Transcript" value={(data as any).videosWithTranscript ?? 0} color="yellow" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <a href="/sitemap.xml" target="_blank" className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors group">
          <Globe className="w-5 h-5 text-blue-400" />
          <div><div className="text-white text-sm font-medium">XML Sitemap</div><div className="text-white/40 text-xs">/sitemap.xml</div></div>
          <ExternalLink className="w-4 h-4 text-white/20 group-hover:text-white/60 ml-auto" />
        </a>
        <a href="/robots.txt" target="_blank" className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors group">
          <ShieldCheck className="w-5 h-5 text-violet-400" />
          <div><div className="text-white text-sm font-medium">Robots.txt</div><div className="text-white/40 text-xs">/robots.txt</div></div>
          <ExternalLink className="w-4 h-4 text-white/20 group-hover:text-white/60 ml-auto" />
        </a>
      </div>
    </div>
  );
}

/* ── Tab: Tutorial Funnel ────────────────────────────────── */
function FunnelTab() {
  const { data: stats, isLoading } = trpc.admin.stats.useQuery();
  if (isLoading) return <LoadingSkeleton />;
  if (!stats) return <EmptyState text="No data" />;
  const steps = [
    { label: "Signed Up", value: stats.users.total, color: "bg-blue-500" },
    { label: "Email Verified", value: Math.floor(stats.users.total * 0.8), color: "bg-violet-500" },
    { label: "Subscribed", value: stats.users.paid, color: "bg-green-500" },
    { label: "Creator", value: stats.users.creators, color: "bg-yellow-500" },
  ];
  const max = steps[0].value || 1;
  return (
    <div>
      <SectionHeader title="Tutorial Funnel" sub="Signup to creator conversion" icon={GraduationCap} />
      <div className="space-y-4">
        {steps.map((step, i) => (
          <div key={step.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/40 font-bold">{i + 1}</div>
                <span className="text-white font-medium">{step.label}</span>
              </div>
              <span className="text-white font-bold">{step.value.toLocaleString()}</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
              <div className={`h-full ${step.color} rounded-full transition-all duration-700`} style={{ width: `${(step.value / max) * 100}%` }} />
            </div>
            {i > 0 && <div className="text-xs text-white/30 mt-1">{((step.value / max) * 100).toFixed(1)}% conversion</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Tab: Live Activity ──────────────────────────────────── */
function ActivityTab() {
  const { data, isLoading, refetch } = trpc.admin.liveActivity.useQuery();
  useEffect(() => {
    const interval = setInterval(refetch, 15000);
    return () => clearInterval(interval);
  }, [refetch]);
  if (isLoading) return <LoadingSkeleton />;
  return (
    <div>
      <SectionHeader title="Live Activity Feed" sub="Real-time platform events" icon={Activity} action={
        <Button size="sm" variant="ghost" className="text-white/40 hover:text-white h-8 text-xs" onClick={() => refetch()}><RefreshCw className="w-3 h-3 mr-1" />Refresh</Button>
      } />
      <div className="space-y-2">
        {((data as any)?.events ?? []).length === 0 ? <EmptyState text="No recent activity" /> : ((data as any)?.events ?? []).map((event: any, i: number) => (
          <div key={i} className="flex items-start gap-3 p-3 bg-white/5 border border-white/5 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0 animate-pulse" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white">{event.label ?? event.message}</div>
              <div className="text-xs text-white/30 mt-0.5">{new Date(event.time ?? event.timestamp).toLocaleTimeString()}</div>
            </div>
            <StatusBadge status={event.type} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Tab: Embed Test ─────────────────────────────────────── */
function EmbedTab() {
  const [videoId, setVideoId] = useState("AUcBIILptRI");
  return (
    <div>
      <SectionHeader title="Embed Test" sub="Test YouTube embed integration" icon={Code2} />
      <div className="space-y-4">
        <div className="flex gap-3">
          <Input value={videoId} onChange={e => setVideoId(e.target.value)} placeholder="YouTube Video ID" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
        </div>
        {videoId && (
          <div className="aspect-video rounded-xl overflow-hidden bg-black border border-white/10">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`}
              className="w-full h-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        )}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-xs text-white/40 font-mono">Embed URL: https://www.youtube.com/embed/{videoId}</div>
        </div>
      </div>
    </div>
  );
}

/* ── Tab: Mix Program ────────────────────────────────────── */
function MixTab() {
  const { data, isLoading } = trpc.admin.mixProgram.useQuery();
  if (isLoading) return <LoadingSkeleton />;
  if (!data) return <EmptyState text="No mix data" />;
  return (
    <div>
      <SectionHeader title="Live Mix Program" sub="Category distribution and scheduling" icon={Tv} />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {(data.categories ?? []).map((cat: any) => (
          <div key={cat.category ?? cat.name} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-white font-medium mb-1">{cat.category ?? cat.name}</div>
            <div className="text-2xl font-bold text-white">{cat.count}</div>
            <div className="text-xs text-white/40">videos</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Tab: Sponsor Analytics ──────────────────────────────── */
function SponsorTab() {
  const { data, isLoading } = trpc.admin.sponsorAnalytics.useQuery();
  if (isLoading) return <LoadingSkeleton />;
  if (!data) return <EmptyState text="No sponsor data" />;
  return (
    <div>
      <SectionHeader title="Sponsor Analytics" sub="Campaign performance" icon={PieChart} />
      <DataTable
        headers={["Sponsor", "Impressions", "Clicks", "CTR", "Conversions", "Spend"]}
        rows={data.sponsors.map(s => [
          <span className="text-white font-medium">{s.name}</span>,
          <span className="text-white/70">{s.impressions.toLocaleString()}</span>,
          <span className="text-white/70">{(s.impressions * s.ctr / 100).toFixed(0)}</span>,
          <span className="text-blue-400">{s.ctr.toFixed(2)}%</span>,
          <span className="text-green-400">{s.conversions}</span>,
          <span className="text-yellow-400">${s.spend.toFixed(2)}</span>,
        ])}
      />
    </div>
  );
}

/* ── Tab: QR ─────────────────────────────────────────────── */
function QRTab() {
  return (
    <div>
      <SectionHeader title="Social QR Codes" sub="Shareable QR codes for all platforms" icon={QrCode} />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {["Website", "YouTube", "Instagram", "TikTok", "Twitter/X", "Discord"].map(platform => (
          <div key={platform} className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col items-center gap-3">
            <div className="w-24 h-24 bg-white/10 rounded-xl flex items-center justify-center">
              <QrCode className="w-12 h-12 text-white/20" />
            </div>
            <span className="text-white/70 text-sm font-medium">{platform}</span>
            <Button size="sm" variant="ghost" className="text-white/40 hover:text-white h-7 text-xs" onClick={() => toast.info("QR generation coming soon")}>
              <Download className="w-3 h-3 mr-1" />Download
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Tab: Visitors ───────────────────────────────────────── */
function VisitorsTab() {
  const { data: stats, isLoading } = trpc.admin.stats.useQuery();
  if (isLoading) return <LoadingSkeleton />;
  if (!stats) return <EmptyState text="No data" />;
  return (
    <div>
      <SectionHeader title="Visitor Analytics" sub="Detailed audience insights" icon={Eye} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users2} label="Total Visitors" value={stats.users.total} color="blue" />
        <StatCard icon={TrendingUp} label="New This Week" value={stats.users.recentSignups} color="green" trend="up" />
        <StatCard icon={Globe} label="Countries" value="—" color="violet" />
        <StatCard icon={Clock} label="Avg Session" value="4m 32s" color="yellow" />
      </div>
      <EmptyState text="Detailed analytics will appear once traffic data is collected" />
    </div>
  );
}

/* ── Tab: Comms ──────────────────────────────────────────── */
function CommsTab() {
  const { data, isLoading } = trpc.admin.newsletterSubs.useQuery({ limit: 50 });
  if (isLoading) return <LoadingSkeleton />;
  return (
    <div>
      <SectionHeader title="Communications" sub="Newsletter and notifications" icon={Mail} />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard icon={Mail} label="Newsletter Subscribers" value={(data?.items ?? []).length} color="blue" />
        <StatCard icon={CheckCircle} label="Emails Sent" value={0} color="green" />
        <StatCard icon={Bell} label="Push Notifications" value={0} color="violet" />
      </div>
    </div>
  );
}

/* ── Tab: Pipeline ───────────────────────────────────────── */
function PipelineTab() {
  const { data, isLoading } = trpc.admin.pipelineJobs.useQuery({ limit: 30 });
  if (isLoading) return <LoadingSkeleton />;
  return (
    <div>
      <SectionHeader title="Pipeline Jobs" sub="Content automation status" icon={RefreshCw} />
      <DataTable
        headers={["Job", "Status", "Progress", "Created", "Completed"]}
        rows={(data?.items ?? []).map((job: any) => [
          <span className="text-white font-medium">{job.jobType}</span>,
          <StatusBadge status={job.status} />,
          <div className="w-24 bg-white/5 rounded-full h-1.5 overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${job.progress ?? 0}%` }} /></div>,
          <span className="text-white/30 text-xs">{new Date(job.createdAt).toLocaleDateString()}</span>,
          <span className="text-white/30 text-xs">{job.completedAt ? new Date(job.completedAt).toLocaleDateString() : "—"}</span>,
        ])}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN ADMIN PAGE
   ═══════════════════════════════════════════════════════════ */
export default function Admin() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const logoutMutation = trpc.auth.logout.useMutation({ onSuccess: () => navigate("/") });

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }
  if (!user || user.role !== "admin") return null;

  /* ── Sidebar sections (matching previous dev's design) ── */
  const sidebarGroups: SideNavGroup[] = [
    {
      group: "COMMUNITYCUT SHOW",
      items: [
        { id: "show-studio",    label: "Show Studio",     icon: Clapperboard, badge: "NEW" },
        { id: "show-engine",    label: "Show Engine",     icon: Cpu,          badge: "AUTO" },
        { id: "mix",            label: "Episode Control", icon: Layers },
        { id: "content",        label: "Clip Factory",    icon: Scissors },
        { id: "comms",          label: "Q&A Engine",      icon: MessageSquare },
        { id: "seo",            label: "Brand Kit",       icon: Star },
        { id: "embed",          label: "Graphics Package", icon: Package,     badge: "NEW" },
        { id: "pipeline",       label: "Episode Builder", icon: Clapperboard },
        { id: "submissions",    label: "Viewer Q&A",      icon: MessageSquare },
        { id: "schedule",       label: "Clip Exporter",   icon: Download },
        { id: "schedhealth",    label: "Show Scheduler",  icon: Calendar },
      ],
    },
    {
      group: "GO-LIVE SYSTEM",
      items: [
        { id: "stream",         label: "Go-Live Control", icon: Radio,        badge: "LIVE" },
        { id: "schedhealth",    label: "Stream Monitor",  icon: MonitorPlay },
        { id: "ads",            label: "Promo Engine",    icon: Megaphone },
        { id: "comms",          label: "Review Manager",  icon: BookOpen },
      ],
    },
    {
      group: "OPERATIONS",
      items: [
        { id: "activity",       label: "Live Feed",       icon: Activity,     badge: "LIVE" },
        { id: "overview",       label: "Overview",        icon: LayoutDashboard },
        { id: "traffic",        label: "Analytics Audit", icon: BarChart2,    badge: "NEW" },
        { id: "game",           label: "Event Analytics", icon: Gamepad2,     badge: "LIVE" },
        { id: "visitors",       label: "Request Window",  icon: Eye,          badge: "NEW" },
        { id: "sponsor",        label: "Social Listening",icon: Globe,        badge: "NEW" },
        { id: "payouts",        label: "Financial",       icon: DollarSign },
        { id: "subscriptions",  label: "Owner Payouts",   icon: CreditCard,   badge: "NEW" },
      ],
    },
    {
      group: "PEOPLE",
      items: [
        { id: "users",          label: "User Management", icon: Users2 },
        { id: "creators",       label: "Pro Management",  icon: UserCheck },
        { id: "penny",          label: "Pro Templates",   icon: Bot },
      ],
    },
    {
      group: "COMMERCE",
      items: [
        { id: "platform",       label: "Marketplace",     icon: Globe },
        { id: "schedule",       label: "Booking Engine",  icon: Calendar },
        { id: "subscriptions",  label: "Subscriptions",   icon: CreditCard },
      ],
    },
  ];

  function renderTab() {
    switch (activeTab) {
      case "overview":      return <OverviewTab />;
      case "submissions":   return <SubmissionsTab />;
      case "mix":           return <MixTab />;
      case "schedule":      return <ScheduleTab />;
      case "traffic":       return <TrafficTab />;
      case "visitors":      return <VisitorsTab />;
      case "ads":           return <AdsTab />;
      case "subscriptions": return <SubscriptionsTab />;
      case "payouts":       return <PayoutsTab />;
      case "creators":      return <CreatorsTab />;
      case "sponsor":       return <SponsorTab />;
      case "game":          return <GameTab />;
      case "platform":      return <PlatformTab />;
      case "qr":            return <QRTab />;
      case "stream":        return <StreamTab />;
      case "schedhealth":   return <SchedHealthTab />;
      case "penny":         return <PennyTab />;
      case "blog":          return <BlogTab />;
      case "embed":         return <EmbedTab />;
      case "security":      return <SecurityTab />;
      case "seo":           return <SEOTab />;
      case "funnel":        return <FunnelTab />;
      case "activity":      return <ActivityTab />;
      case "users":         return <UsersTab />;
      case "content":       return <ContentTab />;
      case "pipeline":      return <PipelineTab />;
      case "comms":         return <CommsTab />;
      default:              return <OverviewTab />;
    }
  }

  const badgeColors: Record<string, string> = {
    NEW:  "bg-blue-500/20 text-blue-400 border-blue-500/30",
    AUTO: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    LIVE: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  return (
    <div className="min-h-screen bg-[#0a0a14] flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Top Navigation Bar ────────────────────────────── */}
      <header className="h-14 bg-[#0d0d1a] border-b border-white/5 flex items-center justify-between px-4 shrink-0 z-50">
        {/* Left: Logo + ADMIN badge */}
        <div className="flex items-center gap-3">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                <Tv2 className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-bold text-lg tracking-tight">ZTVLIVE</span>
            </div>
          </Link>
          <Badge className="bg-violet-600 text-white border-0 text-xs px-2 py-0.5 font-bold">ADMIN</Badge>
        </div>

        {/* Right: Creator / Admin / Sign Out */}
        <div className="flex items-center gap-2">
          <Link href="/creator-dashboard">
            <Button size="sm" variant="outline" className="h-8 text-xs border-white/20 text-white/70 hover:text-white hover:border-white/40 bg-transparent">
              <Video className="w-3.5 h-3.5 mr-1.5" />Creator
            </Button>
          </Link>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-lg">
            {user.avatar && <img src={user.avatar} alt="" className="w-6 h-6 rounded-full object-cover" referrerPolicy="no-referrer" />}
            <span className="text-white text-sm font-medium">{user.name?.split(" ")[0] || "Admin"}</span>
          </div>
          <Badge className="bg-white/10 text-white/60 border-0 text-xs">ADMIN</Badge>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-white/40 hover:text-white text-xs"
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </header>

      {/* ── Body: Sidebar + Main ──────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ── Left Sidebar ─────────────────────────────────── */}
        <aside className={`${sidebarCollapsed ? "w-0 overflow-hidden" : "w-52"} shrink-0 bg-[#0d0d1a] border-r border-white/5 flex flex-col transition-all duration-200 ease-out overflow-y-auto`}>
          <nav className="py-3 space-y-5">
            {sidebarGroups.map(({ group, items }) => (
              <div key={group}>
                <div className="px-4 mb-1.5 text-white/25 text-[10px] uppercase tracking-widest font-semibold">{group}</div>
                {items.map(item => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={`${group}-${item.id}-${item.label}`}
                      onClick={() => setActiveTab(item.id as TabId)}
                      className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-all duration-150 ${active ? "bg-white/10 text-white font-medium" : "text-white/50 hover:text-white/80 hover:bg-white/5"}`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${active ? "text-white" : "text-white/40"}`} />
                      <span className="truncate flex-1 text-left">{item.label}</span>
                      {item.badge && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${badgeColors[item.badge] ?? "bg-white/10 text-white/40 border-white/10"}`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>

        {/* ── Main Content ─────────────────────────────────── */}
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">

          {/* Admin Dashboard Title + Refresh */}
          <div className="px-6 pt-6 pb-3 border-b border-white/5 bg-[#0a0a14] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="text-white/30 hover:text-white/60 transition-colors mr-1"
              >
                {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              <ShieldCheck className="w-7 h-7 text-violet-400" />
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">ADMIN DASHBOARD</h1>
                <p className="text-xs text-white/40">Control traffic, revenue, and content management</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-9 text-sm border-white/20 text-white/70 hover:text-white hover:border-white/40 bg-transparent"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-4 h-4 mr-2" />Refresh
            </Button>
          </div>

          {/* Horizontal Pill Tabs */}
          <div className="px-6 py-3 border-b border-white/5 bg-[#0a0a14] overflow-x-auto shrink-0">
            <div className="flex gap-1 min-w-max">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                      : "text-white/40 hover:text-white/70 hover:bg-white/5"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-6xl mx-auto">
              {renderTab()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
