import { NONE } from "@/lib/gallery/filters";
import type { GalleryFilters } from "@/types/gallery";
import type { ProgramTreeRow } from "@/types/program-view";

/** What the gallery filters become when a node is chosen (null = no filter of that kind; the grid is the normal gallery grid). */
export type ProgramSelect = { uploader: string | null; folder: string | null; option: string | null };

export type ProgramNode = {
  key: string;
  kind: "staff" | "village" | "activity";
  name: string;
  /** small grey text, e.g. the district of a village */
  sub?: string;
  color?: string | null;
  count: number;
  children: ProgramNode[];
  /** null: this node cannot be used as a filter (photos with no uploader) */
  select: ProgramSelect | null;
};

/** Staff > Village > Activity for one program, with counts summed upwards. Photos with no activity stay in the village count. */
export function buildProgramTree(rows: ProgramTreeRow[], programId: string, locale: string, labels: { unknownStaff: string; unknownVillage: string }): ProgramNode[] {
  const staffNodes = new Map<string, ProgramNode>();
  const villageNodes = new Map<string, ProgramNode>();
  const roots: ProgramNode[] = [];

  for (const r of rows) {
    const n = Number(r.photo_count);
    const staffKey = r.staff_id ?? NONE;
    let staff = staffNodes.get(staffKey);
    if (!staff) {
      staff = {
        key: `s:${staffKey}`,
        kind: "staff",
        name: r.staff ?? labels.unknownStaff,
        count: 0,
        children: [],
        select: r.staff_id ? { uploader: r.staff_id, folder: programId, option: null } : null,
      };
      staffNodes.set(staffKey, staff);
      roots.push(staff);
    }
    staff.count += n;

    const folder = [programId, r.district_id ?? NONE, r.panchayat_id ?? NONE, r.village_id ?? NONE].join("/");
    const villageKey = `${staffKey}|${folder}`;
    let village = villageNodes.get(villageKey);
    if (!village) {
      village = {
        key: `v:${villageKey}`,
        kind: "village",
        name: r.village ?? labels.unknownVillage,
        sub: r.district ?? undefined,
        count: 0,
        children: [],
        select: r.staff_id ? { uploader: r.staff_id, folder, option: null } : null,
      };
      villageNodes.set(villageKey, village);
      staff.children.push(village);
    }
    village.count += n;

    if (r.option_id) {
      village.children.push({
        key: `a:${villageKey}|${r.option_id}`,
        kind: "activity",
        name: (locale === "hi" && r.option_name_hi) || r.option_name || "",
        color: r.option_color,
        count: n,
        children: [],
        select: r.staff_id ? { uploader: r.staff_id, folder, option: r.option_id } : null,
      });
    }
  }

  const byName = (a: ProgramNode, b: ProgramNode) => a.name.localeCompare(b.name);
  roots.sort(byName);
  for (const s of roots) s.children.sort(byName); // villages by name; activities keep the order the admin set (the query sorts them)
  return roots;
}

/** Does this node match what the page address currently filters on? */
export function isSelected(node: ProgramNode, f: GalleryFilters): boolean {
  if (!node.select) return false;
  return (
    (f.uploader ?? null) === node.select.uploader &&
    (f.folders.length === 1 ? f.folders[0] : null) === node.select.folder &&
    (f.categories.length === 1 ? f.categories[0] : f.categories.length === 0 ? null : "many") === node.select.option
  );
}

/** The chosen node and the nodes above it (staff > village > activity), or [] when nothing in the tree is chosen. */
export function selectedPath(nodes: ProgramNode[], f: GalleryFilters): ProgramNode[] {
  for (const n of nodes) {
    if (isSelected(n, f)) return [n];
    const below = selectedPath(n.children, f);
    if (below.length) return [n, ...below];
  }
  return [];
}
