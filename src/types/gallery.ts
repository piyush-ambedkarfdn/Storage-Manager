import type { Consent, PhotoDto } from "@/types/photo";

export const TREE_LEVELS = ["program", "district", "panchayat", "village"] as const;
export type TreeLevel = (typeof TREE_LEVELS)[number];

/**
 * A folder in the explorer is identified by its path of ids: "programId/districtId/panchayatId/villageId",
 * shorter for higher levels, with "none" where the photo has no value (e.g. no village).
 */
export type FolderKey = string;

export type TreeNode = {
  key: FolderKey;
  level: TreeLevel;
  id: string | null;
  name: string;
  count: number;
  children: TreeNode[];
};

export type GalleryFilters = {
  folders: FolderKey[];
  activity: string[];
  themes: string[];
  from?: string;
  to?: string;
  consent?: Consent;
  hasStory?: boolean;
  uploader?: string;
  /** not used in any calendar post yet (phase 6) */
  unused?: boolean;
  /** program category option ids (any of them) */
  categories: string[];
  /** 1-5 = that many stars or more, 0 = not rated */
  rating?: number;
};

export const EMPTY_FILTERS: GalleryFilters = { folders: [], activity: [], themes: [], categories: [] };

export type GalleryPhoto = PhotoDto & {
  program_name: string | null;
  district_name: string | null;
  panchayat_name: string | null;
  village_name: string | null;
};

export type GalleryPage = { photos: GalleryPhoto[]; nextCursor: string | null; total: number | null };

export const DOWNLOAD_LEVELS = ["program", "district", "block", "panchayat", "village", "month", "activity"] as const;
export type DownloadLevel = (typeof DOWNLOAD_LEVELS)[number];

export type ManifestFile = { photoId: string; path: string; url: string; size: number };
export type DownloadManifest = { files: ManifestFile[]; csv: string; totalBytes: number; skippedArchived: number };
