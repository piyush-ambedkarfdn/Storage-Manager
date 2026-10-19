"use client";

import { useDeferredValue, useState } from "react";
import { Check, GitMerge, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ColorChip } from "@/components/shared/ColorChip";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { MergeDialog, type MergeSource } from "@/components/settings/MergeDialog";
import { requestJson } from "@/hooks/useOptions";
import { useInvalidatePlaces, usePlaces } from "@/hooks/usePlaces";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/provider";
import { settingsMessages, type SettingsKey } from "@/lib/i18n/messages/settings";
import { commonMessages } from "@/lib/i18n/messages/common";
import { PLACE_LEVELS, type ChildLevel, type Place, type PlaceLevel } from "@/types/places";

const PAGE = 50;
const ALL = "all";

/** A parent picker that lists every place of one level under its own parent. */
function ParentSelect({
  level,
  parentId,
  value,
  onChange,
  allLabel,
  enabled = true,
}: {
  level: PlaceLevel;
  parentId?: string | null;
  value: string | null;
  onChange: (id: string | null) => void;
  allLabel: string;
  enabled?: boolean;
}) {
  const { data } = usePlaces(level, { parentId, limit: 1000, enabled });
  return (
    <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? null : v)} disabled={!enabled}>
      <SelectTrigger className="min-h-10 w-48" aria-label={allLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {(data?.items ?? []).map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function NameDialog({
  open,
  title,
  description,
  initial,
  submitLabel,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  description?: string;
  initial: string;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}) {
  const t = useT(settingsMessages);
  const tc = useT(commonMessages);
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name.trim()) return;
            setBusy(true);
            try {
              await onSubmit(name.trim());
              onClose();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : String(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="place-name">{t("newName")}</Label>
            <Input id="place-name" value={name} onChange={(e) => setName(e.target.value)} className="min-h-11" autoFocus />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={busy}>
              {tc("cancel")}
            </Button>
            <Button type="submit" className="min-h-11" disabled={busy || !name.trim()}>
              {busy ? tc("loading") : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Browse, search, rename, approve, merge and delete places at every level. */
export function PlacesTable() {
  const t = useT(settingsMessages);
  const invalidate = useInvalidatePlaces();
  const [level, setLevel] = useState<PlaceLevel>("district");
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [blockId, setBlockId] = useState<string | null>(null);
  const [panchayatId, setPanchayatId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const query = useDeferredValue(q);
  const [offset, setOffset] = useState(0);
  const [renaming, setRenaming] = useState<Place | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Place | null>(null);
  const [merging, setMerging] = useState<MergeSource | null>(null);

  const parentId = level === "block" ? districtId : level === "panchayat" ? blockId : level === "village" ? panchayatId : null;
  const { data, isLoading, error } = usePlaces(level, { parentId, q: query, limit: PAGE, offset });
  const levelName = (l: PlaceLevel) => t(l as SettingsKey);

  function pickLevel(l: PlaceLevel) {
    setLevel(l);
    setOffset(0);
  }

  async function patch(p: Place, body: Record<string, unknown>, ok: string) {
    try {
      await requestJson(`/api/places/${p.level}/${p.id}`, { method: "PATCH", body });
      toast.success(ok);
      await invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  const total = data?.total ?? 0;
  const items = data?.items ?? [];

  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div role="tablist" aria-label={t("tabPlaces")} className="flex flex-wrap gap-1.5">
        {PLACE_LEVELS.map((l) => (
          <Button
            key={l}
            role="tab"
            aria-selected={level === l}
            variant={level === l ? "secondary" : "outline"}
            className={cn("min-h-10", level === l && "border-primary font-semibold")}
            onClick={() => pickLevel(l)}
          >
            {t(`${l}s` as SettingsKey)}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {level !== "district" ? (
          <ParentSelect
            level="district"
            value={districtId}
            onChange={(id) => {
              setDistrictId(id);
              setBlockId(null);
              setPanchayatId(null);
              setOffset(0);
            }}
            allLabel={t("allDistricts")}
          />
        ) : null}
        {level === "panchayat" || level === "village" ? (
          <ParentSelect
            level="block"
            parentId={districtId}
            enabled={!!districtId}
            value={blockId}
            onChange={(id) => {
              setBlockId(id);
              setPanchayatId(null);
              setOffset(0);
            }}
            allLabel={t("allBlocks")}
          />
        ) : null}
        {level === "village" ? (
          <ParentSelect
            level="panchayat"
            parentId={blockId}
            enabled={!!blockId}
            value={panchayatId}
            onChange={(id) => {
              setPanchayatId(id);
              setOffset(0);
            }}
            allLabel={t("allPanchayats")}
          />
        ) : null}
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOffset(0);
            }}
            placeholder={t("searchPlaces")}
            aria-label={t("searchPlaces")}
            className="min-h-10 pl-9"
          />
        </div>
        <Button className="min-h-10" onClick={() => setAdding(true)} disabled={level !== "district" && !parentId}>
          <Plus aria-hidden /> {t("addPlace", { level: levelName(level) })}
        </Button>
      </div>
      {level !== "district" && !parentId ? (
        <p className="text-xs text-muted-foreground">
          {t("chooseParentFirst", { level: levelName(level === "block" ? "district" : level === "panchayat" ? "block" : "panchayat") })}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error instanceof Error ? error.message : String(error)}
        </p>
      ) : !isLoading && items.length === 0 ? (
        <EmptyState title={t("noPlaces")} body={t("noPlacesBody")} />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary hover:bg-secondary">
                <TableHead>{t("colName")}</TableHead>
                <TableHead>{t("colCode")}</TableHead>
                {level !== "district" ? <TableHead>{t("colWhere")}</TableHead> : null}
                <TableHead>{t("colSource")}</TableHead>
                <TableHead>{t("colStatus")}</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">{t("manage")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-semibold">{p.name}</TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">{p.lgd_code ?? "—"}</TableCell>
                  {level !== "district" ? <TableCell className="text-muted-foreground">{p.path}</TableCell> : null}
                  <TableCell>
                    <ColorChip
                      color={p.source === "lgd" ? "var(--primary)" : "var(--muted-foreground)"}
                      label={p.source === "lgd" ? t("sourceLgd") : t("sourceUser")}
                    />
                  </TableCell>
                  <TableCell>
                    {p.approved ? (
                      <span className="text-sm text-muted-foreground">{t("approved")}</span>
                    ) : (
                      <ColorChip color="var(--marigold)" label={t("pending")} />
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-10" aria-label={`${t("manage")}: ${p.name}`}>
                          <MoreHorizontal aria-hidden />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!p.approved ? (
                          <DropdownMenuItem onClick={() => patch(p, { approved: true }, t("approvedToast", { name: p.name }))}>
                            <Check aria-hidden /> {t("approve")}
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem onClick={() => setRenaming(p)}>
                          <Pencil aria-hidden /> {t("rename")}
                        </DropdownMenuItem>
                        {p.level !== "district" ? (
                          <DropdownMenuItem
                            onClick={() => setMerging({ id: p.id, name: p.name, parentId: p.parent_id, source: p.source })}
                          >
                            <GitMerge aria-hidden /> {t("merge")}
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => setDeleting(p)}>
                          <Trash2 aria-hidden /> {t("delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {total > PAGE ? (
        <div className="flex items-center justify-end gap-2 text-sm">
          <span className="text-muted-foreground">
            {t("page", { from: offset + 1, to: Math.min(offset + PAGE, total), total })}
          </span>
          <Button variant="outline" className="min-h-9" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>
            {t("prev")}
          </Button>
          <Button variant="outline" className="min-h-9" disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)}>
            {t("next")}
          </Button>
        </div>
      ) : null}

      {renaming ? (
        <NameDialog
          open
          title={t("renameTitle", { name: renaming.name })}
          description={renaming.level !== "district" ? t("renameHint") : undefined}
          initial={renaming.name}
          submitLabel={t("save")}
          onClose={() => setRenaming(null)}
          onSubmit={async (name) => {
            await requestJson(`/api/places/${renaming.level}/${renaming.id}`, { method: "PATCH", body: { name } });
            toast.success(t("saved"));
            await invalidate();
          }}
        />
      ) : null}
      {adding ? (
        <NameDialog
          open
          title={t("addPlace", { level: levelName(level) })}
          initial=""
          submitLabel={t("add")}
          onClose={() => setAdding(false)}
          onSubmit={async (name) => {
            await requestJson("/api/places", { method: "POST", body: { level, name, parent_id: parentId } });
            toast.success(t("saved"));
            await invalidate();
          }}
        />
      ) : null}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={deleting ? t("deleteTitle", { name: deleting.name }) : ""}
        body={t("deleteBody")}
        confirmLabel={t("delete")}
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await requestJson(`/api/places/${deleting.level}/${deleting.id}`, { method: "DELETE" });
            toast.success(t("deleted", { name: deleting.name }));
            await invalidate();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : String(err));
          }
        }}
      />
      <MergeDialog type={level as ChildLevel} from={merging} onOpenChange={(o) => !o && setMerging(null)} />
    </section>
  );
}
