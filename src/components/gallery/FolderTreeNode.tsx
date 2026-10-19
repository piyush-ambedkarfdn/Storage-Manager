"use client";

import { ChevronDown, ChevronRight, Folder, FolderOpen } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { checkState } from "@/lib/gallery/tree";
import { cn } from "@/lib/utils";
import type { FolderKey, TreeNode } from "@/types/gallery";

/** One explorer row (VS Code style): arrow, tri-state checkbox, folder icon, name, count; children below. */
export function FolderTreeNode({
  node,
  depth,
  selected,
  expanded,
  visible,
  onCheck,
  onExpand,
}: {
  node: TreeNode;
  depth: number;
  selected: FolderKey[];
  expanded: Set<FolderKey>;
  /** when searching: only these keys are shown */
  visible: Set<FolderKey> | null;
  onCheck: (key: FolderKey) => void;
  onExpand: (key: FolderKey) => void;
}) {
  if (visible && !visible.has(node.key)) return null;
  const state = checkState(node.key, selected);
  const hasChildren = node.children.length > 0 && node.level !== "village";
  const open = hasChildren && (expanded.has(node.key) || !!visible);
  const Icon = open ? FolderOpen : Folder;
  const id = `tree-${node.key.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <li role="treeitem" aria-expanded={hasChildren ? open : undefined} aria-level={depth + 1} aria-selected={state === "checked"}>
      <div
        className={cn("flex min-h-9 items-center gap-1.5 rounded-md pr-2 text-sm hover:bg-secondary", state === "checked" && "bg-marigold/15")}
        style={{ paddingLeft: depth * 14 + 4 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onExpand(node.key)}
            className="grid size-7 shrink-0 place-items-center rounded text-muted-foreground hover:bg-background"
            aria-label={open ? `Collapse ${node.name}` : `Expand ${node.name}`}
          >
            {open ? <ChevronDown className="size-4" aria-hidden /> : <ChevronRight className="size-4" aria-hidden />}
          </button>
        ) : (
          <span className="size-7 shrink-0" />
        )}
        <Checkbox
          id={id}
          checked={state === "checked" ? true : state === "indeterminate" ? "indeterminate" : false}
          onCheckedChange={() => onCheck(node.key)}
        />
        <Icon className="size-4 shrink-0 text-marigold-ink" aria-hidden />
        <label
          htmlFor={id}
          className={cn("min-w-0 flex-1 cursor-pointer truncate", node.level === "program" && "font-semibold", node.id === null && "italic text-muted-foreground")}
          onDoubleClick={() => hasChildren && onExpand(node.key)}
        >
          {node.name}
        </label>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{node.count}</span>
      </div>
      {open ? (
        <ul role="group">
          {node.children.map((c) => (
            <FolderTreeNode
              key={c.key}
              node={c}
              depth={depth + 1}
              selected={selected}
              expanded={expanded}
              visible={visible}
              onCheck={onCheck}
              onExpand={onExpand}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
