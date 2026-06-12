import { useState, useEffect, useRef } from "react";
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
  Activity, ChevronRight, TrendingUp, Eye, Star, Trash2, Check, X,
  RefreshCw, Play, Plus, Video, Mail, Phone, Zap, Youtube, LogOut,
  Settings, Bell, Menu, ChevronLeft, ExternalLink, Copy, AlertTriangle,
  CheckCircle, XCircle, Loader2, ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────────── */
type TabId =
  | "overview" | "submissions" | "mix" | "schedule" | "traffic" | "visitors"
  | "ads" | "subscriptions" | "payouts" | "creators" | "sponsor" | "game"
  | "platform" | "qr" | "stream" | "schedhealth" | "penny" | "blog"
  | "embed" | "security" | "seo" | "funnel" | "activity"
  | "users" | "content" | "pipeline" | "comms";

interface NavItem { id: TabId; label: string; icon: any; group: string; badge?: number; }

/* ── Sidebar nav items ─────────────────────────────────────── */
const NAV_ITEMS: NavItem[] = [
  { id: "overview",     label: "Overview",          icon: LayoutDashboard, group: "Main" },
  { id: "activity",     label: "Live Activity",      icon: Activity,        group: "Main" },
  { id: "submissions",  label: "Submissions",        icon: Upload,          group: "Content" },
  { id: "content",      label: "Video Library",      icon: Video,           group: "Content" },
  { id: "mix",          label: "Mix Program",        icon: Tv,              group: "Content" },
  { id: "schedule",     label: "Schedule",           icon: Calendar,        group: "Content" },
  { id: "pipeline",     label: "Pipeline Jobs",      icon: RefreshCw,       group: "Content" },
  { id: "users",        label: "Users",              icon: Users2,          group: "Audience" },
  { id: "creators",     label: "Creators",           icon: UserCheck,       group: "Audience" },
  { id: "comms",        label: "Comms",              icon: Mail,            group: "Audience" },
  { id: "traffic",      label: "Traffic",            icon: BarChart2,       group: "Analytics" },
  { id: "visitors",     label: "Visitor Analytics",  icon: Eye,             group: "Analytics" },
  { id: "platform",     label: "Platform Stats",     icon: Globe,           group: "Analytics" },
  { id: "game",         label: "Game Analytics",     icon: Gamepad2,        group: "Analytics" },
  { id: "sponsor",      label: "Sponsor Analytics",  icon: PieChart,        group: "Analytics" },
  { id: "funnel",       label: "Tutorial Funnel",    icon: GraduationCap,   group: "Analytics" },
  { id: "ads",          label: "Ad Manager",         icon: Megaphone,       group: "Revenue" },
  { id: "subscriptions",label: "Subscriptions",      icon: CreditCard,      group: "Revenue" },
  { id: "payouts",      label: "Payouts",            icon: DollarSign,      group: "Revenue" },
  { id: "stream",       label: "Stream Health",      icon: Radio,           group: "Platform" },
  { id: "schedhealth",  label: "Schedule Health",    icon: Clock,           group: "Platform" },
  { id: "qr",           label: "Social QR",          icon: QrCode,          group: "Platform" },
  { id: "penny",        label: "Penny AI Host",      icon: Bot,             group: "AI Tools" },
  { id: "blog",         label: "Penny Blog",         icon: FileText,        group: "AI Tools" },
  { id: "embed",        label: "Embed Test",         icon: Code2,           group: "Dev Tools" },
  { id: "security",     label: "Security",           icon: ShieldCheck,     group: "Dev Tools" },
  { id: "seo",          label: "SEO Manager",        icon: Search,          group: "Dev Tools" },
];

const GROUPS = ["Main", "Content", "Audience", "Analytics", "Revenue", "Platform", "AI Tools", "Dev Tools"];

/* ── Shared UI helpers ─────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, color = "blue", trend }: { icon: any; label: string; value: string | number; sub?: string; color?: string; trend?: "up" | "down" | "flat" }) {
  const colors: Record<string, string> = {
    blue: "from-blue-500/20 to-blue-600/5 border-blue-500/20 text-blue-400",
    violet: "from-violet-500/20 to-violet-600/5 border-violet-500/20 text-violet-400",
    green: "from-green-500/20 to-green-600/5 border-green-500/20 text-green-400",
    yellow: "from-yellow-500/20 to-yellow-600/5 border-yellow-500/20 text-yellow-400",
    red: "from-red-500/20 to-red-600/5 border-red-500/20 text-red-400",
    pink: "from-pink-500/20 to-pink-600/5 border-pink-500/20 text-pink-400",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-4 flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        <Icon className={`w-5 h-5 ${colors[color].split(" ").pop()}`} />
        {trend === "up" && <ArrowUpRight className="w-4 h-4 text-green-400" />}
        {trend === "down" && <ArrowDownRight className="w-4 h-4 text-red-400" />}
        {trend === "flat" && <Minus className="w-4 h-4 text-white/30" />}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs font-medium text-white/60">{label}</div>
      {sub && <div className="text-xs text-white/30">{sub}</div>}
    </div>
  );
}

function SectionHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {sub && <p className="text-sm text-white/40 mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

function DataTable({ headers, rows, empty = "No data yet" }: { headers: string[]; rows: React.ReactNode[][]; empty?: string }) {
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
    approved: "bg-green-500/20 text-green-400 border-green-500/30",
    published: "bg-green-500/20 text-green-400 border-green-500/30",
    running: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    live: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    scheduled: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    failed: "bg-red-500/20 text-red-400 border-red-500/30",
    rejected: "bg-red-500/20 text-red-400 border-red-500/30",
    render_pending: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    uploading: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    inactive: "bg-white/10 text-white/40 border-white/10",
    free: "bg-white/10 text-white/40 border-white/10",
    basic: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    premium: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    creator_pro: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    new: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    contacted: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    applied: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    unresponsive: "bg-white/10 text-white/40 border-white/10",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[status] ?? "bg-white/10 text-white/40 border-white/10"}`}>{status}</span>;
}

/* ═══════════════════════════════════════════════════════════
   TAB PANELS
   ═══════════════════════════════════════════════════════════ */

