"use client";

import { ChevronDown, ChevronRight, MapPin, Tags, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { isSelected, type ProgramNode } from "@/lib/program-view/tree";
import type { GalleryFilters } from "@/types/gallery";

const ICON = { staff: Users, village: MapPin, activity: Tags } as const;

/** Staff > Village > Activity. Click a row to show its photos; the arrow opens or closes it. */
export function ProgramTreePanel({
  nodes,
  filters,
  expanded,
  onToggle,
  onSelect,
  photosLabel,
}: {
  nodes: ProgramNode[];
  filters: GalleryFilters;
  expanded: Set<string>;
  onToggle: (key: string) => void;
  onSelect: (node: ProgramNode) => void;
  photosLabel: (n: number) => string;
}) {
  return (
    <ul role="tree" className="flex flex-col">
      {nodes.map((n) => (
        <Node key={n.key} node={n} depth={0} filters={filters} expanded={expanded} onToggle={onToggle} onSelect={onSelect} photosLabel={photosLabel} />
      ))}
    </ul>
  );
}

function Node({ node, depth, filters, expanded, onToggle, onSelect, photosLabel }: { node: ProgramNode; depth: number } & Omit<Parameters<typeof ProgramTreePanel>[0], "nodes">) {
  const open = expanded.has(node.key);
  const hasChildren = node.children.length > 0;
  const selected = isSelected(node, filters);
  const Icon = ICON[node.kind];
  return (
    <li role="treeitem" aria-expanded={hasChildren ? open : undefined} aria-selected={selected}>
      <div className={cn("flex min-h-10 items-center gap-1 rounded-md pr-2", selected ? "bg-primary/10 font-semibold" : "hover:bg-secondary")} style={{ paddingLeft: depth * 14 + 4 }}>
        {hasChildren ? (
          <button type="button" onClick={() => onToggle(node.key)} className="grid size-8 shrink-0 place-items-center rounded-md" aria-label={node.name}>
            {open ? <ChevronDown className="size-4" aria-hidden /> : <ChevronRight className="size-4" aria-hidden />}
          </button>
        ) : (
          <span className="size-8 shrink-0" aria-hidden />
        )}
        <button
          type="button"
          disabled={!node.select}
          onClick={() => {
            onSelect(node);
            if (hasChildren && !open) onToggle(node.key);
          }}
          className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left text-sm disabled:cursor-default"
          title={photosLabel(node.count)}
        >
          <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          {node.color ? <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: node.color }} aria-hidden /> : null}
          <span className="min-w-0 flex-1 truncate">
            {node.name}
            {node.sub ? <span className="ml-1 text-xs font-normal text-muted-foreground">({node.sub})</span> : null}
          </span>
          <span className="shrink-0 rounded-full bg-secondary px-2 text-xs tabular-nums">{node.count}</span>
        </button>
      </div>
      {hasChildren && open ? (
        <ul role="group">
          {node.children.map((c) => (
            <Node key={c.key} node={c} depth={depth + 1} filters={filters} expanded={expanded} onToggle={onToggle} onSelect={onSelect} photosLabel={photosLabel} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
