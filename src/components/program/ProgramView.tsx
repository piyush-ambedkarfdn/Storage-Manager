"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { PhotoGrid } from "@/components/gallery/PhotoGrid";
import { ProgramTreePanel } from "@/components/program/ProgramTreePanel";
import { useGalleryFilters } from "@/hooks/useGalleryFilters";
import { useProgramView } from "@/hooks/useProgramView";
import { buildProgramTree, selectedPath, type ProgramNode } from "@/lib/program-view/tree";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n/provider";
import { programViewMessages } from "@/lib/i18n/messages/program-view";

/**
 * The Program tab. Left: programs, and for the chosen one Staff > Village > Activity with counts.
 * Right: the normal gallery grid, filtered by what is chosen (it reads the same ?f= ?by= ?c= address).
 */
export function ProgramView() {
  const t = useT(programViewMessages);
  const locale = useLocale();
  const { filters, setFilters } = useGalleryFilters();
  const first = filters.folders[0]?.split("/")[0];
  const programId = first && first !== "none" ? first : null;
  const [expandedOverride, setExpanded] = useState<Set<string> | null>(null);
  const query = useProgramView(programId);
  const data = query.data;

  const tree = useMemo(
    () => (programId && data ? buildProgramTree(data.rows, programId, locale, { unknownStaff: t("unknownStaff"), unknownVillage: t("unknownVillage") }) : []),
    [programId, data, locale, t],
  );
  const path = useMemo(() => selectedPath(tree, filters), [tree, filters]);
  // staff start open
  const expanded = useMemo(() => expandedOverride ?? new Set(tree.map((n) => n.key)), [expandedOverride, tree]);
  const allKeys = useMemo(() => {
    const keys: string[] = [];
    const walk = (nodes: ProgramNode[]) => nodes.forEach((n) => (n.children.length ? (keys.push(n.key), walk(n.children)) : undefined));
    walk(tree);
    return keys;
  }, [tree]);

  const program = data?.programs.find((p) => p.program_id === programId);

  function chooseProgram(id: string) {
    setExpanded(null);
    setFilters({ folders: [id], uploader: undefined, categories: [], activity: [] });
  }
  function chooseNode(node: ProgramNode) {
    if (!programId || !node.select) return;
    setFilters({ folders: [node.select.folder ?? programId], uploader: node.select.uploader ?? undefined, activity: node.select.activity ? [node.select.activity] : [] });
  }
  function toggle(key: string) {
    const next = new Set(expanded);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpanded(next);
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="flex flex-col overflow-hidden rounded-lg border bg-card lg:sticky lg:top-16">
        <h2 className="bg-secondary px-3 py-1.5 text-xs font-bold tracking-wide uppercase">{t("programs")}</h2>
        <div className="flex flex-col gap-1 p-2">
          {query.isLoading ? (
            <Skeleton className="h-10" />
          ) : query.error ? (
            <p role="alert" className="p-2 text-sm text-destructive">
              {query.error instanceof Error ? query.error.message : t("errorLoad")}
            </p>
          ) : data?.programs.length ? (
            data.programs.map((p) => (
              <button
                key={p.program_id}
                type="button"
                onClick={() => chooseProgram(p.program_id)}
                aria-pressed={p.program_id === programId}
                className={cn("flex min-h-10 items-center gap-2 rounded-md px-3 text-left text-sm font-medium", p.program_id === programId ? "bg-primary text-primary-foreground" : "hover:bg-secondary")}
              >
                <span className="min-w-0 flex-1 truncate">{p.program}</span>
                <span className="shrink-0 text-xs tabular-nums opacity-80">{p.photo_count}</span>
              </button>
            ))
          ) : (
            <p className="p-2 text-sm text-muted-foreground">{t("noPrograms")}</p>
          )}
        </div>

        {programId && data ? (
          <div className="flex flex-col gap-2 border-t p-2">
            {tree.length ? (
              <>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setExpanded(new Set(allKeys))}>
                    {t("expandAll")}
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setExpanded(new Set())}>
                    {t("collapseAll")}
                  </Button>
                </div>
                <div className="max-h-[65dvh] overflow-y-auto">
                  <ProgramTreePanel nodes={tree} filters={filters} expanded={expanded} onToggle={toggle} onSelect={chooseNode} photosLabel={(n) => t("photosN", { n })} />
                </div>
              </>
            ) : query.isFetching ? (
              <Skeleton className="h-24" />
            ) : (
              <p className="p-2 text-sm text-muted-foreground">{t("noPhotos")}</p>
            )}
          </div>
        ) : null}
      </aside>

      <div className="flex min-w-0 flex-col gap-3">
        {programId ? (
          <>
            <p className="text-sm text-muted-foreground">
              {t("showing")}: <span className="font-medium text-foreground">{[program?.program, ...path.map((n) => n.name)].filter(Boolean).join(" › ")}</span>
            </p>
            <PhotoGrid />
          </>
        ) : (
          <EmptyState title={t("chooseTitle")} body={t("chooseBody")} />
        )}
      </div>
    </div>
  );
}
