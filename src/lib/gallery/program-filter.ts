import type { GalleryFilters } from "@/types/gallery";

/**
 * The program the gallery is narrowed to: the first part of every ticked folder ("program/district/..."), when they all
 * agree. Choosing a program in the filter bar ticks that program's folder, so the folder tree and the program
 * dropdown always tell the same story. null = no program chosen, or folders of several programs.
 */
export function programOfFilters(f: Pick<GalleryFilters, "folders">): string | null {
  const ids = new Set(f.folders.map((k) => k.split("/")[0]));
  if (ids.size !== 1) return null;
  const id = [...ids][0];
  return id && id !== "none" ? id : null;
}

/** True when the ticked folders belong to more than one program. */
export function hasSeveralPrograms(f: Pick<GalleryFilters, "folders">): boolean {
  return new Set(f.folders.map((k) => k.split("/")[0])).size > 1;
}

/** How many filter groups are on (shown on the phone's Filters button). */
export function activeFilterCount(f: GalleryFilters): number {
  return (
    [f.from, f.to, f.consent, f.rating, f.uploader, f.hasStory, f.unused].filter((v) => v !== undefined && v !== false).length +
    [f.folders, f.activity, f.themes, f.categories].filter((a) => a.length > 0).length
  );
}