/* ── Tab 1: Overview ─────────────────────────────────────── */
function OverviewTab() {
  const { data: stats, isLoading } = trpc.admin.stats.useQuery();
  if (isLoading) return <LoadingSkeleton />;
  if (!stats) return <EmptyState text="Could not load stats" />;
  return (
    <div className="space-y-8">
      <SectionHeader title="Platform Overview" sub="Real-time snapshot of ZTVLIVE" />

      {/* Launch Checklist */}
      <div className="bg-gradient-to-r from-blue-600/10 to-violet-600/10 border border-blue-500/20 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-3 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> Launch Checklist</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Videos in Library", done: stats.content.totalVideos > 0, value: stats.content.totalVideos },
            { label: "Schedule Items", done: stats.content.scheduleItems > 0, value: stats.content.scheduleItems },
            { label: "Newsletter Subs", done: stats.content.newsletterSubs > 0, value: stats.content.newsletterSubs },
            { label: "Paid Subscribers", done: stats.users.paid > 0, value: stats.users.paid },
          ].map(({ label, done, value }) => (
            <div key={label} className={`flex items-center gap-2 text-sm p-2 rounded-lg ${done ? "bg-green-500/10 text-green-400" : "bg-white/5 text-white/40"}`}>
              {done ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
              <span>{label}: <strong>{value}</strong></span>
            </div>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users2} label="Total Users" value={stats.users.total.toLocaleString()} sub={`+${stats.users.recentSignups} this week`} color="blue" trend="up" />
        <StatCard icon={Video} label="Videos" value={stats.content.totalVideos} sub={`${stats.content.featuredVideos} featured`} color="violet" />
        <StatCard icon={DollarSign} label="Est. MRR" value={`$${stats.revenue.estimatedMRR.toFixed(2)}`} sub={`$${stats.revenue.estimatedARR.toFixed(0)}/yr`} color="green" trend={stats.revenue.estimatedMRR > 0 ? "up" : "flat"} />
        <StatCard icon={Upload} label="Pending Submissions" value={stats.content.pendingSubmissions} sub="Awaiting review" color={stats.content.pendingSubmissions > 0 ? "yellow" : "blue"} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={UserCheck} label="Creators" value={stats.users.creators} sub="Active on platform" color="violet" />
        <StatCard icon={Gamepad2} label="Quiz Plays" value={stats.content.quizPlays.toLocaleString()} sub="Total game sessions" color="pink" />
        <StatCard icon={Mail} label="Newsletter" value={stats.content.newsletterSubs} sub="Email subscribers" color="blue" />
        <StatCard icon={RefreshCw} label="Pipeline Jobs" value={stats.pipeline.totalJobs} sub={`${stats.pipeline.failedJobs} failed`} color={stats.pipeline.failedJobs > 0 ? "red" : "green"} />
      </div>

      {/* Subscription Breakdown */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4 text-blue-400" /> Subscription Breakdown</h3>
        <div className="space-y-3">
          {[
            { tier: "Basic", price: 4.99, count: stats.users.basic, color: "bg-blue-500" },
            { tier: "Premium", price: 9.99, count: stats.users.premium, color: "bg-violet-500" },
            { tier: "Creator Pro", price: 14.99, count: stats.users.creatorPro, color: "bg-yellow-500" },
          ].map(({ tier, price, count, color }) => {
            const revenue = count * price;
            const maxRevenue = Math.max(stats.revenue.estimatedMRR, 1);
            return (
              <div key={tier} className="flex items-center gap-4">
                <div className="w-24 text-sm text-white/60">{tier}</div>
                <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                  <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${Math.min(100, (revenue / maxRevenue) * 100)}%` }} />
                </div>
                <div className="text-sm text-white w-20 text-right">${revenue.toFixed(2)}/mo</div>
                <div className="text-xs text-white/40 w-16 text-right">{count} users</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Videos */}
      {stats.topVideos.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-violet-400" /> Top Videos by Views</h3>
          <div className="space-y-2">
            {stats.topVideos.map((v, i) => (
              <div key={v.id} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/40 font-bold shrink-0">{i + 1}</div>
                {v.thumbnailUrl && <img src={v.thumbnailUrl} alt="" className="w-12 h-7 object-cover rounded shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium truncate">{v.title}</div>
                  <a href={`https://youtube.com/watch?v=${v.youtubeId}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">{v.youtubeId}</a>
                </div>
                <div className="text-sm text-white/60 shrink-0">{v.viewCount.toLocaleString()} views</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Tab 2: Submissions ──────────────────────────────────── */
function SubmissionsTab() {
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected" | "aired" | "all">("pending");
  const { data, isLoading, refetch } = trpc.admin.submissions.useQuery({ status: statusFilter });
  const approve = trpc.admin.approveSubmission.useMutation({ onSuccess: () => { toast.success("Submission approved"); refetch(); } });
  const reject = trpc.admin.rejectSubmission.useMutation({ onSuccess: () => { toast.success("Submission rejected"); refetch(); } });

  return (
    <div className="space-y-6">
      <SectionHeader title="Creator Submissions" sub="Review and moderate creator video submissions"
        action={
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-36 bg-white/5 border-white/10 text-white text-sm h-9"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#0d0d1a] border-white/10">
              {["pending", "approved", "rejected", "aired", "all"].map(s => <SelectItem key={s} value={s} className="text-white">{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />
      {isLoading ? <LoadingSkeleton /> : (
        <DataTable
          headers={["Creator", "Title", "Category", "Scheduled", "Status", "Actions"]}
          empty="No submissions in this status"
          rows={(data?.items ?? []).map(s => [
            <div key="creator">
              <div className="text-white text-xs font-medium">{s.userName || "Unknown"}</div>
              <div className="text-white/40 text-xs">{s.userEmail}</div>
            </div>,
            <div key="title" className="max-w-[200px]">
              <div className="text-white text-xs font-medium truncate">{s.title}</div>
              {s.youtubeId && <a href={`https://youtube.com/watch?v=${s.youtubeId}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs hover:underline flex items-center gap-1"><Youtube className="w-3 h-3" />{s.youtubeId}</a>}
            </div>,
            <span key="cat" className="text-white/60 text-xs capitalize">{s.category || "—"}</span>,
            <span key="sched" className="text-white/40 text-xs">{s.scheduledAt ? new Date(s.scheduledAt).toLocaleDateString() : "—"}</span>,
            <StatusBadge key="status" status={s.status} />,
            <div key="actions" className="flex gap-1">
              {s.status === "pending" && <>
                <Button size="sm" variant="ghost" onClick={() => approve.mutate({ slotId: s.id })} className="h-7 px-2 text-xs text-green-400 hover:bg-green-500/10"><Check className="w-3 h-3 mr-1" />Approve</Button>
                <Button size="sm" variant="ghost" onClick={() => reject.mutate({ slotId: s.id })} className="h-7 px-2 text-xs text-red-400 hover:bg-red-500/10"><X className="w-3 h-3 mr-1" />Reject</Button>
              </>}
            </div>,
          ])}
        />
      )}
      <div className="text-xs text-white/30">{data?.total ?? 0} total submissions</div>
    </div>
  );
}

/* ── Tab 3: Mix Program ──────────────────────────────────── */
function MixProgramTab() {
  const { data, isLoading } = trpc.admin.mixProgram.useQuery();
  return (
    <div className="space-y-6">
      <SectionHeader title="24/7 Mix Program" sub="Content rotation and category distribution" />
      {isLoading ? <LoadingSkeleton /> : (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><PieChart className="w-4 h-4 text-violet-400" /> Category Distribution</h3>
            <div className="space-y-2">
              {(data?.categories ?? []).map((c: any) => (
                <div key={c.category} className="flex items-center gap-3">
                  <div className="w-20 text-xs text-white/60 capitalize">{c.category}</div>
                  <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full" style={{ width: `${Math.min(100, (Number(c.count) / Math.max(...(data?.categories ?? []).map((x: any) => Number(x.count)), 1)) * 100)}%` }} />
                  </div>
                  <div className="text-xs text-white/40 w-8 text-right">{c.count}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-400" /> Upcoming Schedule</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {(data?.schedule ?? []).length === 0 ? (
                <p className="text-white/30 text-sm text-center py-8">No upcoming schedule items</p>
              ) : (data?.schedule ?? []).map((s: any) => (
                <div key={s.id} className="flex items-center gap-2 text-sm">
                  <div className="text-white/40 text-xs w-20 shrink-0">{new Date(s.startTime).toLocaleDateString()}</div>
                  <div className="text-white text-xs truncate flex-1">{s.title}</div>
                  {s.isLive && <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">LIVE</Badge>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Tab 4: Schedule ─────────────────────────────────────── */
function ScheduleTab() {
  const { data, isLoading, refetch } = trpc.admin.schedule.useQuery({});
  const deleteItem = trpc.admin.deleteScheduleItem.useMutation({ onSuccess: () => { toast.success("Item removed"); refetch(); } });
  const [showAdd, setShowAdd] = useState(false);
  const addItem = trpc.admin.addScheduleItem.useMutation({ onSuccess: () => { toast.success("Schedule item added"); refetch(); setShowAdd(false); } });
  const [form, setForm] = useState({ title: "", youtubeId: "", category: "other", startTime: "", endTime: "", isLive: false });

  return (
    <div className="space-y-6">
      <SectionHeader title="Program Schedule" sub="7-day TV schedule grid"
        action={<Button size="sm" onClick={() => setShowAdd(!showAdd)} className="bg-blue-600 hover:bg-blue-700 text-white h-9"><Plus className="w-4 h-4 mr-1" />Add Slot</Button>}
      />
      {showAdd && (
        <div className="bg-white/5 border border-blue-500/20 rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-white text-sm">New Schedule Slot</h3>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
            <Input placeholder="YouTube ID (optional)" value={form.youtubeId} onChange={e => setForm(f => ({ ...f, youtubeId: e.target.value }))} className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
            <Input type="datetime-local" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
            <Input type="datetime-local" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => addItem.mutate({ title: form.title, youtubeId: form.youtubeId || undefined, category: form.category, startTime: new Date(form.startTime).getTime(), endTime: new Date(form.endTime).getTime(), isLive: form.isLive })} disabled={!form.title || !form.startTime || !form.endTime} className="bg-blue-600 hover:bg-blue-700 text-white">Add</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)} className="text-white/40">Cancel</Button>
          </div>
        </div>
      )}
      {isLoading ? <LoadingSkeleton /> : (
        <DataTable
          headers={["Title", "Start", "End", "Category", "Live", "Actions"]}
          empty="No schedule items in this range"
          rows={(data?.items ?? []).map(s => [
            <div key="title">
              <div className="text-white text-xs font-medium">{s.title}</div>
              {s.youtubeId && <span className="text-blue-400 text-xs">{s.youtubeId}</span>}
            </div>,
            <span key="start" className="text-white/60 text-xs">{new Date(s.startTime).toLocaleString()}</span>,
            <span key="end" className="text-white/60 text-xs">{new Date(s.endTime).toLocaleString()}</span>,
            <span key="cat" className="text-white/60 text-xs capitalize">{s.category || "—"}</span>,
            s.isLive ? <Badge key="live" className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">LIVE</Badge> : <span key="live" className="text-white/20 text-xs">—</span>,
            <Button key="del" size="sm" variant="ghost" onClick={() => { if (confirm("Remove this slot?")) deleteItem.mutate({ itemId: s.id }); }} className="h-6 px-2 text-xs text-red-400 hover:bg-red-500/10"><Trash2 className="w-3 h-3" /></Button>,
          ])}
        />
      )}
    </div>
  );
}

/* ── Tab 5: Traffic ──────────────────────────────────────── */
function TrafficTab() {
  const { data, isLoading } = trpc.admin.traffic.useQuery();
  if (isLoading) return <LoadingSkeleton />;
  if (!data) return <EmptyState text="Traffic data unavailable" />;
  return (
    <div className="space-y-6">
      <SectionHeader title="Traffic Analytics" sub="Page views, referrers, and device breakdown" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={Eye} label="Total Views" value={data.totalViews.toLocaleString()} color="blue" />
        <StatCard icon={Users2} label="Total Users" value={data.totalUsers.toLocaleString()} color="violet" />
        <StatCard icon={TrendingUp} label="Weekly Signups" value={data.weeklySignups} color="green" trend="up" />
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4 text-sm">Top Pages</h3>
          <div className="space-y-2">
            {data.topPages.map((p: any) => (
              <div key={p.page} className="flex items-center gap-2">
                <div className="flex-1 text-xs text-white/60">{p.label}</div>
                <div className="text-xs text-white">{p.views.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4 text-sm">Devices</h3>
          <div className="space-y-2">
            {data.devices.map((d: any) => (
              <div key={d.device} className="flex items-center gap-3">
                <div className="w-16 text-xs text-white/60">{d.device}</div>
                <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full" style={{ width: `${d.pct}%` }} />
                </div>
                <div className="text-xs text-white/40 w-8">{d.pct}%</div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4 text-sm">Referrers</h3>
          <div className="space-y-2">
            {data.referrers.map((r: any) => (
              <div key={r.source} className="flex items-center gap-3">
                <div className="w-16 text-xs text-white/60">{r.source}</div>
                <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full" style={{ width: `${r.pct}%` }} />
                </div>
                <div className="text-xs text-white/40 w-8">{r.pct}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Tab 6: Visitor Analytics ────────────────────────────── */
function VisitorsTab() {
  const { data, isLoading } = trpc.admin.traffic.useQuery();
  if (isLoading) return <LoadingSkeleton />;
  if (!data) return <EmptyState text="Visitor data unavailable" />;
  return (
    <div className="space-y-6">
      <SectionHeader title="Visitor Analytics" sub="User sessions, retention, and engagement" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users2} label="Total Users" value={data.totalUsers.toLocaleString()} color="blue" />
        <StatCard icon={TrendingUp} label="New This Week" value={data.weeklySignups} color="green" trend="up" />
        <StatCard icon={Eye} label="Total Views" value={data.totalViews.toLocaleString()} color="violet" />
        <StatCard icon={Activity} label="Avg Session" value="8m 24s" sub="Estimated" color="pink" />
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-4 text-sm">Engagement by Page</h3>
        <div className="space-y-3">
          {data.topPages.map((p: any, i: number) => (
            <div key={p.page} className="flex items-center gap-4">
              <div className="w-6 text-xs text-white/30 font-bold">{i + 1}</div>
              <div className="flex-1 text-sm text-white/70">{p.label}</div>
              <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full" style={{ width: `${Math.min(100, (p.views / Math.max(...data.topPages.map((x: any) => x.views), 1)) * 100)}%` }} />
              </div>
              <div className="text-sm text-white w-20 text-right">{p.views.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Tab 7: Ads ──────────────────────────────────────────── */
function AdsTab() {
  const { data, isLoading } = trpc.admin.ads.useQuery();
  if (isLoading) return <LoadingSkeleton />;
  if (!data) return <EmptyState text="Ad data unavailable" />;
  return (
    <div className="space-y-6">
      <SectionHeader title="Ad Manager" sub="Ad slot configuration, fill rates, and estimated revenue" />
      <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
        <StatCard icon={DollarSign} label="Est. Monthly Ad Revenue" value={`$${data.estimatedMonthlyAdRevenue.toFixed(2)}`} color="green" />
        <StatCard icon={Megaphone} label="Active Ad Slots" value={data.slots.filter((s: any) => s.enabled).length} sub={`${data.slots.length} total slots`} color="blue" />
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/40 text-xs uppercase">
              <th className="text-left px-4 py-3">Ad Type</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Fill Rate</th>
              <th className="text-left px-4 py-3">CPM</th>
              <th className="text-left px-4 py-3">Impressions</th>
              <th className="text-left px-4 py-3">Est. Revenue</th>
            </tr>
          </thead>
          <tbody>
            {data.slots.map((s: any) => (
              <tr key={s.type} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-3 text-white font-medium">{s.type}</td>
                <td className="px-4 py-3"><StatusBadge status={s.enabled ? "live" : "inactive"} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-white/5 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${s.fillRate}%` }} />
                    </div>
                    <span className="text-white/60 text-xs">{s.fillRate}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-white/60">${s.cpm.toFixed(2)}</td>
                <td className="px-4 py-3 text-white/60">{s.impressions.toLocaleString()}</td>
                <td className="px-4 py-3 text-green-400">${((s.impressions / 1000) * s.cpm * (s.fillRate / 100)).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-white/30">Revenue estimates are based on current fill rates and CPM benchmarks. Actual revenue depends on your ad network configuration.</p>
    </div>
  );
}

/* ── Tab 8: Subscriptions ────────────────────────────────── */
function SubscriptionsTab() {
  const { data, isLoading } = trpc.admin.subscriptions.useQuery();
  if (isLoading) return <LoadingSkeleton />;
  if (!data) return <EmptyState text="Subscription data unavailable" />;
  return (
    <div className="space-y-6">
      <SectionHeader title="Subscriptions" sub="ZTVLIVE+ tier breakdown and recent subscribers"
        action={<a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer"><Button size="sm" variant="outline" className="border-white/10 text-white/60 hover:text-white h-9 text-xs"><ExternalLink className="w-3 h-3 mr-1" />Stripe Dashboard</Button></a>}
      />
      <div className="grid grid-cols-3 gap-4">
        {data.tiers.map((t: any) => (
          <div key={t.name} className={`bg-gradient-to-br ${t.color === "blue" ? "from-blue-500/20 to-blue-600/5 border-blue-500/20" : t.color === "violet" ? "from-violet-500/20 to-violet-600/5 border-violet-500/20" : "from-yellow-500/20 to-yellow-600/5 border-yellow-500/20"} border rounded-xl p-5`}>
            <div className="text-2xl font-bold text-white">{t.count}</div>
            <div className="text-sm text-white/60 mt-1">{t.name}</div>
            <div className="text-xs text-white/30 mt-1">${t.price}/mo · ${(t.count * t.price).toFixed(2)} MRR</div>
          </div>
        ))}
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-4 text-sm">Recent Subscribers</h3>
        <DataTable
          headers={["User", "Tier", "Status", "Joined"]}
          empty="No paid subscribers yet"
          rows={(data.recentSubs ?? []).map((s: any) => [
            <div key="user">
              <div className="text-white text-xs font-medium">{s.name || "—"}</div>
              <div className="text-white/40 text-xs">{s.email}</div>
            </div>,
            <StatusBadge key="tier" status={s.subscriptionTier} />,
            <StatusBadge key="status" status={s.subscriptionStatus || "inactive"} />,
            <span key="date" className="text-white/40 text-xs">{new Date(s.createdAt).toLocaleDateString()}</span>,
          ])}
        />
      </div>
    </div>
  );
}

/* ── Tab 9: Payouts ──────────────────────────────────────── */
function PayoutsTab() {
  const { data, isLoading } = trpc.admin.payouts.useQuery();
  if (isLoading) return <LoadingSkeleton />;
  if (!data) return <EmptyState text="Payout data unavailable" />;
  const totalPending = data.creators.reduce((acc: number, c: any) => acc + c.pendingPayout, 0);
  return (
    <div className="space-y-6">
      <SectionHeader title="Creator Payouts" sub="70% revenue share — pending payout queue" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={UserCheck} label="Active Creators" value={data.creators.length} color="violet" />
        <StatCard icon={DollarSign} label="Total Pending Payouts" value={`$${totalPending.toFixed(2)}`} color="green" />
        <StatCard icon={TrendingUp} label="Revenue Share" value="70%" sub="Creator cut" color="blue" />
      </div>
      <DataTable
        headers={["Creator", "Email", "Views", "Est. Revenue", "Pending Payout (70%)", "Actions"]}
        empty="No creators yet"
        rows={(data.creators ?? []).map((c: any) => [
          <span key="name" className="text-white text-xs font-medium">{c.name || "—"}</span>,
          <span key="email" className="text-white/40 text-xs">{c.email}</span>,
          <span key="views" className="text-white/60 text-xs">{c.views.toLocaleString()}</span>,
          <span key="rev" className="text-white/60 text-xs">${c.estimatedRevenue.toFixed(2)}</span>,
          <span key="payout" className="text-green-400 text-xs font-medium">${c.pendingPayout.toFixed(2)}</span>,
          <Button key="pay" size="sm" variant="ghost" onClick={() => toast.info("Payout processing coming soon")} className="h-6 px-2 text-xs text-blue-400 hover:bg-blue-500/10">Pay</Button>,
        ])}
      />
    </div>
  );
}

/* ── Tab 10: Creators ────────────────────────────────────── */
function CreatorsTab() {
  const [search, setSearch] = useState("");
  const { data, isLoading, refetch } = trpc.admin.creators.useQuery({ search: search || undefined });
  const updateRole = trpc.admin.updateUserRole.useMutation({ onSuccess: () => { toast.success("Role updated"); refetch(); } });
  return (
    <div className="space-y-6">
      <SectionHeader title="Creator Management" sub="All creators on the platform"
        action={<Input placeholder="Search creators…" value={search} onChange={e => setSearch(e.target.value)} className="w-48 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-9 text-sm" />}
      />
      {isLoading ? <LoadingSkeleton /> : (
        <DataTable
          headers={["Creator", "Email", "Tier", "Joined", "Actions"]}
          empty="No creators found"
          rows={(data?.items ?? []).map(c => [
            <div key="name" className="flex items-center gap-2">
              {c.avatar && <img src={c.avatar} alt="" className="w-7 h-7 rounded-full object-cover" referrerPolicy="no-referrer" />}
              <span className="text-white text-xs font-medium">{c.name || "—"}</span>
            </div>,
            <span key="email" className="text-white/40 text-xs">{c.email}</span>,
            <StatusBadge key="tier" status={c.subscriptionTier} />,
            <span key="date" className="text-white/40 text-xs">{new Date(c.createdAt).toLocaleDateString()}</span>,
            <Button key="demote" size="sm" variant="ghost" onClick={() => updateRole.mutate({ userId: c.id, role: "user" })} className="h-6 px-2 text-xs text-red-400 hover:bg-red-500/10">Demote</Button>,
          ])}
        />
      )}
      <div className="text-xs text-white/30">{data?.total ?? 0} creators</div>
    </div>
  );
}

/* ── Tab 11: Sponsor Analytics ───────────────────────────── */
function SponsorAnalyticsTab() {
  const { data, isLoading } = trpc.admin.sponsorAnalytics.useQuery();
  if (isLoading) return <LoadingSkeleton />;
  return (
    <div className="space-y-6">
      <SectionHeader title="Sponsor Analytics" sub="Per-sponsor impressions, CTR, and conversions" />
      <DataTable
        headers={["Sponsor", "Impressions", "CTR", "Conversions", "Spend"]}
        empty="No sponsor data"
        rows={(data?.sponsors ?? []).map((s: any) => [
          <span key="name" className="text-white font-medium text-sm">{s.name}</span>,
          <span key="imp" className="text-white/60 text-sm">{s.impressions.toLocaleString()}</span>,
          <span key="ctr" className="text-blue-400 text-sm">{s.ctr}%</span>,
          <span key="conv" className="text-green-400 text-sm">{s.conversions}</span>,
          <span key="spend" className="text-white/60 text-sm">${s.spend}</span>,
        ])}
      />
    </div>
  );
}

/* ── Tab 12: Game Analytics ──────────────────────────────── */
function GameAnalyticsTab() {
  const { data, isLoading } = trpc.admin.gameAnalytics.useQuery();
  if (isLoading) return <LoadingSkeleton />;
  if (!data) return <EmptyState text="Game data unavailable" />;
  return (
    <div className="space-y-6">
      <SectionHeader title="Quiz Game Analytics" sub="Play counts, scores, and category performance" />
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={Gamepad2} label="Total Plays" value={data.totalPlays.toLocaleString()} color="violet" />
        <StatCard icon={TrendingUp} label="Avg Score" value={data.avgScore} color="blue" />
        <StatCard icon={FileText} label="Total Questions" value={data.totalQuestions} color="green" />
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4 text-sm">Top Scores</h3>
          <div className="space-y-2">
            {data.topScores.map((s: any, i: number) => (
              <div key={s.id} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/40 font-bold">{i + 1}</div>
                <div className="flex-1 text-sm text-white">{s.userName || "Anonymous"}</div>
                <div className="text-sm text-yellow-400 font-bold">{s.score.toLocaleString()}</div>
              </div>
            ))}
            {data.topScores.length === 0 && <p className="text-white/30 text-sm text-center py-4">No scores yet</p>}
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4 text-sm">Questions by Category</h3>
          <div className="space-y-2">
            {data.categoryBreakdown.map((c: any) => (
              <div key={c.category} className="flex items-center gap-3">
                <div className="flex-1 text-xs text-white/60 capitalize">{c.category}</div>
                <div className="text-xs text-white">{c.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Tab 13: Platform Stats ──────────────────────────────── */
function PlatformStatsTab() {
  const { data, isLoading } = trpc.admin.platformStats.useQuery();
  if (isLoading) return <LoadingSkeleton />;
  if (!data) return <EmptyState text="Platform stats unavailable" />;
  return (
    <div className="space-y-6">
      <SectionHeader title="Platform Statistics" sub="Aggregate KPIs across all ZTVLIVE systems" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={Video} label="Total Videos" value={data.totalVideos.toLocaleString()} color="blue" />
        <StatCard icon={Eye} label="Total Views" value={data.totalViews.toLocaleString()} color="violet" />
        <StatCard icon={Users2} label="Total Users" value={data.totalUsers.toLocaleString()} color="green" />
        <StatCard icon={Calendar} label="Schedule Items" value={data.totalScheduleItems} color="yellow" />
        <StatCard icon={RefreshCw} label="Pipeline Jobs" value={data.totalPipelineJobs} color="blue" />
        <StatCard icon={Clock} label="Est. Watch Hours" value={`${data.estimatedWatchHours.toLocaleString()}h`} color="pink" />
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-4 text-sm">Views by Category</h3>
        <div className="space-y-3">
          {data.categoryBreakdown.map((c: any) => (
            <div key={c.category} className="flex items-center gap-4">
              <div className="w-20 text-xs text-white/60 capitalize">{c.category}</div>
              <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full" style={{ width: `${Math.min(100, (Number(c.views) / Math.max(...data.categoryBreakdown.map((x: any) => Number(x.views)), 1)) * 100)}%` }} />
              </div>
              <div className="text-xs text-white/40 w-16 text-right">{Number(c.views).toLocaleString()} views</div>
              <div className="text-xs text-white/30 w-8 text-right">{c.count} vids</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Tab 14: Social QR ───────────────────────────────────── */
function SocialQRTab() {
  const [url, setUrl] = useState("https://ztvlivestream.com");
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}&bgcolor=0d0d1a&color=6366f1`;
  return (
    <div className="space-y-6">
      <SectionHeader title="Social QR Generator" sub="Generate QR codes for cross-platform campaigns" />
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Target URL</label>
            <Input value={url} onChange={e => setUrl(e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="space-y-2">
            {["https://ztvlivestream.com", "https://ztvlivestream.com/live", "https://ztvlivestream.com/subscribe", "https://ztvlivestream.com/become-creator"].map(u => (
              <button key={u} onClick={() => setUrl(u)} className={`w-full text-left text-xs px-3 py-2 rounded-lg border transition-colors ${url === u ? "border-blue-500/50 bg-blue-500/10 text-blue-400" : "border-white/10 bg-white/5 text-white/40 hover:text-white"}`}>{u}</button>
            ))}
          </div>
          <Button onClick={() => { navigator.clipboard.writeText(qrUrl); toast.success("QR URL copied!"); }} variant="outline" className="border-white/10 text-white/60 hover:text-white w-full"><Copy className="w-4 h-4 mr-2" />Copy QR Image URL</Button>
        </div>
        <div className="flex items-center justify-center">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <img src={qrUrl} alt="QR Code" className="w-48 h-48 rounded-lg" />
            <p className="text-xs text-white/30 text-center mt-3 max-w-[200px] break-all">{url}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Tab 15: Stream Health ───────────────────────────────── */
function StreamHealthTab() {
  const { data, isLoading } = trpc.admin.streamHealth.useQuery();
  if (isLoading) return <LoadingSkeleton />;
  return (
    <div className="space-y-6">
      <SectionHeader title="Stream Health" sub="Live stream status, OBS connection, and bitrate monitoring" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Radio} label="RTMP Status" value={data?.rtmpStatus ?? "Idle"} color={data?.rtmpStatus === "live" ? "green" : "blue"} />
        <StatCard icon={Activity} label="Bitrate" value={data?.bitrate ? `${data.bitrate} kbps` : "N/A"} color="violet" />
        <StatCard icon={AlertTriangle} label="Dropped Frames" value={data?.droppedFrames ?? 0} color={data?.droppedFrames ? "red" : "green"} />
        <StatCard icon={Clock} label="Uptime" value={data?.uptime ?? "N/A"} color="blue" />
      </div>
      {(data?.liveVideos?.length ?? 0) > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4 text-sm flex items-center gap-2"><Radio className="w-4 h-4 text-red-400 animate-pulse" />Currently Live</h3>
          <div className="space-y-2">
            {data?.liveVideos?.map((v: any) => (
              <div key={v.id} className="flex items-center gap-3">
                {v.thumbnailUrl && <img src={v.thumbnailUrl} alt="" className="w-12 h-7 object-cover rounded" />}
                <div className="flex-1 text-sm text-white">{v.title}</div>
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">LIVE</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-3 text-sm">OBS / Restream Setup</h3>
        <p className="text-white/40 text-sm mb-3">Configure your OBS to stream to ZTVLIVE. Use these RTMP settings:</p>
        <div className="space-y-2">
          {[["Server", "rtmp://live.ztvlivestream.com/live"], ["Stream Key", "Your stream key from the Creator Dashboard"]].map(([k, v]) => (
            <div key={k} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
              <span className="text-xs text-white/40 w-20">{k}</span>
              <code className="text-xs text-blue-400 flex-1">{v}</code>
              <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(v); toast.success("Copied!"); }} className="h-6 px-2 text-white/30 hover:text-white"><Copy className="w-3 h-3" /></Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Tab 16: Schedule Health ─────────────────────────────── */
function ScheduleHealthTab() {
  const { data, isLoading } = trpc.admin.scheduleHealth.useQuery();
  if (isLoading) return <LoadingSkeleton />;
  if (!data) return <EmptyState text="Schedule health data unavailable" />;
  return (
    <div className="space-y-6">
      <SectionHeader title="Schedule Health" sub="Coverage gaps, overlapping slots, and next 7 days" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Calendar} label="Upcoming Items" value={data.upcomingItems} color="blue" />
        <StatCard icon={CheckCircle} label="24h Coverage" value={`${data.coveragePct}%`} color={data.coveragePct > 80 ? "green" : data.coveragePct > 50 ? "yellow" : "red"} />
        <StatCard icon={AlertTriangle} label="Overlapping Slots" value={data.overlaps.length} color={data.overlaps.length > 0 ? "red" : "green"} />
        <StatCard icon={Clock} label="Empty Hours (24h)" value={`${data.emptyHours}h`} color={data.emptyHours > 6 ? "yellow" : "green"} />
      </div>
      {data.overlaps.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <h3 className="font-semibold text-red-400 mb-2 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{data.overlaps.length} Overlapping Slot{data.overlaps.length > 1 ? "s" : ""} Detected</h3>
          <p className="text-white/50 text-xs">Go to the Schedule tab to resolve conflicts.</p>
        </div>
      )}
      {data.coveragePct < 100 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <h3 className="font-semibold text-yellow-400 mb-2 text-sm">Schedule Coverage: {data.coveragePct}%</h3>
          <p className="text-white/50 text-xs">Your 24-hour schedule has approximately {data.emptyHours} empty hours. Add more content to fill the gaps.</p>
        </div>
      )}
    </div>
  );
}

/* ── Tab 17: Penny AI Host ───────────────────────────────── */
function PennyTab() {
  const [type, setType] = useState<"intro" | "voiceover" | "blog">("intro");
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState("");
  const generate = trpc.admin.pennyGenerate.useMutation({
    onSuccess: (data) => setResult(typeof data.content === "string" ? data.content : ""),
    onError: () => toast.error("Generation failed"),
  });
  return (
    <div className="space-y-6">
      <SectionHeader title="Penny AI Host" sub="Generate intros, voiceovers, and scripts with AI" />
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Content Type</label>
            <div className="flex gap-2">
              {(["intro", "voiceover", "blog"] as const).map(t => (
                <button key={t} onClick={() => setType(t)} className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${type === t ? "border-blue-500/50 bg-blue-500/10 text-blue-400" : "border-white/10 bg-white/5 text-white/40 hover:text-white"}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Topic / Subject</label>
            <Textarea value={topic} onChange={e => setTopic(e.target.value)} placeholder={type === "intro" ? "e.g. New episode of CommunityCut Weekly" : type === "voiceover" ? "e.g. ZTVLIVE+ subscription benefits" : "e.g. Top 5 Black-owned streaming shows of 2025"} className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[80px]" />
          </div>
          <Button onClick={() => generate.mutate({ type, topic })} disabled={!topic || generate.isPending} className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white">
            {generate.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</> : <><Bot className="w-4 h-4 mr-2" />Generate with Penny</>}
          </Button>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 min-h-[200px]">
          {result ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Generated Content</h3>
                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(result); toast.success("Copied!"); }} className="h-7 px-2 text-xs text-white/40 hover:text-white"><Copy className="w-3 h-3 mr-1" />Copy</Button>
              </div>
              <pre className="text-sm text-white/80 whitespace-pre-wrap font-sans leading-relaxed">{result}</pre>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Bot className="w-12 h-12 text-white/10 mb-3" />
              <p className="text-white/30 text-sm">Penny is ready to generate content</p>
              <p className="text-white/20 text-xs mt-1">Enter a topic and click Generate</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Tab 18: Penny Blog ──────────────────────────────────── */
function PennyBlogTab() {
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState("");
  const generate = trpc.admin.pennyGenerate.useMutation({
    onSuccess: (data) => setResult(typeof data.content === "string" ? data.content : ""),
    onError: () => toast.error("Generation failed"),
  });
  return (
    <div className="space-y-6">
      <SectionHeader title="Penny Blog Writer" sub="AI-generated blog posts for ZTVLIVE" />
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Blog Topic</label>
            <Textarea value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Why ZTVLIVE is the future of Black entertainment streaming" className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[100px]" />
          </div>
          <Button onClick={() => generate.mutate({ type: "blog", topic })} disabled={!topic || generate.isPending} className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white">
            {generate.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Writing…</> : <><FileText className="w-4 h-4 mr-2" />Write Blog Post</>}
          </Button>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 min-h-[200px]">
          {result ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Blog Draft</h3>
                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(result); toast.success("Copied!"); }} className="h-7 px-2 text-xs text-white/40 hover:text-white"><Copy className="w-3 h-3 mr-1" />Copy</Button>
              </div>
              <div className="text-sm text-white/80 whitespace-pre-wrap font-sans leading-relaxed">{result}</div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <FileText className="w-12 h-12 text-white/10 mb-3" />
              <p className="text-white/30 text-sm">Blog drafts will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Tab 19: Embed Test ──────────────────────────────────── */
function EmbedTestTab() {
  const [videoId, setVideoId] = useState("AUcBIILptRI");
  const [embedUrl, setEmbedUrl] = useState(`https://www.youtube.com/embed/${videoId}`);
  return (
    <div className="space-y-6">
      <SectionHeader title="Embed Test Sandbox" sub="Test YouTube embed compatibility before publishing" />
      <div className="flex gap-3">
        <Input value={videoId} onChange={e => setVideoId(e.target.value)} placeholder="YouTube Video ID" className="bg-white/5 border-white/10 text-white placeholder:text-white/30 max-w-xs" />
        <Button onClick={() => setEmbedUrl(`https://www.youtube.com/embed/${videoId}`)} className="bg-blue-600 hover:bg-blue-700 text-white"><Play className="w-4 h-4 mr-2" />Load Embed</Button>
      </div>
      <div className="bg-black rounded-xl overflow-hidden aspect-video max-w-3xl">
        <iframe src={embedUrl} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Embed Test" />
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <p className="text-xs text-white/40 font-mono">Embed URL: {embedUrl}</p>
      </div>
    </div>
  );
}

/* ── Tab 20: Security ────────────────────────────────────── */
function SecurityTab() {
  const { data, isLoading } = trpc.admin.security.useQuery();
  if (isLoading) return <LoadingSkeleton />;
  if (!data) return <EmptyState text="Security data unavailable" />;
  return (
    <div className="space-y-6">
      <SectionHeader title="Security Center" sub="Admin access log, recent signups, and API key audit" />
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4 text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-green-400" />Admin Users</h3>
          <div className="space-y-3">
            {data.adminUsers.map((u: any) => (
              <div key={u.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-xs text-green-400 font-bold">{(u.name || u.email || "A")[0].toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium truncate">{u.name || u.email}</div>
                  <div className="text-xs text-white/40">{u.provider} · Last: {u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleDateString() : "Never"}</div>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">admin</Badge>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4 text-sm flex items-center gap-2"><Users2 className="w-4 h-4 text-blue-400" />Recent Signups</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.recentSignups.map((u: any) => (
              <div key={u.id} className="flex items-center gap-2 text-sm">
                <div className="flex-1 text-white/70 truncate">{u.name || u.email || "Anonymous"}</div>
                <div className="text-white/30 text-xs shrink-0">{u.provider}</div>
                <div className="text-white/30 text-xs shrink-0">{new Date(u.createdAt).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-3 text-sm">Environment & API Keys</h3>
        <div className="space-y-2">
          {[["Stripe", "STRIPE_SECRET_KEY"], ["Google OAuth", "GOOGLE_CLIENT_ID"], ["Twilio", "TWILIO_ACCOUNT_SID"], ["HeyGen", "HEYGEN_API_KEY"], ["YouTube", "YOUTUBE_CLIENT_ID"]].map(([name, key]) => (
            <div key={key} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
              <span className="text-xs text-white/60 w-24">{name}</span>
              <code className="text-xs text-white/30 flex-1">{key}</code>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Configured</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Tab 21: SEO ─────────────────────────────────────────── */
function SEOTab() {
  const { data, isLoading } = trpc.admin.seo.useQuery();
  if (isLoading) return <LoadingSkeleton />;
  if (!data) return <EmptyState text="SEO data unavailable" />;
  const descPct = data.totalVideos > 0 ? Math.round((data.videosWithDesc / data.totalVideos) * 100) : 0;
  const tagsPct = data.totalVideos > 0 ? Math.round((data.videosWithTags / data.totalVideos) * 100) : 0;
  return (
    <div className="space-y-6">
      <SectionHeader title="SEO Manager" sub="Meta tags, sitemap, structured data, and content coverage" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Video} label="Total Videos" value={data.totalVideos} color="blue" />
        <StatCard icon={FileText} label="With Description" value={`${descPct}%`} sub={`${data.videosWithDesc} videos`} color={descPct > 80 ? "green" : "yellow"} />
        <StatCard icon={Search} label="With Tags" value={`${tagsPct}%`} sub={`${data.videosWithTags} videos`} color={tagsPct > 80 ? "green" : "yellow"} />
        <StatCard icon={Globe} label="Schema Types" value={data.schemaTypes.length} color="violet" />
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4 text-sm">Schema Markup</h3>
          <div className="space-y-2">
            {data.schemaTypes.map((s: string) => (
              <div key={s} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                <span className="text-sm text-white/70">{s}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-4 text-sm">Technical SEO</h3>
          <div className="space-y-2">
            {[
              { label: "Sitemap", url: data.sitemapUrl, ok: true },
              { label: "Robots.txt", url: data.robotsTxtUrl, ok: true },
              { label: "Canonical URLs", url: null, ok: true },
              { label: "Lazy Loading", url: null, ok: true },
              { label: "WebP Images", url: null, ok: true },
            ].map(({ label, url, ok }) => (
              <div key={label} className="flex items-center gap-2">
                {ok ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0" /> : <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                <span className="text-sm text-white/70 flex-1">{label}</span>
                {url && <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline"><ExternalLink className="w-3 h-3" /></a>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Tab 22: Tutorial Funnel ─────────────────────────────── */
function TutorialFunnelTab() {
  const { data, isLoading } = trpc.admin.tutorialFunnel.useQuery();
  if (isLoading) return <LoadingSkeleton />;
  if (!data) return <EmptyState text="Funnel data unavailable" />;
  return (
    <div className="space-y-6">
      <SectionHeader title="Tutorial Funnel" sub="Onboarding completion rates by step" />
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="space-y-6">
          {data.steps.map((step: any, i: number) => (
            <div key={step.step} className="relative">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-xs text-white font-bold shrink-0">{i + 1}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white font-medium">{step.step}</span>
                    <span className="text-sm text-white/60">{step.count.toLocaleString()} users ({step.pct}%)</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-700" style={{ width: `${step.pct}%` }} />
                  </div>
                </div>
              </div>
              {i < data.steps.length - 1 && (
                <div className="ml-4 w-0.5 h-4 bg-white/10" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Tab 23: Live Activity ───────────────────────────────── */
function LiveActivityTab() {
  const { data, isLoading, refetch } = trpc.admin.liveActivity.useQuery();
  const colorMap: Record<string, string> = {
    green: "bg-green-500/20 text-green-400 border-green-500/30",
    blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    violet: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    red: "bg-red-500/20 text-red-400 border-red-500/30",
    pink: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  };
  const iconMap: Record<string, any> = { signup: Users2, pipeline: RefreshCw, submission: Upload, social: Globe };
  return (
    <div className="space-y-6">
      <SectionHeader title="Live Activity Feed" sub="Real-time platform events"
        action={<Button size="sm" variant="ghost" onClick={() => refetch()} className="text-white/40 hover:text-white h-9"><RefreshCw className="w-4 h-4 mr-1" />Refresh</Button>}
      />
      {isLoading ? <LoadingSkeleton /> : (
        <div className="space-y-2">
          {(data?.events ?? []).length === 0 ? (
            <EmptyState text="No recent activity" />
          ) : (data?.events ?? []).map((e: any, i: number) => {
            const Icon = iconMap[e.type] ?? Activity;
            return (
              <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-lg px-4 py-3 hover:bg-white/8 transition-colors">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${colorMap[e.color] ?? "bg-white/10 text-white/40"}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 text-sm text-white/70">{e.label}</div>
                <div className="text-xs text-white/30 shrink-0">{new Date(e.time).toLocaleTimeString()}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Users Tab ───────────────────────────────────────────── */
function UsersTab() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const { data, isLoading, refetch } = trpc.admin.users.useQuery({ search: search || undefined, role: roleFilter !== "all" ? roleFilter : undefined });
  const updateRole = trpc.admin.updateUserRole.useMutation({ onSuccess: () => { toast.success("Role updated"); refetch(); } });
  const updateSub = trpc.admin.updateUserSubscription.useMutation({ onSuccess: () => { toast.success("Subscription updated"); refetch(); } });
  return (
    <div className="space-y-6">
      <SectionHeader title="User Management" sub="All registered users, roles, and subscriptions"
        action={
          <div className="flex gap-2">
            <Input placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)} className="w-48 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-9 text-sm" />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-28 bg-white/5 border-white/10 text-white text-sm h-9"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#0d0d1a] border-white/10">
                {["all", "user", "creator", "admin"].map(r => <SelectItem key={r} value={r} className="text-white">{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
      />
      {isLoading ? <LoadingSkeleton /> : (
        <DataTable
          headers={["User", "Provider", "Role", "Subscription", "Joined", "Actions"]}
          empty="No users found"
          rows={(data?.items ?? []).map(u => [
            <div key="user" className="flex items-center gap-2">
              {u.avatar && <img src={u.avatar} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />}
              <div>
                <div className="text-white text-xs font-medium">{u.name || "—"}</div>
                <div className="text-white/40 text-xs">{u.email}</div>
              </div>
            </div>,
            <span key="prov" className="text-white/40 text-xs capitalize">{u.provider}</span>,
            <Select key="role" value={u.role} onValueChange={(role) => updateRole.mutate({ userId: u.id, role: role as any })}>
              <SelectTrigger className="w-24 h-7 text-xs bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#0d0d1a] border-white/10">
                {["user", "creator", "admin"].map(r => <SelectItem key={r} value={r} className="text-white text-xs">{r}</SelectItem>)}
              </SelectContent>
            </Select>,
            <Select key="sub" value={u.subscriptionTier} onValueChange={(tier) => updateSub.mutate({ userId: u.id, tier: tier as any })}>
              <SelectTrigger className="w-28 h-7 text-xs bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#0d0d1a] border-white/10">
                {["free", "basic", "premium", "creator_pro"].map(t => <SelectItem key={t} value={t} className="text-white text-xs">{t}</SelectItem>)}
              </SelectContent>
            </Select>,
            <span key="date" className="text-white/40 text-xs">{new Date(u.createdAt).toLocaleDateString()}</span>,
            <div key="actions" className="flex gap-1">
              {u.emailVerified ? <span title="Email verified"><CheckCircle className="w-4 h-4 text-green-400" /></span> : <span title="Not verified"><XCircle className="w-4 h-4 text-white/20" /></span>}
            </div>,
          ])}
        />
      )}
      <div className="text-xs text-white/30">{data?.total ?? 0} total users</div>
    </div>
  );
}

/* ── Content Tab ─────────────────────────────────────────── */
function ContentTab() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const { data, isLoading, refetch } = trpc.admin.videos.useQuery({ search: search || undefined, category: category !== "all" ? category : undefined });
  const setFeatured = trpc.admin.setFeaturedVideo.useMutation({ onSuccess: () => { toast.success("Featured video updated"); refetch(); } });
  const deleteVideo = trpc.admin.deleteVideo.useMutation({ onSuccess: () => { toast.success("Video deleted"); refetch(); } });
  const addVideo = trpc.admin.addVideo.useMutation({ onSuccess: () => { toast.success("Video added"); refetch(); setShowAdd(false); setForm({ youtubeId: "", title: "", category: "other", creatorName: "", isFeatured: false }); } });
  const [form, setForm] = useState({ youtubeId: "", title: "", category: "other", creatorName: "", isFeatured: false });

  return (
    <div className="space-y-6">
      <SectionHeader title="Video Library" sub="All videos in the ZTVLIVE catalog"
        action={
          <div className="flex gap-2">
            <Input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} className="w-40 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-9 text-sm" />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-28 bg-white/5 border-white/10 text-white text-sm h-9"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#0d0d1a] border-white/10">
                {["all", "live", "tech", "gaming", "sports", "movies", "podcasts", "news", "music", "other"].map(c => <SelectItem key={c} value={c} className="text-white text-xs">{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => setShowAdd(!showAdd)} className="bg-blue-600 hover:bg-blue-700 text-white h-9"><Plus className="w-4 h-4 mr-1" />Add Video</Button>
          </div>
        }
      />
      {showAdd && (
        <div className="bg-white/5 border border-blue-500/20 rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-white text-sm">Add YouTube Video</h3>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="YouTube ID (e.g. dQw4w9WgXcQ)" value={form.youtubeId} onChange={e => setForm(f => ({ ...f, youtubeId: e.target.value }))} className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
            <Input placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
            <Input placeholder="Creator Name (optional)" value={form.creatorName} onChange={e => setForm(f => ({ ...f, creatorName: e.target.value }))} className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#0d0d1a] border-white/10">
                {["live", "tech", "gaming", "sports", "movies", "podcasts", "news", "music", "other"].map(c => <SelectItem key={c} value={c} className="text-white">{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => addVideo.mutate({ youtubeId: form.youtubeId, title: form.title, category: form.category, creatorName: form.creatorName || undefined, isFeatured: form.isFeatured })} disabled={!form.youtubeId || !form.title} className="bg-blue-600 hover:bg-blue-700 text-white">Add Video</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)} className="text-white/40">Cancel</Button>
          </div>
        </div>
      )}
      {isLoading ? <LoadingSkeleton /> : (
        <DataTable
          headers={["Video", "Category", "Creator", "Views", "Featured", "Published", "Actions"]}
          empty="No videos found"
          rows={(data?.items ?? []).map(v => [
            <div key="vid" className="flex items-center gap-2">
              {v.thumbnailUrl && <img src={v.thumbnailUrl} alt="" className="w-12 h-7 object-cover rounded shrink-0" />}
              <div>
                <div className="font-medium text-white text-xs line-clamp-1 max-w-[180px]">{v.title}</div>
                <a href={`https://youtube.com/watch?v=${v.youtubeId}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs hover:underline">{v.youtubeId}</a>
              </div>
            </div>,
            <span key="cat" className="text-white/60 text-xs capitalize">{v.category}</span>,
            <span key="creator" className="text-white/60 text-xs">{v.creatorName || "ZTVLIVE"}</span>,
            <span key="views" className="text-white/60 text-xs">{v.viewCount.toLocaleString()}</span>,
            v.isFeatured ? <span key="feat" className="text-yellow-400 text-xs flex items-center gap-1"><Star className="w-3 h-3 fill-yellow-400" />Featured</span> : <span key="feat" className="text-white/20 text-xs">—</span>,
            <span key="pub" className="text-white/40 text-xs">{new Date(v.publishedAt).toLocaleDateString()}</span>,
            <div key="actions" className="flex gap-1">
              {!v.isFeatured && <Button size="sm" variant="ghost" onClick={() => setFeatured.mutate({ videoId: v.id })} className="h-6 px-2 text-xs text-yellow-400 hover:bg-yellow-500/10"><Star className="w-3 h-3 mr-1" />Feature</Button>}
              <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this video?")) deleteVideo.mutate({ videoId: v.id }); }} className="h-6 px-2 text-xs text-red-400 hover:bg-red-500/10"><Trash2 className="w-3 h-3" /></Button>
            </div>,
          ])}
        />
      )}
      <div className="text-xs text-white/30">{data?.total ?? 0} total videos</div>
    </div>
  );
}

/* ── Pipeline Tab ────────────────────────────────────────── */
function PipelineTab() {
  const { data, isLoading } = trpc.admin.pipelineJobs.useQuery({ limit: 30 });
  return (
    <div className="space-y-6">
      <SectionHeader title="Content Pipeline" sub="Zara Daily & Zoe Weekly automation jobs" />
      {isLoading ? <LoadingSkeleton /> : (
        <div className="space-y-3">
          {(data?.items ?? []).length === 0 ? (
            <EmptyState text="No pipeline jobs yet — first run fires at 9am MST daily" />
          ) : (data?.items ?? []).map((job: any) => (
            <div key={job.id} className={`bg-white/5 border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${job.status === "failed" ? "border-red-500/30" : job.status === "completed" ? "border-green-500/20" : "border-white/10"}`}>
              <div className="flex items-center gap-3 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${job.pipelineType === "zara-daily" ? "bg-blue-600/30 text-blue-400" : "bg-violet-600/30 text-violet-400"}`}>
                  {job.pipelineType === "zara-daily" ? "Z" : "ZO"}
                </div>
                <div>
                  <div className="font-medium text-white text-sm">{job.scriptTitle || `${job.pipelineType} — ${job.scheduledDate}`}</div>
                  <div className="text-white/40 text-xs">{job.scheduledDate} · {job.pipelineType}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={job.status} />
                {job.youtubeVideoId && <a href={`https://youtube.com/watch?v=${job.youtubeVideoId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-red-400 hover:underline"><Youtube className="w-3 h-3" />YouTube</a>}
                {job.brollCount ? <span className="text-xs text-white/30">{job.brollCount} b-rolls</span> : null}
              </div>
              {job.errorMessage && <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-2 py-1 w-full">{job.errorMessage}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Comms Tab ───────────────────────────────────────────── */
function CommsTab() {
  const { data: newsletterData } = trpc.admin.newsletterSubs.useQuery({ limit: 50 });
  const { data: smsData } = trpc.admin.smsSubs.useQuery({ limit: 50 });
  const { data: creatorsData } = trpc.admin.creatorProspects.useQuery({ limit: 50 });
  return (
    <div className="space-y-6">
      <SectionHeader title="Communications" sub="Newsletter, SMS opt-ins, and creator leads" />
      <div className="grid md:grid-cols-3 gap-6">
        {[
          { title: "Newsletter", icon: Mail, color: "text-blue-400", badge: newsletterData?.items.length ?? 0, items: (newsletterData?.items ?? []).map((s: any) => ({ primary: s.email, secondary: new Date(s.subscribedAt).toLocaleDateString() })) },
          { title: "SMS Opt-ins", icon: Phone, color: "text-green-400", badge: smsData?.items.length ?? 0, items: (smsData?.items ?? []).map((s: any) => ({ primary: s.phone, secondary: new Date(s.subscribedAt).toLocaleDateString() })) },
          { title: "Creator Leads", icon: Zap, color: "text-violet-400", badge: creatorsData?.total ?? 0, items: (creatorsData?.items ?? []).map((p: any) => ({ primary: p.displayName || p.handle, secondary: `${p.platform} · ${p.niche}` })) },
        ].map(({ title, icon: Icon, color, badge, items }) => (
          <div key={title} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div className={`flex items-center gap-2 font-semibold text-white text-sm`}><Icon className={`w-4 h-4 ${color}`} />{title}</div>
              <Badge className="bg-white/10 text-white/60 border-white/10">{badge}</Badge>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
              {items.length === 0 ? <div className="px-4 py-8 text-center text-white/30 text-sm">No entries yet</div> : items.map((item, i) => (
                <div key={i} className="px-4 py-2">
                  <div className="text-white/80 text-sm">{item.primary}</div>
                  <div className="text-white/30 text-xs">{item.secondary}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Shared Loading / Empty ──────────────────────────────── */
function LoadingSkeleton() {
  return <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />)}</div>;
}
function EmptyState({ text }: { text: string }) {
  return <div className="flex flex-col items-center justify-center py-20 text-white/30"><Activity className="w-10 h-10 mb-3 opacity-30" /><p className="text-sm">{text}</p></div>;
}

/* ═══════════════════════════════════════════════════════════
   MAIN ADMIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [, navigate] = useLocation();

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
          <p className="text-white/40 text-sm">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "admin") return null;

  const grouped = GROUPS.map(g => ({ group: g, items: NAV_ITEMS.filter(n => n.group === g) }));

  const renderTab = () => {
    switch (activeTab) {
      case "overview": return <OverviewTab />;
      case "submissions": return <SubmissionsTab />;
      case "mix": return <MixProgramTab />;
      case "schedule": return <ScheduleTab />;
      case "traffic": return <TrafficTab />;
      case "visitors": return <VisitorsTab />;
      case "ads": return <AdsTab />;
      case "subscriptions": return <SubscriptionsTab />;
      case "payouts": return <PayoutsTab />;
      case "creators": return <CreatorsTab />;
      case "sponsor": return <SponsorAnalyticsTab />;
      case "game": return <GameAnalyticsTab />;
      case "platform": return <PlatformStatsTab />;
      case "qr": return <SocialQRTab />;
      case "stream": return <StreamHealthTab />;
      case "schedhealth": return <ScheduleHealthTab />;
      case "penny": return <PennyTab />;
      case "blog": return <PennyBlogTab />;
      case "embed": return <EmbedTestTab />;
      case "security": return <SecurityTab />;
      case "seo": return <SEOTab />;
      case "funnel": return <TutorialFunnelTab />;
      case "activity": return <LiveActivityTab />;
      case "users": return <UsersTab />;
      case "content": return <ContentTab />;
      case "pipeline": return <PipelineTab />;
      case "comms": return <CommsTab />;
      default: return <OverviewTab />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a14] flex" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className={`${sidebarOpen ? "w-56" : "w-14"} shrink-0 bg-[#0d0d1a] border-r border-white/5 flex flex-col transition-all duration-200 ease-out overflow-hidden`}>
        {/* Logo */}
        <div className="flex items-center gap-2 px-3 py-4 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs shrink-0">Z</div>
          {sidebarOpen && <span className="text-white font-bold text-sm truncate">ZTVLIVE Admin</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-4 scrollbar-thin">
          {grouped.map(({ group, items }) => (
            <div key={group}>
              {sidebarOpen && <div className="px-3 mb-1 text-white/25 text-xs uppercase tracking-widest font-medium">{group}</div>}
              {items.map(item => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-all duration-150 rounded-lg mx-1 ${active ? "bg-blue-500/15 text-blue-400 font-medium" : "text-white/40 hover:text-white/80 hover:bg-white/5"}`}
                    style={{ width: "calc(100% - 8px)" }}
                    title={!sidebarOpen ? item.label : undefined}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${active ? "text-blue-400" : ""}`} />
                    {sidebarOpen && <span className="truncate">{item.label}</span>}
                    {sidebarOpen && item.badge ? <Badge className="ml-auto bg-red-500/20 text-red-400 border-red-500/30 text-xs px-1.5 py-0">{item.badge}</Badge> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User + collapse */}
        <div className="border-t border-white/5 p-3 space-y-2">
          {sidebarOpen && (
            <div className="flex items-center gap-2 px-1">
              {user.avatar && <img src={user.avatar} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white/70 font-medium truncate">{user.name?.split(" ")[0] || "Owner"}</div>
                <div className="text-xs text-white/30 truncate">{user.email}</div>
              </div>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-full flex items-center justify-center gap-2 py-1.5 text-white/30 hover:text-white/60 transition-colors text-xs">
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────── */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#0d0d1a]/50 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-white font-semibold text-sm">
              {NAV_ITEMS.find(n => n.id === activeTab)?.label ?? "Dashboard"}
            </h1>
            <ChevronRight className="w-4 h-4 text-white/20" />
            <span className="text-white/30 text-xs">ZTVLIVE Owner Panel</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button size="sm" variant="ghost" className="text-white/40 hover:text-white h-8 text-xs"><ExternalLink className="w-3.5 h-3.5 mr-1.5" />View Site</Button>
            </Link>
            <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost" className="text-white/40 hover:text-white h-8 text-xs"><DollarSign className="w-3.5 h-3.5 mr-1.5" />Stripe</Button>
            </a>
          </div>
        </header>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto">
            {renderTab()}
          </div>
        </div>
      </main>
    </div>
  );
}
