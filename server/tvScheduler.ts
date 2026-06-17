/**
 * ZTVLIVE 24/7 Deterministic TV Scheduler
 *
 * Mirrors the original Python tv_scheduler.py logic:
 * - Uses a daily seed (YYYYMMDD) so ALL viewers see the same video at the same position
 * - Videos weighted by category size (tech 456 → more slots, gaming 29 → fewer)
 * - Creator bookings slot in at their reserved times
 * - Returns elapsed_seconds so the frontend can seek YouTube to the right position
 */

import { getDb } from "./db";
import { videos, scheduleItems } from "../drizzle/schema";
import { and, gte, lte, isNotNull } from "drizzle-orm";

// ── Category weights (proportional to library size) ──────────────────────────
const CATEGORY_WEIGHTS: Record<string, number> = {
  tech: 45,
  gaming: 20,
  movies: 10,
  news: 8,
  sports: 5,
  podcasts: 5,
  music: 4,
  other: 3,
};

// ── Seeded pseudo-random number generator (Mulberry32) ───────────────────────
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Parse duration string (e.g. "PT12M34S", "12:34", "754") → seconds ────────
export function parseDurationToSeconds(dur: string | null | undefined): number {
  if (!dur) return 600; // default 10 min
  // ISO 8601: PT1H2M3S
  const iso = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (iso) {
    return (parseInt(iso[1] ?? "0") * 3600) +
           (parseInt(iso[2] ?? "0") * 60) +
           parseInt(iso[3] ?? "0");
  }
  // HH:MM:SS or MM:SS
  const parts = dur.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  // Plain seconds
  const n = parseInt(dur);
  if (!isNaN(n) && n > 0) return n;
  return 600;
}

// ── Build a daily seed from YYYYMMDD ─────────────────────────────────────────
function dailySeed(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  return y * 10000 + m * 100 + d;
}

// ── Weighted category picker ──────────────────────────────────────────────────
function pickCategory(rand: () => number, available: string[]): string {
  const weights = available.map((c) => CATEGORY_WEIGHTS[c] ?? 1);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < available.length; i++) {
    r -= weights[i];
    if (r <= 0) return available[i];
  }
  return available[available.length - 1];
}

// ── Shuffle array with seeded RNG ─────────────────────────────────────────────
function seededShuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface ScheduleSlot {
  videoId: string;       // YouTube video ID
  title: string;
  category: string;
  thumbnailUrl: string;
  durationSeconds: number;
  startSecond: number;   // seconds from midnight UTC
  endSecond: number;
  creatorName?: string;
  isCreatorBooking?: boolean;
}

// ── In-memory cache: keyed by YYYYMMDD ───────────────────────────────────────
const scheduleCache = new Map<number, ScheduleSlot[]>();

// ── Generate full-day schedule ────────────────────────────────────────────────
export async function getDaySchedule(date: Date): Promise<ScheduleSlot[]> {
  const seed = dailySeed(date);
  if (scheduleCache.has(seed)) return scheduleCache.get(seed)!;

  const db = await getDb();
  if (!db) return [];

  // 1. Fetch all videos with a youtubeId
  const allVideos = await db
    .select({
      id: videos.id,
      youtubeId: videos.youtubeId,
      title: videos.title,
      category: videos.category,
      thumbnailUrl: videos.thumbnailUrl,
      duration: videos.duration,
      creatorName: videos.creatorName,
    })
    .from(videos)
    .where(isNotNull(videos.youtubeId));

  if (allVideos.length === 0) return [];

  // 2. Group by category
  const byCategory: Record<string, typeof allVideos> = {};
  for (const v of allVideos) {
    if (!byCategory[v.category]) byCategory[v.category] = [];
    byCategory[v.category].push(v);
  }
  const availableCategories = Object.keys(byCategory);

  // 3. Shuffle each category pool with today's seed
  const rand = mulberry32(seed);
  const shuffled: Record<string, typeof allVideos> = {};
  for (const cat of availableCategories) {
    shuffled[cat] = seededShuffle(byCategory[cat], rand);
  }
  const catPointers: Record<string, number> = {};
  for (const cat of availableCategories) catPointers[cat] = 0;

  // 4. Fetch creator bookings for today (UTC window)
  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setUTCHours(23, 59, 59, 999);

  const bookings = await db
    .select()
    .from(scheduleItems)
    .where(
      and(
        gte(scheduleItems.startTime, dayStart.getTime()),
        lte(scheduleItems.startTime, dayEnd.getTime())
      )
    );

  // Convert bookings to blocked time ranges (seconds from midnight UTC)
  const blockedRanges: { start: number; end: number; slot: ScheduleSlot }[] = [];
  for (const b of bookings) {
    if (!b.youtubeId) continue;
    const startSec = Math.floor((b.startTime - dayStart.getTime()) / 1000);
    const dur = b.endTime > b.startTime ? Math.floor((b.endTime - b.startTime) / 1000) : 1800;
    blockedRanges.push({
      start: startSec,
      end: startSec + dur,
      slot: {
        videoId: b.youtubeId,
        title: b.title,
        category: b.category ?? "other",
        thumbnailUrl: b.thumbnailUrl ?? `https://img.youtube.com/vi/${b.youtubeId}/maxresdefault.jpg`,
        durationSeconds: dur,
        startSecond: startSec,
        endSecond: startSec + dur,
        isCreatorBooking: true,
      },
    });
  }
  blockedRanges.sort((a, b) => a.start - b.start);

  // 5. Fill the day with videos, skipping blocked ranges
  const SECONDS_IN_DAY = 86400;
  const schedule: ScheduleSlot[] = [];
  let cursor = 0;

  // Insert creator bookings first
  for (const b of blockedRanges) {
    schedule.push(b.slot);
  }

  // Fill gaps
  while (cursor < SECONDS_IN_DAY) {
    // Check if cursor falls inside a booking
    const booking = blockedRanges.find((b) => cursor >= b.start && cursor < b.end);
    if (booking) {
      cursor = booking.end;
      continue;
    }

    // Find next booking start (to know how much space we have)
    const nextBooking = blockedRanges.find((b) => b.start > cursor);
    const spaceAvailable = nextBooking ? nextBooking.start - cursor : SECONDS_IN_DAY - cursor;
    if (spaceAvailable <= 0) break;

    // Pick a category and video
    const cat = pickCategory(rand, availableCategories);
    const pool = shuffled[cat];
    if (!pool || pool.length === 0) { cursor += 600; continue; }

    const idx = catPointers[cat] % pool.length;
    catPointers[cat]++;
    const v = pool[idx];
    const dur = parseDurationToSeconds(v.duration);

    // Skip if video is too long for remaining space (but allow up to 2x overflow for last slot)
    if (dur > spaceAvailable + 600 && cursor + dur < SECONDS_IN_DAY) {
      // try a shorter video — just advance cursor a bit and retry
      cursor += 30;
      continue;
    }

    schedule.push({
      videoId: v.youtubeId,
      title: v.title,
      category: v.category,
      thumbnailUrl: v.thumbnailUrl ?? `https://img.youtube.com/vi/${v.youtubeId}/maxresdefault.jpg`,
      durationSeconds: dur,
      startSecond: cursor,
      endSecond: cursor + dur,
      creatorName: v.creatorName ?? undefined,
    });

    cursor += dur;
  }

  // Sort by start time
  schedule.sort((a, b) => a.startSecond - b.startSecond);

  // Cache for this day
  scheduleCache.set(seed, schedule);
  // Clean old cache entries (keep only last 3 days)
  if (scheduleCache.size > 3) {
    const oldest = Array.from(scheduleCache.keys()).sort()[0];
    scheduleCache.delete(oldest);
  }

  return schedule;
}

