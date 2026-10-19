import type { ProviderName } from "@/types/storage";

export const CLEANUP_ONLY = ["downloaded", "unused", "low_quality"] as const;
export type CleanupOnly = (typeof CLEANUP_ONLY)[number];

export type CleanupFilters = {
  olderThanDays: number;
  programId?: string | null;
  uploaderId?: string | null;
  only?: CleanupOnly | null;
};

export type CleanupPreview = {
  count: number;
  bytes: number;
  /** what archiving frees (originals only; thumbnails stay) */
  archiveBytes: number;
  byProvider: Record<ProviderName, { count: number; bytes: number }>;
  sample: { id: string; thumbUrl: string }[];
};

export type ApplyResult = { done: number; remaining: number; failed: { id: string; error: string }[] };

export type TrashItem = {
  id: string;
  thumbUrl: string;
  village_name: string | null;
  event_date: string | null;
  trashed_at: string;
  purgeOn: string;
  size_bytes: number;
  storage_provider: ProviderName;
};

export type StorageSettings = {
  limit_bytes: number;
  warn_pct: number;
  amber_pct: number;
  block_pct: number;
  trash_days: number;
};

export type UploadRate = { provider: ProviderName; bytes: number; photos: number };

export type MovePreview = { count: number; bytes: number; archived: number };
export type MoveBatchResult = { moved: number; failed: { id: string; error: string }[]; remaining: number };
