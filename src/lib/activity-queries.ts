import "server-only";
import type { Session } from "@/lib/auth";
import { toApiError } from "@/lib/options";
import type { TimelineQuery } from "@/lib/schemas/activity";
import { ACTIVITY_GROUPS, type DayCount, type StaffStat, type TimelineEntry } from "@/types/activity-view";

/** Admin-only reads for the staff activity page (activity_log is readable by admins only). */

export async function getStaffStats(session: Session): Promise<StaffStat[]> {
  const { data, error } = await session.supabase.rpc("staff_stats");
  if (error) throw toApiError(error);
  return ((data ?? []) as StaffStat[]).map((r) => ({
    ...r,
    photos_total: Number(r.photos_total),
    photos_week: Number(r.photos_week),
    storage_bytes: Number(r.storage_bytes),
    names_suggested: Number(r.names_suggested),
    reports_total: Number(r.reports_total),
  }));
}

export async function getUploadsPerDay(session: Session, userId: string, days = 14): Promise<DayCount[]> {
  const { data, error } = await session.supabase.rpc("uploads_per_day", { p_user: userId, p_days: days });
  if (error) throw toApiError(error);
  return ((data ?? []) as { day: string; photos: number }[]).map((d) => ({ day: d.day, photos: Number(d.photos) }));
}

/** Dates in the filter are India dates; activity_log stores UTC. */
const istStart = (d: string) => new Date(`${d}T00:00:00+05:30`).toISOString();
const istEnd = (d: string) => new Date(`${d}T23:59:59.999+05:30`).toISOString();

export async function getTimeline(session: Session, q: TimelineQuery): Promise<{ entries: TimelineEntry[]; nextCursor: string | null }> {
  let query = session.supabase
    .from("activity_log")
    .select("id, action, entity_type, entity_id, detail, created_at, actor, who:profiles!actor(full_name)")
    .order("created_at", { ascending: false })
    .limit(q.limit);
  if (q.user) query = query.eq("actor", q.user);
  if (q.group) query = query.in("action", [...ACTIVITY_GROUPS[q.group]]);
  if (q.from) query = query.gte("created_at", istStart(q.from));
  if (q.to) query = query.lte("created_at", istEnd(q.to));
  if (q.cursor) query = query.lt("created_at", q.cursor);
  const { data, error } = await query;
  if (error) throw toApiError(error);
  const entries = ((data ?? []) as unknown as (Omit<TimelineEntry, "actor_name"> & { who: { full_name: string | null } | null })[]).map(
    ({ who, ...e }) => ({ ...e, actor_name: who?.full_name ?? null }),
  );
  return { entries, nextCursor: entries.length === q.limit ? entries[entries.length - 1].created_at : null };
}
