/**
 * Weekly Broadcast Report
 * Fires every Monday at 9:00 AM MST (16:00 UTC) via Heartbeat cron.
 * Pulls platform stats from the DB and sends a formatted HTML email
 * from admin@ztvlivestream.com to kevinniev1@gmail.com.
 */
import type { Request, Response } from "express";
import { getDb } from "./db";
import { users, videos, watchlist, scheduleItems, newsletterSubscribers } from "../drizzle/schema";
import { sql, gte, count, eq } from "drizzle-orm";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";
import nodemailer from "nodemailer";

// ─── Email transport ──────────────────────────────────────────────────────────
function createTransport() {
  return nodemailer.createTransport({
    host: "mail.privateemail.com",
    port: 587,
    secure: false,
    auth: {
      user: "admin@ztvlivestream.com",
      pass: ENV.privateEmailPassword,
    },
    tls: { rejectUnauthorized: false },
  });
}

// ─── Stats types ──────────────────────────────────────────────────────────────
interface TopVideo {
  id: number;
  title: string;
  viewCount: number;
  category: string;
  creatorName: string | null;
}

interface CategoryStat {
  category: string;
  count: number;
}

interface ScheduleItem {
  title: string;
  startTime: number | null;
  category: string | null;
}

interface WeeklyStats {
  totalUsers: number;
  newUsersThisWeek: number;
  totalVideos: number;
  newVideosThisWeek: number;
  totalCreators: number;
  paidSubscribers: number;
  newsletterCount: number;
  totalWatchlistAdds: number;
  topVideos: TopVideo[];
  categoryBreakdown: CategoryStat[];
  recentSchedule: ScheduleItem[];
}

// ─── Stats helpers ────────────────────────────────────────────────────────────
async function gatherStats(): Promise<WeeklyStats> {
  const dbInstance = await getDb();
  if (!dbInstance) throw new Error("Database not available");
  const db = dbInstance;
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsersResult,
    newUsersResult,
    totalVideosResult,
    newVideosResult,
    totalCreatorsResult,
    paidSubsResult,
    newsletterResult,
    watchlistAddsResult,
    topVideosResult,
    categoryResult,
    scheduleResult,
  ] = await Promise.all([
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(users).where(gte(users.createdAt, oneWeekAgo)),
    db.select({ count: count() }).from(videos).where(eq(videos.status, "approved")),
    db.select({ count: count() }).from(videos).where(gte(videos.createdAt, oneWeekAgo)),
    db.select({ count: count() }).from(users).where(eq(users.role, "creator")),
    db.select({ count: count() }).from(users).where(sql`${users.subscriptionTier} IN ('basic','premium','creator_pro')`),
    db.select({ count: count() }).from(newsletterSubscribers),
    db.select({ count: count() }).from(watchlist).where(gte(watchlist.addedAt, oneWeekAgo)),
    db
      .select({
        id: videos.id,
        title: videos.title,
        viewCount: videos.viewCount,
        category: videos.category,
        creatorName: videos.creatorName,
      })
      .from(videos)
      .where(eq(videos.status, "approved"))
      .orderBy(sql`${videos.viewCount} DESC`)
      .limit(5),
    db
      .select({ category: videos.category, count: count() })
      .from(videos)
      .where(eq(videos.status, "approved"))
      .groupBy(videos.category)
      .orderBy(sql`count(*) DESC`)
      .limit(6),
    db
      .select({ title: scheduleItems.title, startTime: scheduleItems.startTime, category: scheduleItems.category })
      .from(scheduleItems)
      .where(gte(scheduleItems.startTime, Date.now()))
      .orderBy(scheduleItems.startTime)
      .limit(5),
  ]);

  return {
    totalUsers: totalUsersResult[0]?.count ?? 0,
    newUsersThisWeek: newUsersResult[0]?.count ?? 0,
    totalVideos: totalVideosResult[0]?.count ?? 0,
    newVideosThisWeek: newVideosResult[0]?.count ?? 0,
    totalCreators: totalCreatorsResult[0]?.count ?? 0,
    paidSubscribers: paidSubsResult[0]?.count ?? 0,
    newsletterCount: newsletterResult[0]?.count ?? 0,
    totalWatchlistAdds: watchlistAddsResult[0]?.count ?? 0,
    topVideos: topVideosResult.map((v) => ({
      id: v.id,
      title: v.title,
      viewCount: v.viewCount ?? 0,
      category: v.category ?? "other",
      creatorName: v.creatorName ?? null,
    })),
    categoryBreakdown: categoryResult.map((c) => ({
      category: c.category ?? "other",
      count: c.count,
    })),
    recentSchedule: scheduleResult.map((s) => ({
      title: s.title,
      startTime: typeof s.startTime === "number" ? s.startTime : null,
      category: s.category ?? null,
    })),
  };
}

