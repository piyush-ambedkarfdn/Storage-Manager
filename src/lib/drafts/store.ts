/**
 * Short-lived drafts kept in the browser, so what a person typed survives switching tabs, a reload or a closed page,
 * and is deleted by itself after a while. Values live in localStorage (or sessionStorage) as
 * { v, exp, data }; an entry past `exp` is never returned and is removed. Every key carries the signed-in person's id,
 * so two people sharing a phone never see each other's drafts. Nothing here throws: private mode or a full disk just
 * means "no draft".
 */

const PREFIX = "so:draft:";
const VERSION = 1;

export const TTL = {
  /** a half-filled upload (details and prepared photos) */
  upload: 24 * 60 * 60_000,
  /** a post being written in the calendar */
  calendarItem: 12 * 60 * 60_000,
  /** the gallery filters last used */
  galleryFilters: 30 * 60_000,
} as const;

type Entry<T> = { v: number; exp: number; data: T };
export type DraftStorage = "local" | "session";

function area(kind: DraftStorage): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return kind === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

export const draftKey = (userId: string, name: string) => `${PREFIX}${userId}:${name}`;

export function saveDraft<T>(key: string, data: T, ttlMs: number, kind: DraftStorage = "local", now = Date.now()): void {
  const s = area(kind);
  if (!s) return;
  try {
    const entry: Entry<T> = { v: VERSION, exp: now + ttlMs, data };
    s.setItem(key, JSON.stringify(entry));
  } catch {
    // storage full or blocked: the draft is simply not kept
  }
}

export function loadDraft<T>(key: string, kind: DraftStorage = "local", now = Date.now()): T | null {
  const s = area(kind);
  if (!s) return null;
  try {
    const raw = s.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as Entry<T>;
    if (entry?.v !== VERSION || typeof entry.exp !== "number" || entry.exp <= now) {
      s.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    try {
      s.removeItem(key);
    } catch {
      /* ignore */
    }
    return null;
  }
}

export function clearDraft(key: string, kind: DraftStorage = "local"): void {
  try {
    area(kind)?.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Removes every expired draft (both storages). Cheap: only keys that start with our prefix are read. */
export function purgeExpiredDrafts(now = Date.now()): number {
  let removed = 0;
  for (const kind of ["local", "session"] as const) {
    const s = area(kind);
    if (!s) continue;
    try {
      const keys: string[] = [];
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i);
        if (k?.startsWith(PREFIX)) keys.push(k);
      }
      for (const k of keys) {
        const before = s.getItem(k);
        if (loadDraft(k, kind, now) === null && before !== null) removed++;
      }
    } catch {
      /* ignore */
    }
  }
  return removed;
}

/** Sign-out: nothing typed by this person stays on the device. */
export function clearAllDrafts(): void {
  for (const kind of ["local", "session"] as const) {
    const s = area(kind);
    if (!s) continue;
    try {
      const keys: string[] = [];
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i);
        if (k?.startsWith(PREFIX)) keys.push(k);
      }
      keys.forEach((k) => s.removeItem(k));
    } catch {
      /* ignore */
    }
  }
}
