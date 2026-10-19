import { NONE } from "@/lib/gallery/filters";
import { TREE_LEVELS, type FolderKey, type TreeNode } from "@/types/gallery";

/** Row of folder_counts() (migration 0004). */
export type FolderCountRow = {
  program_id: string | null;
  program: string | null;
  district_id: string | null;
  district: string | null;
  panchayat_id: string | null;
  panchayat: string | null;
  village_id: string | null;
  village: string | null;
  photo_count: number;
};

/** Builds Program > District > Panchayat > Village with counts summed upwards. */
export function buildTree(rows: FolderCountRow[], unknownLabel = "Unknown"): TreeNode[] {
  const roots: TreeNode[] = [];
  const index = new Map<string, TreeNode>();
  for (const r of rows) {
    const ids = [r.program_id, r.district_id, r.panchayat_id, r.village_id];
    const names = [r.program, r.district, r.panchayat, r.village];
    let siblings = roots;
    let key = "";
    for (let i = 0; i < 4; i++) {
      key = key ? `${key}/${ids[i] ?? NONE}` : (ids[i] ?? NONE);
      let node = index.get(key);
      if (!node) {
        node = { key, level: TREE_LEVELS[i], id: ids[i], name: names[i] ?? unknownLabel, count: 0, children: [] };
        index.set(key, node);
        siblings.push(node);
      }
      node.count += Number(r.photo_count);
      siblings = node.children;
    }
  }
  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => (a.id === null ? 1 : b.id === null ? -1 : a.name.localeCompare(b.name)));
    nodes.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

export function indexTree(nodes: TreeNode[], map = new Map<FolderKey, TreeNode>()): Map<FolderKey, TreeNode> {
  for (const n of nodes) {
    map.set(n.key, n);
    indexTree(n.children, map);
  }
  return map;
}

const parentKey = (key: FolderKey) => key.split("/").slice(0, -1).join("/");
const isUnder = (key: FolderKey, ancestor: FolderKey) => key.startsWith(`${ancestor}/`);

export type CheckState = "checked" | "indeterminate" | "unchecked";

/** Checked when the folder or one above it is ticked; partly when something inside it is ticked. */
export function checkState(key: FolderKey, selected: FolderKey[]): CheckState {
  if (selected.some((s) => s === key || isUnder(key, s))) return "checked";
  if (selected.some((s) => isUnder(s, key))) return "indeterminate";
  return "unchecked";
}

/**
 * Ticking a folder ticks everything inside it. Unticking one folder inside a ticked parent keeps its
 * siblings ticked. When every child of a folder ends up ticked, the folder itself is ticked instead.
 */
export function toggleFolder(key: FolderKey, selected: FolderKey[], index: Map<FolderKey, TreeNode>): FolderKey[] {
  const state = checkState(key, selected);
  let next: FolderKey[];
  if (state === "checked") {
    const ancestor = selected.find((s) => s === key || isUnder(key, s))!;
    next = selected.filter((s) => s !== ancestor);
    // re-tick everything under the ancestor except the branch leading to `key`
    let current = ancestor;
    while (current !== key) {
      const node = index.get(current);
      if (!node) break;
      const step = node.children.find((c) => c.key === key || isUnder(key, c.key));
      node.children.forEach((c) => {
        if (c !== step) next.push(c.key);
      });
      if (!step) break;
      current = step.key;
    }
  } else {
    next = [...selected.filter((s) => !isUnder(s, key)), key];
    // collapse upwards: all children ticked -> tick the parent
    let child = key;
    for (;;) {
      const p = parentKey(child);
      const parent = p ? index.get(p) : undefined;
      if (!parent) break;
      if (!parent.children.every((c) => next.includes(c.key))) break;
      next = [...next.filter((s) => !parent.children.some((c) => c.key === s)), parent.key];
      child = parent.key;
    }
  }
  return next;
}

/** "Program / District / Panchayat" labels for a folder key. */
export function folderLabel(key: FolderKey, index: Map<FolderKey, TreeNode>): string {
  const parts = key.split("/");
  return parts
    .map((_, i) => index.get(parts.slice(0, i + 1).join("/"))?.name ?? "…")
    .join(" / ");
}

/** Folders matching a search (and their ancestors, so they can be shown expanded). */
export function searchTree(nodes: TreeNode[], q: string): Set<FolderKey> {
  const hits = new Set<FolderKey>();
  const needle = q.trim().toLowerCase();
  if (!needle) return hits;
  const walk = (n: TreeNode): boolean => {
    const childHit = n.children.map(walk).some(Boolean);
    const self = n.name.toLowerCase().includes(needle);
    if (self || childHit) hits.add(n.key);
    return self || childHit;
  };
  nodes.forEach(walk);
  return hits;
}