// ─── HTML email builder ───────────────────────────────────────────────────────
function buildEmailHtml(stats: WeeklyStats, weekLabel: string): string {
  const categoryColors: Record<string, string> = {
    live: "#ef4444", tech: "#3b82f6", gaming: "#8b5cf6", sports: "#f59e0b",
    movies: "#ec4899", podcasts: "#10b981", news: "#06b6d4", music: "#f97316", other: "#6b7280",
  };

  const statCards = [
    { label: "Total Users", value: stats.totalUsers.toLocaleString(), sub: `+${stats.newUsersThisWeek} this week`, color: "#3b82f6" },
    { label: "Content Library", value: stats.totalVideos.toLocaleString(), sub: `+${stats.newVideosThisWeek} this week`, color: "#8b5cf6" },
    { label: "Paid Subscribers", value: stats.paidSubscribers.toLocaleString(), sub: "ZTVLIVE+ members", color: "#10b981" },
    { label: "Active Creators", value: stats.totalCreators.toLocaleString(), sub: "on the platform", color: "#f59e0b" },
    { label: "Newsletter List", value: stats.newsletterCount.toLocaleString(), sub: "subscribers", color: "#ec4899" },
    { label: "Watchlist Adds", value: stats.totalWatchlistAdds.toLocaleString(), sub: "this week", color: "#06b6d4" },
  ];

  const statCardsHtml = statCards.map((s) => `
    <td style="width:33%;padding:6px;">
      <div style="background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:16px;text-align:center;">
        <div style="font-size:24px;font-weight:900;color:${s.color};">${s.value}</div>
        <div style="font-size:12px;font-weight:700;color:#f1f5f9;margin:4px 0 2px;">${s.label}</div>
        <div style="font-size:11px;color:#475569;">${s.sub}</div>
      </div>
    </td>`).join("");

  const topVideosHtml = stats.topVideos.length
    ? stats.topVideos.map((v, i) => `
        <tr>
          <td style="padding:8px 12px;color:#94a3b8;font-size:13px;">${i + 1}</td>
          <td style="padding:8px 12px;">
            <span style="color:#f1f5f9;font-size:14px;font-weight:600;">${v.title}</span><br>
            <span style="color:#64748b;font-size:12px;">${v.creatorName ?? "ZTVLIVE"} · ${v.category}</span>
          </td>
          <td style="padding:8px 12px;color:#3b82f6;font-size:14px;font-weight:700;text-align:right;">${v.viewCount.toLocaleString()} views</td>
        </tr>`).join("")
    : `<tr><td colspan="3" style="padding:16px;color:#64748b;text-align:center;">No videos yet</td></tr>`;

  const categoryHtml = stats.categoryBreakdown.map((c) =>
    `<span style="display:inline-block;margin:4px;padding:4px 12px;border-radius:999px;background:${categoryColors[c.category] ?? "#6b7280"}22;border:1px solid ${categoryColors[c.category] ?? "#6b7280"}44;color:${categoryColors[c.category] ?? "#6b7280"};font-size:12px;">${c.category} <strong>${c.count}</strong></span>`
  ).join("");

  const scheduleHtml = stats.recentSchedule.length
    ? stats.recentSchedule.map((s) => {
        const timeStr = s.startTime
          ? new Date(s.startTime as number).toLocaleString("en-US", { timeZone: "America/Phoenix", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
          : "";
        return `<li style="padding:6px 0;color:#94a3b8;font-size:13px;border-bottom:1px solid #1e293b;">
          <strong style="color:#f1f5f9;">${s.title}</strong>
          <span style="color:#64748b;margin-left:8px;">${timeStr} MST</span>
        </li>`;
      }).join("")
    : `<li style="padding:6px 0;color:#64748b;">No upcoming schedule items</li>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#8b5cf6);padding:2px;border-radius:12px;">
        <div style="background:#0a0a0f;border-radius:10px;padding:16px 32px;">
          <h1 style="margin:0;font-size:28px;font-weight:900;color:#3b82f6;">ZTVLIVE</h1>
          <p style="margin:4px 0 0;color:#64748b;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Weekly Broadcast Report</p>
        </div>
      </div>
      <p style="color:#475569;font-size:14px;margin-top:12px;">${weekLabel}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <tr>${statCardsHtml.slice(0, 3)}</tr>
      <tr>${statCardsHtml.slice(3)}</tr>
    </table>
    <div style="background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:20px;margin-bottom:24px;">
      <h2 style="margin:0 0 16px;font-size:16px;font-weight:700;color:#f1f5f9;">🎬 Top Videos by Views</h2>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="border-bottom:1px solid #1e293b;">
          <th style="padding:8px 12px;color:#475569;font-size:11px;text-align:left;">#</th>
          <th style="padding:8px 12px;color:#475569;font-size:11px;text-align:left;">TITLE</th>
          <th style="padding:8px 12px;color:#475569;font-size:11px;text-align:right;">VIEWS</th>
        </tr></thead>
        <tbody>${topVideosHtml}</tbody>
      </table>
    </div>
    <div style="background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:20px;margin-bottom:24px;">
      <h2 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#f1f5f9;">📊 Content by Category</h2>
      <div>${categoryHtml || '<span style="color:#64748b;font-size:13px;">No content yet</span>'}</div>
    </div>
    <div style="background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:20px;margin-bottom:24px;">
      <h2 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#f1f5f9;">📅 Upcoming Schedule</h2>
      <ul style="margin:0;padding:0;list-style:none;">${scheduleHtml}</ul>
    </div>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="https://ztvlivestream.com" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:700;font-size:14px;">View ZTVLIVE →</a>
    </div>
    <div style="text-align:center;border-top:1px solid #1e293b;padding-top:20px;">
      <p style="color:#334155;font-size:12px;margin:0;">ZTVLIVE Weekly Broadcast Report · Sent every Monday 9:00 AM MST</p>
      <p style="color:#334155;font-size:12px;margin:4px 0 0;"><a href="https://ztvlivestream.com" style="color:#3b82f6;text-decoration:none;">ztvlivestream.com</a> · admin@ztvlivestream.com</p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function weeklyReportHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only" });
    }

    const now = new Date();
    const weekLabel = `Week of ${now.toLocaleDateString("en-US", { timeZone: "America/Phoenix", month: "long", day: "numeric", year: "numeric" })}`;

    const stats = await gatherStats();
    const html = buildEmailHtml(stats, weekLabel);
    const text = `ZTVLIVE Weekly Broadcast Report — ${weekLabel}\n\nTotal Users: ${stats.totalUsers} (+${stats.newUsersThisWeek} this week)\nContent Library: ${stats.totalVideos} (+${stats.newVideosThisWeek} this week)\nPaid Subscribers: ${stats.paidSubscribers}\nActive Creators: ${stats.totalCreators}\nNewsletter List: ${stats.newsletterCount}\nWatchlist Adds (this week): ${stats.totalWatchlistAdds}\n\nhttps://ztvlivestream.com`;

    const transporter = createTransport();
    const info = await transporter.sendMail({
      from: '"ZTVLIVE Reports" <admin@ztvlivestream.com>',
      to: "kevinniev1@gmail.com",
      subject: `📊 ZTVLIVE Weekly Broadcast Report — ${weekLabel}`,
      html,
      text,
    });

    return res.json({
      ok: true,
      messageId: info.messageId,
      weekLabel,
      stats: {
        totalUsers: stats.totalUsers,
        newUsersThisWeek: stats.newUsersThisWeek,
        totalVideos: stats.totalVideos,
        paidSubscribers: stats.paidSubscribers,
      },
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[weekly-report] Error:", error);
    return res.status(500).json({
      error,
      stack,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
