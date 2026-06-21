import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import {
  TrendingUp,
  Users,
  AlertTriangle,
  Scissors,
  DollarSign,
  Radio,
  Brain,
  RefreshCw,
  ExternalLink,
  Zap,
  Target,
  Shield,
  BarChart3,
  ChevronRight,
  Flame,
  Star,
  MapPin,
} from "lucide-react";

// ── Sentiment Gauge ───────────────────────────────────────────────────────────
function SentimentGauge({ score }: { score: number }) {
  const pct = Math.round(((score + 1) / 2) * 100);
  const color = score > 0.2 ? "text-emerald-400" : score < -0.2 ? "text-red-400" : "text-yellow-400";
  const label = score > 0.2 ? "Positive" : score < -0.2 ? "Negative" : "Neutral";
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e293b" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15.9" fill="none"
            stroke={score > 0.2 ? "#34d399" : score < -0.2 ? "#f87171" : "#fbbf24"}
            strokeWidth="3"
            strokeDasharray={`${pct} 100`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-lg font-bold ${color}`}>{pct}%</span>
        </div>
      </div>
      <span className={`text-sm font-medium ${color}`}>{label}</span>
    </div>
  );
}

// ── Urgency Badge ─────────────────────────────────────────────────────────────
function UrgencyBadge({ urgency }: { urgency: string }) {
  const map: Record<string, string> = {
    high: "bg-red-500/20 text-red-400 border-red-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${map[urgency] ?? map.low}`}>
      {urgency}
    </span>
  );
}

// ── Show Badge ────────────────────────────────────────────────────────────────
function ShowBadge({ show }: { show: string }) {
  const map: Record<string, string> = {
    zara: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    zoe: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    nia: "bg-pink-500/20 text-pink-300 border-pink-500/30",
    all: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  };
  const labels: Record<string, string> = {
    zara: "Zara's Show",
    zoe: "The Rundown w/ Zoe",
    nia: "Nia Lux Show",
    all: "All Shows",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${map[show] ?? map.all}`}>
      {labels[show] ?? show}
    </span>
  );
}

// ── Category Badge ────────────────────────────────────────────────────────────
function CatBadge({ cat }: { cat: string }) {
  const colors: Record<string, string> = {
    entertainment: "bg-orange-500/20 text-orange-300",
    sports: "bg-green-500/20 text-green-300",
    culture: "bg-purple-500/20 text-purple-300",
    local: "bg-teal-500/20 text-teal-300",
    industry: "bg-blue-500/20 text-blue-300",
    brand: "bg-yellow-500/20 text-yellow-300",
    grooming: "bg-rose-500/20 text-rose-300",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[cat] ?? "bg-slate-500/20 text-slate-300"}`}>
      {cat}
    </span>
  );
}

