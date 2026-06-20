import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { SEO, breadcrumbSchema } from "@/components/SEO";
import { toast } from "sonner";
import {
  Bell, BellOff, Calendar, Clock, Tv, ChevronRight,
  Radio, Cpu, Gamepad2, Trophy, Film, Mic, Newspaper, Music, Play
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

// Extract show block name from title (e.g. "Morning with Zara: ..." → "Morning with Zara")
function extractShowBlock(title: string): { showName: string; episodeTitle: string } {
  const colonIdx = title.indexOf(": ");
  if (colonIdx > 0) {
    return {
      showName: title.substring(0, colonIdx),
      episodeTitle: title.substring(colonIdx + 2),
    };
  }
  return { showName: "", episodeTitle: title };
}

const CAT_CONFIG: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  live:     { color: "oklch(0.65 0.25 25)",   icon: Radio,     label: "Live" },
  tech:     { color: "oklch(0.74 0.21 218)",  icon: Cpu,       label: "Tech" },
  gaming:   { color: "oklch(0.65 0.25 290)",  icon: Gamepad2,  label: "Gaming" },
  sports:   { color: "oklch(0.65 0.22 150)",  icon: Trophy,    label: "Sports" },
  movies:   { color: "oklch(0.78 0.18 60)",   icon: Film,      label: "Movies" },
  podcasts: { color: "oklch(0.7 0.18 200)",   icon: Mic,       label: "Shows" },
  news:     { color: "oklch(0.72 0.2 25)",    icon: Newspaper, label: "News" },
  music:    { color: "oklch(0.7 0.2 320)",    icon: Music,     label: "Music" },
  other:    { color: "oklch(0.6 0.05 264)",   icon: Tv,        label: "Other" },
};

