import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  DollarSign,
  Upload,
  Calendar,
  Play,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  Users,
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

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
        <div className="mt-6 glass-card rounded-2xl p-6 border-[oklch(0.65_0.22_150/0.2)]">
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
