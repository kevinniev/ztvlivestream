import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { SEO, breadcrumbSchema } from "@/components/SEO";
import { toast } from "sonner";
import {
  Bell, BellOff, Calendar, Clock, Tv, ChevronRight,
  Radio, Cpu, Gamepad2, Trophy, Film, Mic, Newspaper, Music
} from "lucide-react";

function formatDate(ms: number) {
  const d = new Date(ms);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

function formatTime(ms: number) {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(startMs: number, endMs: number) {
  const mins = Math.round((endMs - startMs) / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const CAT_CONFIG: Record<string, { color: string; icon: React.ElementType }> = {
  live:     { color: "oklch(0.65 0.25 25)",   icon: Radio },
  tech:     { color: "oklch(0.74 0.21 218)",  icon: Cpu },
  gaming:   { color: "oklch(0.65 0.25 290)",  icon: Gamepad2 },
  sports:   { color: "oklch(0.65 0.22 150)",  icon: Trophy },
  movies:   { color: "oklch(0.78 0.18 60)",   icon: Film },
  podcasts: { color: "oklch(0.7 0.18 200)",   icon: Mic },
  news:     { color: "oklch(0.72 0.2 25)",    icon: Newspaper },
  music:    { color: "oklch(0.7 0.2 320)",    icon: Music },
  other:    { color: "oklch(0.6 0.05 264)",   icon: Tv },
};

export default function Schedule() {
  const { isAuthenticated } = useAuth();
  const { data: schedule, isLoading } = trpc.schedule.list.useQuery({ days: 7 });
  const { data: myReminders = [], refetch: refetchReminders } = trpc.schedule.myReminders.useQuery(
    undefined, { enabled: isAuthenticated }
  );

  const setReminder = trpc.schedule.setReminder.useMutation({
    onSuccess: (data) => {
      if (data.alreadySet) toast.info("Reminder already set");
      else toast.success("Reminder set! We'll notify you before the show.");
      refetchReminders();
    },
    onError: () => toast.error("Failed to set reminder"),
  });

  const removeReminder = trpc.schedule.removeReminder.useMutation({
    onSuccess: () => { toast.success("Reminder removed"); refetchReminders(); },
  });

  const reminderIds = new Set(myReminders.map((r: any) => r.id));

  const handleReminderToggle = (scheduleItemId: number) => {
    if (!isAuthenticated) {
      toast.info("Sign in to set reminders", {
        action: { label: "Sign In", onClick: () => (window.location.href = getLoginUrl()) },
      });
      return;
    }
    if (reminderIds.has(scheduleItemId)) {
      removeReminder.mutate({ scheduleItemId });
    } else {
      setReminder.mutate({ scheduleItemId });
    }
  };

  // Group by date
  const grouped: Record<string, typeof schedule> = {};
  schedule?.forEach((item) => {
    const key = formatDate(item.startTime);
    if (!grouped[key]) grouped[key] = [];
    grouped[key]!.push(item);
  });

  const dateKeys = Object.keys(grouped);
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const displayDay = activeDay ?? dateKeys[0] ?? null;

  const now = Date.now();
  const liveNow = schedule?.filter((s) => now >= s.startTime && now <= s.endTime) ?? [];

  const schemas = [breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Schedule", url: "/schedule" }])];

  return (
    <>
      <SEO
        title="Program Schedule — Upcoming Shows & Events on ZTVLIVE"
        description="View the ZTVLIVE program schedule. See upcoming shows, live events, and set reminders so you never miss your favorite content."
        url="/schedule"
        schema={schemas}
      />

      <div className="min-h-screen bg-background">
        {/* ── HERO ──────────────────────────────────── */}
        <div className="relative overflow-hidden py-10 border-b border-white/6
          bg-gradient-to-b from-[oklch(0.74_0.21_218/0.05)] to-transparent">
          <div className="absolute top-0 right-0 w-80 h-40 bg-[oklch(0.56_0.24_290/0.06)] rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-[oklch(0.74_0.21_218)]" />
                  <h1 className="text-3xl font-black text-white">Program Schedule</h1>
                </div>
                <p className="text-white/45 text-sm">
                  {schedule?.length ?? 0} shows over the next 7 days
                </p>
              </div>

              {/* Live now strip */}
              {liveNow.length > 0 && (
                <Link href="/live">
                  <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl
                    bg-red-500/10 border border-red-500/30 hover:border-red-500/50 transition-colors cursor-pointer">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm font-black text-white">
                      {liveNow[0]?.title ?? "Live Now"}
                    </span>
                    <ChevronRight className="w-4 h-4 text-red-400" />
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ── DAY TABS ──────────────────────────────── */}
        {dateKeys.length > 0 && (
          <div className="sticky top-0 z-20 bg-[oklch(0.08_0.012_264/0.95)] backdrop-blur-md border-b border-white/6">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex gap-1 overflow-x-auto py-3 scrollbar-hide">
                {dateKeys.map((day) => {
                  const isActive = day === displayDay;
                  const count = grouped[day]?.length ?? 0;
                  return (
                    <button key={day}
                      onClick={() => setActiveDay(day)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold shrink-0
                        transition-all duration-150 active:scale-95 ${
                          isActive
                            ? "bg-[oklch(0.74_0.21_218)] text-[oklch(0.06_0.012_264)] shadow-lg shadow-[oklch(0.74_0.21_218/0.3)]"
                            : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white border border-white/8"
                        }`}>
                      {day}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                        isActive ? "bg-[oklch(0.06_0.012_264/0.2)]" : "bg-white/10"
                      }`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── CONTENT ───────────────────────────────── */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : dateKeys.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-20 h-20 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center mx-auto mb-5">
                <Calendar className="w-9 h-9 text-white/15" />
              </div>
              <h2 className="text-xl font-black text-white mb-2">No upcoming shows</h2>
              <p className="text-white/35 text-sm">Check back soon for new programming</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(grouped[displayDay ?? ""] ?? []).map((item) => {
                const isNow = now >= item.startTime && now <= item.endTime;
                const isPast = now > item.endTime;
                const hasReminder = reminderIds.has(item.id);
                const cat = CAT_CONFIG[item.category ?? "other"] ?? CAT_CONFIG.other!;
                const CatIcon = cat.icon;

                return (
                  <div key={item.id}
                    className={`relative flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 ${
                      isNow
                        ? "bg-[oklch(0.74_0.21_218/0.06)] border-[oklch(0.74_0.21_218/0.35)] shadow-lg shadow-[oklch(0.74_0.21_218/0.08)]"
                        : isPast
                        ? "bg-white/2 border-white/5 opacity-45"
                        : "glass-card hover:border-white/20 hover:bg-white/5"
                    }`}>

                    {/* Live glow strip */}
                    {isNow && (
                      <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-[oklch(0.74_0.21_218)] shadow-[0_0_8px_oklch(0.74_0.21_218)]" />
                    )}

                    {/* Time */}
                    <div className="text-center shrink-0 w-16 pl-1">
                      <p className={`text-sm font-black ${isNow ? "text-[oklch(0.74_0.21_218)]" : "text-white"}`}>
                        {formatTime(item.startTime)}
                      </p>
                      <p className="text-[10px] text-white/30 mt-0.5">
                        {formatDuration(item.startTime, item.endTime)}
                      </p>
                    </div>

                    {/* Category icon */}
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${cat.color}12`, border: `1px solid ${cat.color}25` }}>
                      <CatIcon className="w-4 h-4" style={{ color: cat.color }} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        {isNow && (
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-red-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            Live Now
                          </span>
                        )}
                        {item.category && (
                          <span className="text-[10px] font-black uppercase tracking-wider"
                            style={{ color: cat.color }}>
                            {item.category}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-white truncate">{item.title}</p>
                      {item.description && (
                        <p className="text-xs text-white/35 mt-0.5 line-clamp-1">{item.description}</p>
                      )}
                    </div>

                    {/* End time */}
                    <div className="text-right shrink-0 hidden md:block">
                      <p className="text-xs text-white/30">ends {formatTime(item.endTime)}</p>
                      <div className="flex items-center gap-1 mt-1 justify-end text-[10px] text-white/20">
                        <Clock className="w-3 h-3" />
                        {formatDuration(item.startTime, item.endTime)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {!isPast && (
                        <button
                          onClick={() => handleReminderToggle(item.id)}
                          title={hasReminder ? "Remove reminder" : "Set reminder"}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 hover:scale-110 active:scale-95 ${
                            hasReminder
                              ? "bg-[oklch(0.74_0.21_218/0.15)] text-[oklch(0.74_0.21_218)] border border-[oklch(0.74_0.21_218/0.4)]"
                              : "bg-white/5 text-white/35 hover:bg-white/10 hover:text-white border border-white/10"
                          }`}>
                          {hasReminder
                            ? <BellOff className="w-3.5 h-3.5" />
                            : <Bell className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      {isNow && (
                        <Link href="/live">
                          <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg
                            bg-red-500 text-white text-xs font-black hover:opacity-90 active:scale-95 transition-all">
                            Watch
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* My reminders panel */}
          {isAuthenticated && myReminders.length > 0 && (
            <div className="mt-10 glass-card rounded-2xl p-6">
              <h3 className="text-base font-black text-white mb-4 flex items-center gap-2">
                <Bell className="w-4 h-4 text-[oklch(0.74_0.21_218)]" />
                My Reminders
                <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-[oklch(0.74_0.21_218/0.15)] text-[oklch(0.74_0.21_218)] font-black">
                  {myReminders.length}
                </span>
              </h3>
              <div className="space-y-2">
                {myReminders.map((item: any) => (
                  <div key={item.reminderId}
                    className="flex items-center justify-between py-2.5 border-b border-white/6 last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="text-xs text-white/35 mt-0.5">
                        {formatDate(item.startTime)} at {formatTime(item.startTime)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeReminder.mutate({ scheduleItemId: item.id })}
                      className="text-xs text-white/25 hover:text-red-400 transition-colors font-semibold">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