// Show block color mapping
const SHOW_COLORS: Record<string, string> = {
  "Morning with Zara":          "oklch(0.65 0.25 25)",
  "Zara's Daily Show":          "oklch(0.65 0.25 25)",
  "The Nia Lux Show":           "oklch(0.7 0.18 200)",
  "The Nia Lux Show — Prime":   "oklch(0.7 0.18 200)",
  "CommunityCut Weekly":        "oklch(0.65 0.22 150)",
  "CommunityCut Prime":         "oklch(0.65 0.22 150)",
  "Tech Reviews with Matthew":  "oklch(0.74 0.21 218)",
  "Gaming Block":               "oklch(0.65 0.25 290)",
  "Sports & Culture":           "oklch(0.72 0.2 25)",
  "Late Night Tech":            "oklch(0.74 0.21 218)",
  "Overnight: Music & Chill":   "oklch(0.7 0.2 320)",
  "Early Morning Replay":       "oklch(0.6 0.05 264)",
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
  const todayItems = grouped[displayDay ?? ""] ?? [];

  // Group today's items by show block
  const showBlocks: Record<string, typeof schedule> = {};
  todayItems.forEach((item) => {
    const { showName } = extractShowBlock(item.title);
    const key = showName || "Other Programming";
    if (!showBlocks[key]) showBlocks[key] = [];
    showBlocks[key]!.push(item);
  });

  const schemas = [breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Schedule", url: "/schedule" }])];

  return (
    <>
      <SEO
        title="ZTVLIVE TV Schedule — What's On Live Now & Coming Up"
        description="See what's live now and what's coming up on ZTVLIVE. Full 7-day programming schedule for live TV, shows, events & more. Set reminders for your favorite shows."
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
                      {extractShowBlock(liveNow[0]?.title ?? "Live Now").showName || liveNow[0]?.title}
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
            <div className="space-y-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <div className="h-6 w-48 bg-white/5 rounded-lg animate-pulse mb-3" />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className="h-28 bg-white/5 rounded-xl animate-pulse" />
                    ))}
                  </div>
                </div>
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
            <div className="space-y-10">
              {Object.entries(showBlocks).map(([showName, items]) => {
                if (!items || items.length === 0) return null;
                const showColor = SHOW_COLORS[showName] ?? "oklch(0.74 0.21 218)";
                const firstItem = items[0]!;
                const isBlockLive = items.some(i => now >= i.startTime && now <= i.endTime);

                return (
                  <div key={showName}>
                    {/* Show block header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-1 h-6 rounded-full" style={{ background: showColor }} />
                      <h2 className="text-lg font-black text-white">{showName}</h2>
                      {isBlockLive && (
                        <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          On Air
                        </span>
                      )}
                      <span className="text-xs text-white/30 ml-auto">
                        {formatTime(firstItem.startTime)} – {formatTime(items[items.length - 1]!.endTime)}
                      </span>
                    </div>

                    {/* Episode grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {items.map((item) => {
                        const isNow = now >= item.startTime && now <= item.endTime;
                        const isPast = now > item.endTime;
                        const hasReminder = reminderIds.has(item.id);
                        const cat = CAT_CONFIG[item.category ?? "other"] ?? CAT_CONFIG.other!;
                        const { episodeTitle } = extractShowBlock(item.title);
                        const thumbUrl = item.thumbnailUrl || (item.youtubeId ? `https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg` : null);

                        return (
                          <div key={item.id}
                            className={`relative rounded-xl border overflow-hidden transition-all duration-200 group ${
                              isNow
                                ? "border-[oklch(0.74_0.21_218/0.5)] shadow-lg shadow-[oklch(0.74_0.21_218/0.1)]"
                                : isPast
                                ? "border-white/5 opacity-40"
                                : "border-white/8 hover:border-white/20"
                            }`}
                            style={{ background: isNow ? `${showColor}08` : "oklch(0.1 0.01 264)" }}>

                            {/* Thumbnail */}
                            {thumbUrl && (
                              <div className="relative aspect-video overflow-hidden">
                                <img
                                  src={thumbUrl}
                                  alt={episodeTitle}
                                  className={`w-full h-full object-cover transition-transform duration-300 ${!isPast ? "group-hover:scale-105" : ""}`}
                                  loading="lazy"
                                />
                                {/* Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                                {/* Live badge */}
                                {isNow && (
                                  <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                    LIVE NOW
                                  </div>
                                )}

                                {/* Watch button on hover */}
                                {isNow && (
                                  <Link href="/live">
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                                        <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                                      </div>
                                    </div>
                                  </Link>
                                )}

                                {/* Time badge */}
                                <div className="absolute bottom-2 left-2 text-[10px] font-bold text-white/80 bg-black/50 px-1.5 py-0.5 rounded">
                                  {formatTime(item.startTime)}
                                </div>
                              </div>
                            )}

                            {/* Info */}
                            <div className="p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-white line-clamp-2 leading-snug">
                                    {episodeTitle}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider"
                                      style={{ color: cat.color }}>
                                      {cat.label}
                                    </span>
                                    <span className="text-[10px] text-white/30">
                                      {formatDuration(item.startTime, item.endTime)}
                                    </span>
                                  </div>
                                </div>
                                {!isPast && (
                                  <button
                                    onClick={() => handleReminderToggle(item.id)}
                                    title={hasReminder ? "Remove reminder" : "Set reminder"}
                                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-150 hover:scale-110 active:scale-95 ${
                                      hasReminder
                                        ? "bg-[oklch(0.74_0.21_218/0.15)] text-[oklch(0.74_0.21_218)] border border-[oklch(0.74_0.21_218/0.4)]"
                                        : "bg-white/5 text-white/30 hover:bg-white/10 hover:text-white border border-white/10"
                                    }`}>
                                    {hasReminder ? <BellOff className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
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
                {myReminders.map((item: any) => {
                  const { showName, episodeTitle } = extractShowBlock(item.title);
                  return (
                    <div key={item.reminderId}
                      className="flex items-center justify-between py-2.5 border-b border-white/6 last:border-0">
                      <div>
                        {showName && <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold mb-0.5">{showName}</p>}
                        <p className="text-sm font-semibold text-white">{episodeTitle}</p>
                        <p className="text-xs text-white/35 mt-0.5">
                          {formatDate(item.startTime)} at {formatTime(item.startTime)}
                        </p>
                      </div>
                      <button
                        onClick={() => removeReminder.mutate({ scheduleItemId: item.id })}
                        className="text-xs text-white/35 hover:text-red-400 transition-colors px-2 py-1">
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