// ── Get currently playing video ───────────────────────────────────────────────
export interface LiveSyncResult {
  videoId: string;
  title: string;
  category: string;
  thumbnailUrl: string;
  durationSeconds: number;
  elapsedSeconds: number;      // how far into the video all viewers should seek
  remainingSeconds: number;
  startSecond: number;         // slot start (seconds from midnight UTC)
  endSecond: number;
  upNext: ScheduleSlot | null;
  isCreatorBooking: boolean;
  embedUrl: string;            // ready-to-use YouTube embed URL with ?start=
}

export async function getLiveSync(now?: Date): Promise<LiveSyncResult | null> {
  const date = now ?? new Date();
  const schedule = await getDaySchedule(date);
  if (schedule.length === 0) return null;

  // Seconds elapsed since UTC midnight
  const midnight = new Date(date);
  midnight.setUTCHours(0, 0, 0, 0);
  const secondsFromMidnight = Math.floor((date.getTime() - midnight.getTime()) / 1000);

  // Find the current slot
  const current = schedule.find(
    (s) => secondsFromMidnight >= s.startSecond && secondsFromMidnight < s.endSecond
  );

  if (!current) {
    // Fallback: use first slot of next day (edge case at midnight)
    const slot = schedule[0];
    return {
      ...slot,
      elapsedSeconds: 0,
      remainingSeconds: slot.durationSeconds,
      upNext: schedule[1] ?? null,
      isCreatorBooking: slot.isCreatorBooking ?? false,
      embedUrl: `https://www.youtube.com/embed/${slot.videoId}?autoplay=1&start=0`,
    };
  }

  const elapsedSeconds = secondsFromMidnight - current.startSecond;
  const remainingSeconds = current.durationSeconds - elapsedSeconds;

  // Find up next
  const currentIdx = schedule.indexOf(current);
  const upNext = schedule[currentIdx + 1] ?? null;

  return {
    ...current,
    elapsedSeconds,
    remainingSeconds,
    upNext,
    isCreatorBooking: current.isCreatorBooking ?? false,
    embedUrl: `https://www.youtube.com/embed/${current.videoId}?autoplay=1&start=${elapsedSeconds}&rel=0&modestbranding=1`,
  };
}

// ── Get upcoming schedule (next N slots) ─────────────────────────────────────
export async function getUpcomingSchedule(count = 10, now?: Date): Promise<ScheduleSlot[]> {
  const date = now ?? new Date();
  const schedule = await getDaySchedule(date);

  const midnight = new Date(date);
  midnight.setUTCHours(0, 0, 0, 0);
  const secondsFromMidnight = Math.floor((date.getTime() - midnight.getTime()) / 1000);

  const upcoming = schedule.filter((s) => s.endSecond > secondsFromMidnight);
  return upcoming.slice(0, count);
}
