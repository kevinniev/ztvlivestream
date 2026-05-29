import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { SEO, breadcrumbSchema } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Bell, BellOff, Calendar, Clock, Tv, ChevronRight } from "lucide-react";

function formatDate(ms: number) {
  const d = new Date(ms);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
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

const CATEGORY_COLORS: Record<string, string> = {
  tech: "oklch(0.72 0.2 220)",
  gaming: "oklch(0.65 0.25 290)",
  sports: "oklch(0.65 0.22 150)",
  movies: "oklch(0.75 0.18 60)",
  podcasts: "oklch(0.65 0.22 25)",
  news: "oklch(0.7 0.15 200)",
  music: "oklch(0.7 0.2 320)",
  other: "oklch(0.6 0.05 264)",
};

export default function Schedule() {
  const { isAuthenticated } = useAuth();
  const { data: schedule, isLoading } = trpc.schedule.list.useQuery({ days: 7 });
  const { data: myReminders = [], refetch: refetchReminders } = trpc.schedule.myReminders.useQuery(
    undefined,
    { enabled: isAuthenticated }
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
    onSuccess: () => {
      toast.success("Reminder removed");
      refetchReminders();
    },
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

  const now = Date.now();

  const schemas = [breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Schedule", url: "/schedule" }])];

  return (
    <>
      <SEO
        title="Program Schedule — Upcoming Shows & Events"
        description="View the ZTVLIVE program schedule. See upcoming shows, live events, and set reminders so you never miss your favorite content."
        url="/schedule"
        schema={schemas}
      />

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white mb-1">Program Schedule</h1>
            <p className="text-white/50 text-sm">Upcoming shows for the next 7 days</p>
          </div>
          <div className="flex items-center gap-2">
            <Tv className="w-5 h-5 text-[oklch(0.72_0.2_220)]" />
            <span className="text-sm text-white/50">{schedule?.length ?? 0} shows</span>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <div className="h-6 w-32 bg-white/5 rounded animate-pulse mb-4" />
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="h-24 bg-white/5 rounded-xl animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/40 text-lg">No upcoming shows scheduled</p>
            <p className="text-white/25 text-sm mt-1">Check back soon for new programming</p>
          </div>
        ) : (
          <div className="space-y-10">
            {Object.entries(grouped).map(([date, items]) => (
              <section key={date}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="section-divider" />
                  <h2 className="text-lg font-bold text-white">{date}</h2>
                  <span className="text-xs text-white/30">{items?.length} shows</span>
                </div>

                {/* Time grid */}
                <div className="space-y-3">
                  {items?.map((item) => {
                    const isNow = now >= item.startTime && now <= item.endTime;
                    const isPast = now > item.endTime;
                    const hasReminder = reminderIds.has(item.id);
                    const catColor = CATEGORY_COLORS[item.category ?? "other"] ?? CATEGORY_COLORS.other;

                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                          isNow
                            ? "bg-[oklch(0.72_0.2_220/0.08)] border-[oklch(0.72_0.2_220/0.3)]"
                            : isPast
                            ? "bg-white/3 border-white/5 opacity-50"
                            : "glass-card hover:border-white/20"
                        }`}
                      >
                        {/* Time column */}
                        <div className="text-center shrink-0 w-20">
                          <p className={`text-sm font-bold ${isNow ? "text-[oklch(0.72_0.2_220)]" : "text-white"}`}>
                            {formatTime(item.startTime)}
                          </p>
                          <p className="text-xs text-white/30 mt-0.5">
                            {formatDuration(item.startTime, item.endTime)}
                          </p>
                        </div>

                        {/* Category color bar */}
                        <div
                          className="w-1 h-12 rounded-full shrink-0"
                          style={{ background: catColor }}
                        />

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {isNow && <span className="live-badge">LIVE NOW</span>}
                            {item.category && (
                              <span className="text-xs font-semibold capitalize" style={{ color: catColor }}>
                                {item.category}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                          {item.description && (
                            <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{item.description}</p>
                          )}
                        </div>

                        {/* Time end */}
                        <div className="text-right shrink-0 hidden sm:block">
                          <p className="text-xs text-white/30">ends {formatTime(item.endTime)}</p>
                          <div className="flex items-center gap-1 mt-1 justify-end text-xs text-white/25">
                            <Clock className="w-3 h-3" />
                            {formatDuration(item.startTime, item.endTime)}
                          </div>
                        </div>

                        {/* Reminder button */}
                        {!isPast && (
                          <button
                            onClick={() => handleReminderToggle(item.id)}
                            className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                              hasReminder
                                ? "bg-[oklch(0.72_0.2_220/0.2)] text-[oklch(0.72_0.2_220)] border border-[oklch(0.72_0.2_220/0.4)]"
                                : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white border border-white/10"
                            }`}
                            title={hasReminder ? "Remove reminder" : "Set reminder"}
                          >
                            {hasReminder ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                          </button>
                        )}

                        {/* Watch now button for live */}
                        {isNow && (
                          <a href="/live">
                            <Button size="sm" className="shrink-0 bg-[oklch(0.6_0.22_25)] text-white border-0 text-xs font-bold hover:opacity-90">
                              Watch <ChevronRight className="w-3 h-3 ml-1" />
                            </Button>
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* My reminders */}
        {isAuthenticated && myReminders.length > 0 && (
          <div className="mt-12 glass-card rounded-2xl p-6">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Bell className="w-4 h-4 text-[oklch(0.72_0.2_220)]" />
              My Reminders ({myReminders.length})
            </h3>
            <div className="space-y-2">
              {myReminders.map((item: any) => (
                <div key={item.reminderId} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-sm text-white">{item.title}</p>
                    <p className="text-xs text-white/40">{formatDate(item.startTime)} at {formatTime(item.startTime)}</p>
                  </div>
                  <button
                    onClick={() => removeReminder.mutate({ scheduleItemId: item.id })}
                    className="text-xs text-white/30 hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