// ── Loading Skeleton ──────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl bg-slate-800" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-xl bg-slate-800" />
        ))}
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function IntelligenceDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("trends");

  const { data, isLoading, error, refetch, isFetching } = trpc.intelligence.getScan.useQuery(undefined, {
    staleTime: 1000 * 60 * 5, // 5 min cache
    retry: 1,
  });

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Shield className="w-12 h-12 text-slate-500 mx-auto" />
          <p className="text-slate-400">Admin access required</p>
          <Link href="/">
            <Button variant="outline" size="sm">Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const trendCount = data?.trends?.length ?? 0;
  const leadCount = data?.creatorLeads?.length ?? 0;
  const crisisCount = data?.crisisSignals?.length ?? 0;
  const revenueCount = data?.revenueOpportunities?.length ?? 0;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="border-b border-slate-800 bg-[#0d0d15]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">ZTVLIVE Intelligence</h1>
              <p className="text-xs text-slate-400">Self-Aware Media Command Center</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              {data ? `Last scan: ${new Date().toLocaleTimeString()}` : "Loading..."}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="border-slate-700 text-slate-300 hover:text-white hover:border-violet-500"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                Admin
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-[#0d0d15] border-slate-800 hover:border-violet-500/50 transition-colors">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{isLoading ? "—" : trendCount}</p>
                <p className="text-xs text-slate-400">Trends Detected</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#0d0d15] border-slate-800 hover:border-cyan-500/50 transition-colors">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{isLoading ? "—" : leadCount}</p>
                <p className="text-xs text-slate-400">Creator Leads</p>
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-[#0d0d15] border-slate-800 transition-colors ${crisisCount > 0 ? "border-red-500/50" : "hover:border-emerald-500/50"}`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${crisisCount > 0 ? "bg-red-500/20" : "bg-emerald-500/20"}`}>
                <Shield className={`w-5 h-5 ${crisisCount > 0 ? "text-red-400" : "text-emerald-400"}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{isLoading ? "—" : crisisCount}</p>
                <p className="text-xs text-slate-400">Crisis Signals</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#0d0d15] border-slate-800 hover:border-yellow-500/50 transition-colors">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{isLoading ? "—" : revenueCount}</p>
                <p className="text-xs text-slate-400">Revenue Opps</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sentiment + Show Routing Row */}
        {!isLoading && data && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-[#0d0d15] border-slate-800 flex items-center justify-center p-4">
              <div className="text-center space-y-1">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Brand Sentiment</p>
                <SentimentGauge score={data.sentimentScore} />
              </div>
            </Card>
            {[
              { host: "Zara", icon: "🎙️", topics: data.topTopicsForZara, color: "violet" },
              { host: "Zoe", icon: "📺", topics: data.topTopicsForZoe, color: "cyan" },
              { host: "Nia", icon: "💼", topics: data.topTopicsForNia, color: "pink" },
            ].map(({ host, icon, topics, color }) => (
              <Card key={host} className="bg-[#0d0d15] border-slate-800">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <span>{icon}</span> {host}'s Topics
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  {topics.length === 0 ? (
                    <p className="text-xs text-slate-500">No topics yet</p>
                  ) : (
                    topics.map((t, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Flame className={`w-3 h-3 mt-0.5 flex-shrink-0 text-${color}-400`} />
                        <p className="text-xs text-slate-300 leading-relaxed">{t}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Main Tabs */}
        {isLoading ? (
          <DashboardSkeleton />
        ) : error ? (
          <Card className="bg-[#0d0d15] border-red-800">
            <CardContent className="p-6 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
              <p className="text-red-400 font-medium">Intelligence scan failed</p>
              <p className="text-slate-500 text-sm">{error.message}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="bg-[#0d0d15] border border-slate-800 p-1">
              <TabsTrigger value="trends" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white text-slate-400">
                <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> Trends ({trendCount})
              </TabsTrigger>
              <TabsTrigger value="creators" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-400">
                <Users className="w-3.5 h-3.5 mr-1.5" /> Creator Radar ({leadCount})
              </TabsTrigger>
              <TabsTrigger value="communitycut" className="data-[state=active]:bg-rose-600 data-[state=active]:text-white text-slate-400">
                <Scissors className="w-3.5 h-3.5 mr-1.5" /> CommunityCut
              </TabsTrigger>
              <TabsTrigger value="revenue" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-white text-slate-400">
                <DollarSign className="w-3.5 h-3.5 mr-1.5" /> Revenue
              </TabsTrigger>
              <TabsTrigger value="crisis" className="data-[state=active]:bg-red-600 data-[state=active]:text-white text-slate-400">
                <Shield className="w-3.5 h-3.5 mr-1.5" /> Crisis {crisisCount > 0 && <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5">{crisisCount}</span>}
              </TabsTrigger>
            </TabsList>

            {/* ── Trends Tab ── */}
            <TabsContent value="trends" className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {(data?.trends ?? []).length === 0 ? (
                  <div className="col-span-2 text-center py-12 text-slate-500">No trends detected yet. Refresh to scan.</div>
                ) : (
                  (data?.trends ?? []).map((trend, i) => (
                    <Card key={i} className="bg-[#0d0d15] border-slate-800 hover:border-violet-500/40 transition-all group">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-white leading-snug group-hover:text-violet-300 transition-colors">
                            {trend.headline}
                          </p>
                          <a href={trend.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 text-slate-500 hover:text-violet-400 transition-colors">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <CatBadge cat={trend.category} />
                          <ShowBadge show={trend.showTarget} />
                          <UrgencyBadge urgency={trend.urgency} />
                          <span className="text-xs text-slate-500 ml-auto">{trend.source}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Radio className="w-3 h-3" />
                          <span>Published: {trend.publishedAt}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* ── Creator Radar Tab ── */}
            <TabsContent value="creators" className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {(data?.creatorLeads ?? []).length === 0 ? (
                  <div className="col-span-2 text-center py-12 text-slate-500">No creator leads found yet. Refresh to scan.</div>
                ) : (
                  (data?.creatorLeads ?? []).map((lead, i) => (
                    <Card key={i} className="bg-[#0d0d15] border-slate-800 hover:border-cyan-500/40 transition-all group">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-600 to-violet-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                              {lead.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white">{lead.name}</p>
                              <p className="text-xs text-slate-400">{lead.platform}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <UrgencyBadge urgency={lead.urgency} />
                            <a href={lead.url} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-cyan-400 transition-colors">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{lead.reason}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">{lead.niche}</Badge>
                          <Button size="sm" variant="ghost" className="ml-auto text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 h-6 px-2">
                            <Target className="w-3 h-3 mr-1" /> Recruit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* ── CommunityCut Tab ── */}
            <TabsContent value="communitycut" className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {(data?.ccSignals ?? []).length === 0 ? (
                  <div className="col-span-2 text-center py-12 text-slate-500">No CommunityCut signals yet. Refresh to scan.</div>
                ) : (
                  (data?.ccSignals ?? []).map((signal, i) => {
                    const typeMap: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
                      barber_demand: { icon: <Scissors className="w-4 h-4" />, label: "Barber Demand", color: "rose" },
                      hair_trend: { icon: <Star className="w-4 h-4" />, label: "Hair Trend", color: "pink" },
                      local_event: { icon: <MapPin className="w-4 h-4" />, label: "Local Event", color: "teal" },
                      bad_experience: { icon: <AlertTriangle className="w-4 h-4" />, label: "Bad Experience", color: "red" },
                      appointment_need: { icon: <Zap className="w-4 h-4" />, label: "Appointment Need", color: "orange" },
                    };
                    const typeInfo = typeMap[signal.type] ?? typeMap.barber_demand;
                    return (
                      <Card key={i} className="bg-[#0d0d15] border-slate-800 hover:border-rose-500/40 transition-all">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-lg bg-${typeInfo.color}-500/20 flex items-center justify-center text-${typeInfo.color}-400`}>
                                {typeInfo.icon}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-300">{typeInfo.label}</p>
                                {signal.location && <p className="text-xs text-slate-500">{signal.location}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <UrgencyBadge urgency={signal.urgency} />
                              <a href={signal.url} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-rose-400 transition-colors">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                          <p className="text-sm text-white leading-snug">{signal.message}</p>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>

            {/* ── Revenue Tab ── */}
            <TabsContent value="revenue" className="mt-4">
              <div className="space-y-3">
                {(data?.revenueOpportunities ?? []).length === 0 ? (
                  <div className="text-center py-12 text-slate-500">No revenue opportunities detected yet.</div>
                ) : (
                  (data?.revenueOpportunities ?? []).map((opp, i) => (
                    <Card key={i} className="bg-[#0d0d15] border-slate-800 hover:border-yellow-500/40 transition-all">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                          <DollarSign className="w-5 h-5 text-yellow-400" />
                        </div>
                        <p className="text-sm text-white flex-1">{opp}</p>
                        <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Revenue breakdown */}
              <Card className="bg-[#0d0d15] border-slate-800 mt-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-yellow-400" /> Revenue Streams Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "ZTVLIVE+ Subscriptions", status: "Active", color: "emerald" },
                    { label: "Creator Pro Tier", status: "Active", color: "emerald" },
                    { label: "Pre-roll Ads", status: "Configured", color: "yellow" },
                    { label: "Sponsored Categories", status: "Available", color: "blue" },
                    { label: "Pay-per-view Events", status: "Ready", color: "blue" },
                    { label: "CommunityCut Booking Fees", status: "Integrated", color: "emerald" },
                    { label: "Brand Deals", status: "Open", color: "slate" },
                    { label: "Affiliate Links", status: "Open", color: "slate" },
                  ].map(({ label, status, color }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-sm text-slate-300">{label}</span>
                      <span className={`text-xs font-medium text-${color}-400`}>{status}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Crisis Tab ── */}
            <TabsContent value="crisis" className="mt-4">
              {(data?.crisisSignals ?? []).length === 0 ? (
                <Card className="bg-[#0d0d15] border-emerald-800">
                  <CardContent className="p-8 text-center space-y-3">
                    <Shield className="w-10 h-10 text-emerald-400 mx-auto" />
                    <p className="text-emerald-400 font-semibold">All Clear</p>
                    <p className="text-slate-400 text-sm">No brand threats or crisis signals detected.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {(data?.crisisSignals ?? []).map((signal, i) => (
                    <Card key={i} className={`bg-[#0d0d15] border-${signal.severity === "critical" ? "red" : "yellow"}-800`}>
                      <CardContent className="p-4 flex items-start gap-4">
                        <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${signal.severity === "critical" ? "text-red-400" : "text-yellow-400"}`} />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className={`text-xs ${signal.severity === "critical" ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"}`}>
                              {signal.severity.toUpperCase()}
                            </Badge>
                            <span className="text-xs text-slate-500">{signal.source}</span>
                          </div>
                          <p className="text-sm text-white">{signal.message}</p>
                        </div>
                        <a href={signal.url} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
