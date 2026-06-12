import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  LayoutDashboard, Users, Film, Radio, DollarSign, MessageSquare,
  TrendingUp, AlertTriangle, CheckCircle, Clock, XCircle,
  ChevronRight, RefreshCw, Star, Trash2, Shield, Crown,
  Mail, Phone, Youtube, BarChart3, Zap, Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type AdminTab = "overview" | "users" | "content" | "pipeline" | "revenue" | "comms";

function StatCard({ icon: Icon, label, value, sub, color = "blue" }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string;
}) {
  const colors: Record<string, string> = {
    blue: "from-blue-600/20 to-blue-900/10 border-blue-500/30 text-blue-400",
    violet: "from-violet-600/20 to-violet-900/10 border-violet-500/30 text-violet-400",
    green: "from-green-600/20 to-green-900/10 border-green-500/30 text-green-400",
    yellow: "from-yellow-600/20 to-yellow-900/10 border-yellow-500/30 text-yellow-400",
    red: "from-red-600/20 to-red-900/10 border-red-500/30 text-red-400",
    pink: "from-pink-600/20 to-pink-900/10 border-pink-500/30 text-pink-400",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-4 flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/50 uppercase tracking-wider">{label}</span>
        <Icon className={`w-4 h-4 ${colors[color].split(" ")[3]}`} />
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-white/40">{sub}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; icon: React.ElementType }> = {
    completed: { color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle },
    failed: { color: "bg-red-500/20 text-red-400 border-red-500/30", icon: XCircle },
    running: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: RefreshCw },
    render_pending: { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Clock },
    uploading: { color: "bg-violet-500/20 text-violet-400 border-violet-500/30", icon: Youtube },
    active: { color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle },
    inactive: { color: "bg-white/10 text-white/40 border-white/10", icon: Clock },
    admin: { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Crown },
    creator: { color: "bg-violet-500/20 text-violet-400 border-violet-500/30", icon: Zap },
    user: { color: "bg-white/10 text-white/50 border-white/10", icon: Users },
  };
  const cfg = map[status] ?? { color: "bg-white/10 text-white/40 border-white/10", icon: Clock };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<AdminTab>("overview");
  const [userSearch, setUserSearch] = useState("");
  const [userSearchInput, setUserSearchInput] = useState("");

  // Redirect non-admins
  if (user && (user as { role?: string }).role !== "admin") {
    navigate("/");
    return null;
  }

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.admin.stats.useQuery(undefined, { enabled: !!user });
  const { data: usersData, isLoading: usersLoading } = trpc.admin.users.useQuery({ limit: 50, search: userSearch || undefined }, { enabled: !!user && tab === "users" });
  const { data: videosData, isLoading: videosLoading } = trpc.admin.videos.useQuery({ limit: 50 }, { enabled: !!user && tab === "content" });
  const { data: pipelineData, isLoading: pipelineLoading } = trpc.admin.pipelineJobs.useQuery({ limit: 30 }, { enabled: !!user && tab === "pipeline" });
  const { data: creatorsData } = trpc.admin.creatorProspects.useQuery({ limit: 50 }, { enabled: !!user && tab === "comms" });
  const { data: newsletterData } = trpc.admin.newsletterSubs.useQuery({ limit: 50 }, { enabled: !!user && tab === "comms" });
  const { data: smsData } = trpc.admin.smsSubs.useQuery({ limit: 50 }, { enabled: !!user && tab === "comms" });

  const updateRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => toast.success("Role updated"),
    onError: () => toast.error("Failed to update role"),
  });
  const setFeatured = trpc.admin.setFeaturedVideo.useMutation({
    onSuccess: () => toast.success("Featured video updated — homepage will reflect this"),
    onError: () => toast.error("Failed to update featured video"),
  });
  const deleteVideo = trpc.admin.deleteVideo.useMutation({
    onSuccess: () => toast.success("Video deleted"),
    onError: () => toast.error("Failed to delete video"),
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <p className="text-white/60">Sign in as admin to access this page</p>
          <Link href="/signin"><Button className="mt-4">Sign In</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/40 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <span className="text-white/40 hover:text-white transition-colors text-sm">← ZTVLIVE</span>
            </Link>
            <ChevronRight className="w-4 h-4 text-white/20" />
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              <span className="font-bold text-white">Owner Console</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => refetchStats()} className="text-white/60 hover:text-white">
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
              <Crown className="w-3 h-3 mr-1" /> Owner
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={tab} onValueChange={(v) => setTab(v as AdminTab)}>
          <TabsList className="bg-white/5 border border-white/10 mb-6 flex flex-wrap gap-1 h-auto p-1">
            {[
              { value: "overview", icon: LayoutDashboard, label: "Overview" },
              { value: "users", icon: Users, label: "Users" },
              { value: "content", icon: Film, label: "Content" },
              { value: "pipeline", icon: Radio, label: "Pipeline" },
              { value: "revenue", icon: DollarSign, label: "Revenue" },
              { value: "comms", icon: MessageSquare, label: "Comms" },
            ].map(({ value, icon: Icon, label }) => (
              <TabsTrigger key={value} value={value} className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-white/60 flex items-center gap-1.5 px-3 py-1.5">
                <Icon className="w-4 h-4" /> {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Overview ── */}
          <TabsContent value="overview">
            {statsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
                {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-24 bg-white/5 rounded-xl" />)}
              </div>
            ) : stats ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-sm text-white/40 uppercase tracking-wider mb-3">Platform Users</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <StatCard icon={Users} label="Total Users" value={stats.users.total} color="blue" />
                    <StatCard icon={Users} label="Free" value={stats.users.free} color="blue" />
                    <StatCard icon={TrendingUp} label="Basic $4.99" value={stats.users.basic} color="green" />
                    <StatCard icon={TrendingUp} label="Premium $9.99" value={stats.users.premium} color="violet" />
                    <StatCard icon={Crown} label="Creator Pro" value={stats.users.creatorPro} color="yellow" />
                    <StatCard icon={DollarSign} label="Paid Subs" value={stats.users.paid} sub="Total paying users" color="green" />
                  </div>
                </div>
                <div>
                  <h2 className="text-sm text-white/40 uppercase tracking-wider mb-3">Revenue Estimates</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard icon={DollarSign} label="Est. MRR" value={`$${stats.revenue.estimatedMRR.toFixed(2)}`} sub="Monthly recurring revenue" color="green" />
                    <StatCard icon={BarChart3} label="Est. ARR" value={`$${stats.revenue.estimatedARR.toFixed(2)}`} sub="Annual recurring revenue" color="green" />
                  </div>
                </div>
                <div>
                  <h2 className="text-sm text-white/40 uppercase tracking-wider mb-3">Content & Engagement</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <StatCard icon={Film} label="Videos" value={stats.content.totalVideos} color="violet" />
                    <StatCard icon={Star} label="Featured" value={stats.content.featuredVideos} color="yellow" />
                    <StatCard icon={Mail} label="Newsletter" value={stats.content.newsletterSubs} color="blue" />
                    <StatCard icon={Phone} label="SMS Subs" value={stats.content.smsSubs} color="green" />
                    <StatCard icon={Zap} label="Creator Leads" value={stats.content.creatorProspects} color="violet" />
                    <StatCard icon={TrendingUp} label="Quiz Plays" value={stats.content.quizPlays} color="pink" />
                  </div>
                </div>
                <div>
                  <h2 className="text-sm text-white/40 uppercase tracking-wider mb-3">Production Pipeline</h2>
                  <div className="grid grid-cols-3 gap-3">
                    <StatCard icon={Radio} label="Total Jobs" value={stats.pipeline.totalJobs} color="blue" />
                    <StatCard icon={CheckCircle} label="Completed" value={stats.pipeline.completedJobs} color="green" />
                    <StatCard icon={AlertTriangle} label="Failed" value={stats.pipeline.failedJobs} color="red" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-white/40">No data available</div>
            )}
          </TabsContent>

          {/* ── Users ── */}
          <TabsContent value="users">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    placeholder="Search by name or email..."
                    value={userSearchInput}
                    onChange={(e) => setUserSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && setUserSearch(userSearchInput)}
                    className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
                <Button onClick={() => setUserSearch(userSearchInput)} size="sm" className="bg-blue-600 hover:bg-blue-700">Search</Button>
                {userSearch && <Button variant="ghost" size="sm" onClick={() => { setUserSearch(""); setUserSearchInput(""); }} className="text-white/40">Clear</Button>}
              </div>
              {usersLoading ? (
                <div className="space-y-2">{Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />)}</div>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-white/40 text-xs uppercase">
                          <th className="text-left px-4 py-3">User</th>
                          <th className="text-left px-4 py-3">Provider</th>
                          <th className="text-left px-4 py-3">Role</th>
                          <th className="text-left px-4 py-3">Subscription</th>
                          <th className="text-left px-4 py-3">Status</th>
                          <th className="text-left px-4 py-3">Joined</th>
                          <th className="text-left px-4 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersData?.items.map((u) => (
                          <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-medium text-white">{u.name || "Anonymous"}</div>
                              <div className="text-white/40 text-xs">{u.email || "No email"}</div>
                            </td>
                            <td className="px-4 py-3 text-white/60 capitalize">{u.provider}</td>
                            <td className="px-4 py-3"><StatusBadge status={u.role} /></td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${
                                u.subscriptionTier === "creator_pro" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                                u.subscriptionTier === "premium" ? "bg-violet-500/20 text-violet-400 border-violet-500/30" :
                                u.subscriptionTier === "basic" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                                "bg-white/10 text-white/40 border-white/10"
                              }`}>{u.subscriptionTier}</span>
                            </td>
                            <td className="px-4 py-3"><StatusBadge status={u.subscriptionStatus ?? "inactive"} /></td>
                            <td className="px-4 py-3 text-white/40 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                            <td className="px-4 py-3">
                              <Select
                                value={u.role}
                                onValueChange={(role) => updateRole.mutate({ userId: u.id, role: role as "user" | "admin" | "creator" })}
                              >
                                <SelectTrigger className="w-28 h-7 text-xs bg-white/5 border-white/10 text-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1a1a2e] border-white/10">
                                  <SelectItem value="user">User</SelectItem>
                                  <SelectItem value="creator">Creator</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-2 text-xs text-white/30 border-t border-white/5">
                    {usersData?.total ?? 0} total users
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Content ── */}
          <TabsContent value="content">
            {videosLoading ? (
              <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />)}</div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-white/40 text-xs uppercase">
                        <th className="text-left px-4 py-3">Video</th>
                        <th className="text-left px-4 py-3">Category</th>
                        <th className="text-left px-4 py-3">Creator</th>
                        <th className="text-left px-4 py-3">Views</th>
                        <th className="text-left px-4 py-3">Featured</th>
                        <th className="text-left px-4 py-3">Published</th>
                        <th className="text-left px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {videosData?.items.map((v) => (
                        <tr key={v.id} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${v.isFeatured ? "bg-yellow-500/5" : ""}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {v.thumbnailUrl && <img src={v.thumbnailUrl} alt="" className="w-12 h-7 object-cover rounded" />}
                              <div>
                                <div className="font-medium text-white text-xs line-clamp-1 max-w-[200px]">{v.title}</div>
                                <a href={`https://youtube.com/watch?v=${v.youtubeId}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs hover:underline">{v.youtubeId}</a>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-white/60 text-xs capitalize">{v.category}</td>
                          <td className="px-4 py-3 text-white/60 text-xs">{v.creatorName || "ZTVLIVE"}</td>
                          <td className="px-4 py-3 text-white/60 text-xs">{v.viewCount.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            {v.isFeatured ? (
                              <span className="text-yellow-400 text-xs flex items-center gap-1"><Star className="w-3 h-3 fill-yellow-400" /> Featured</span>
                            ) : (
                              <span className="text-white/20 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-white/40 text-xs">{new Date(v.publishedAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {!v.isFeatured && (
                                <Button size="sm" variant="ghost" onClick={() => setFeatured.mutate({ videoId: v.id })} className="h-6 px-2 text-xs text-yellow-400 hover:bg-yellow-500/10">
                                  <Star className="w-3 h-3 mr-1" /> Feature
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" onClick={() => {
                                if (confirm("Delete this video?")) deleteVideo.mutate({ videoId: v.id });
                              }} className="h-6 px-2 text-xs text-red-400 hover:bg-red-500/10">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2 text-xs text-white/30 border-t border-white/5">
                  {videosData?.total ?? 0} total videos
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Pipeline ── */}
          <TabsContent value="pipeline">
            {pipelineLoading ? (
              <div className="space-y-2">{Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />)}</div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-white/40 mb-2">Last 30 production jobs — Zara Daily & Zoe Weekly</div>
                {pipelineData?.items.map((job) => (
                  <div key={job.id} className={`bg-white/5 border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${
                    job.status === "failed" ? "border-red-500/30" :
                    job.status === "completed" ? "border-green-500/20" :
                    "border-white/10"
                  }`}>
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        job.pipelineType === "zara-daily" ? "bg-blue-600/30 text-blue-400" : "bg-violet-600/30 text-violet-400"
                      }`}>
                        {job.pipelineType === "zara-daily" ? "Z" : "ZO"}
                      </div>
                      <div>
                        <div className="font-medium text-white text-sm">{job.scriptTitle || `${job.pipelineType} — ${job.scheduledDate}`}</div>
                        <div className="text-white/40 text-xs">{job.scheduledDate} · {job.pipelineType}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={job.status} />
                      {job.youtubeVideoId && (
                        <a href={`https://youtube.com/watch?v=${job.youtubeVideoId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-red-400 hover:underline">
                          <Youtube className="w-3 h-3" /> YouTube
                        </a>
                      )}
                      {job.heygenVideoId && (
                        <span className="text-xs text-white/30">HeyGen: {job.heygenVideoId.slice(0, 12)}…</span>
                      )}
                      {job.brollCount ? <span className="text-xs text-white/30">{job.brollCount} b-rolls</span> : null}
                    </div>
                    {job.errorMessage && (
                      <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-2 py-1 w-full">
                        {job.errorMessage}
                      </div>
                    )}
                  </div>
                ))}
                {!pipelineData?.items.length && (
                  <div className="text-center py-20 text-white/30">No pipeline jobs yet — first run fires at 9am MST daily</div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── Revenue ── */}
          <TabsContent value="revenue">
            <div className="space-y-6">
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard icon={DollarSign} label="Est. MRR" value={`$${stats.revenue.estimatedMRR.toFixed(2)}`} sub="Based on active subs" color="green" />
                  <StatCard icon={BarChart3} label="Est. ARR" value={`$${stats.revenue.estimatedARR.toFixed(2)}`} sub="Annualized" color="green" />
                  <StatCard icon={Users} label="Paid Users" value={stats.users.paid} sub="Basic + Premium + Pro" color="blue" />
                  <StatCard icon={TrendingUp} label="Conversion" value={stats.users.total > 0 ? `${((stats.users.paid / stats.users.total) * 100).toFixed(1)}%` : "0%"} sub="Free → Paid" color="violet" />
                </div>
              )}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4 text-green-400" /> Subscription Breakdown</h3>
                {stats && (
                  <div className="space-y-3">
                    {[
                      { tier: "Basic", price: 4.99, count: stats.users.basic, color: "bg-blue-500" },
                      { tier: "Premium", price: 9.99, count: stats.users.premium, color: "bg-violet-500" },
                      { tier: "Creator Pro", price: 14.99, count: stats.users.creatorPro, color: "bg-yellow-500" },
                    ].map(({ tier, price, count, color }) => {
                      const revenue = count * price;
                      const maxRevenue = stats.revenue.estimatedMRR || 1;
                      return (
                        <div key={tier} className="flex items-center gap-4">
                          <div className="w-24 text-sm text-white/60">{tier}</div>
                          <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                            <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(100, (revenue / maxRevenue) * 100)}%` }} />
                          </div>
                          <div className="text-sm text-white w-20 text-right">${revenue.toFixed(2)}/mo</div>
                          <div className="text-xs text-white/40 w-16 text-right">{count} users</div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="mt-6 pt-4 border-t border-white/10 text-xs text-white/30">
                  Revenue figures are estimates based on active subscription tiers in the database. For actual Stripe payments, visit{" "}
                  <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">dashboard.stripe.com</a>.
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Comms ── */}
          <TabsContent value="comms">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Newsletter */}
              <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-white"><Mail className="w-4 h-4 text-blue-400" /> Newsletter</div>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">{newsletterData?.items.length ?? 0}</Badge>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                  {newsletterData?.items.map((sub) => (
                    <div key={sub.id} className="px-4 py-2 text-sm">
                      <div className="text-white/80">{sub.email}</div>
                      <div className="text-white/30 text-xs">{new Date(sub.subscribedAt).toLocaleDateString()}</div>
                    </div>
                  ))}
                  {!newsletterData?.items.length && <div className="px-4 py-8 text-center text-white/30 text-sm">No subscribers yet</div>}
                </div>
              </div>

              {/* SMS */}
              <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-white"><Phone className="w-4 h-4 text-green-400" /> SMS Opt-ins</div>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{smsData?.items.length ?? 0}</Badge>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                  {smsData?.items.map((sub) => (
                    <div key={sub.id} className="px-4 py-2 text-sm">
                      <div className="text-white/80">{sub.phone}</div>
                      <div className="text-white/30 text-xs">{new Date(sub.subscribedAt).toLocaleDateString()}</div>
                    </div>
                  ))}
                  {!smsData?.items.length && <div className="px-4 py-8 text-center text-white/30 text-sm">No SMS opt-ins yet</div>}
                </div>
              </div>

              {/* Creator Prospects */}
              <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-white"><Zap className="w-4 h-4 text-violet-400" /> Creator Leads</div>
                  <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30">{creatorsData?.total ?? 0}</Badge>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                  {creatorsData?.items.map((p) => (
                    <div key={p.id} className="px-4 py-2 text-sm">
                      <div className="text-white/80 font-medium">{p.displayName || p.handle}</div>
                      <div className="text-white/40 text-xs">{p.platform} · {p.niche} · {p.followerCount?.toLocaleString()} followers</div>
                      {p.profileUrl && (
                        <a href={p.profileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs hover:underline">View Profile</a>
                      )}
                    </div>
                  ))}
                  {!creatorsData?.items.length && <div className="px-4 py-8 text-center text-white/30 text-sm">No creator leads yet</div>}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
