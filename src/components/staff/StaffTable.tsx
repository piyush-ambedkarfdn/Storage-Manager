"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { hi as hiLocale } from "date-fns/locale";
import { FileUp, MoreHorizontal, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ColorChip } from "@/components/shared/ColorChip";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { BulkCreateDialog } from "@/components/staff/BulkCreateDialog";
import { ResetPasswordDialog } from "@/components/staff/ResetPasswordDialog";
import { StaffForm, staffRequest } from "@/components/staff/StaffForm";
import { EMPTY_FILTERS, StaffFilters, type StaffFilterValue } from "@/components/staff/StaffFilters";
import { isEnabled } from "@/config/features";
import { useProfile } from "@/hooks/useProfile";
import { useLocale, useT } from "@/lib/i18n/provider";
import { staffMessages } from "@/lib/i18n/messages/staff";
import type { StaffMember } from "@/types/staff";

const STAFF_KEY = ["staff"] as const;

type Pending = { kind: "deactivate" | "reactivate" | "delete"; member: StaffMember } | null;

/** The whole Staff page body: header actions, filters, table, and the dialogs. */
export function StaffTable() {
  const t = useT(staffMessages);
  const locale = useLocale();
  const me = useProfile();
  const qc = useQueryClient();
  const [filters, setFilters] = useState<StaffFilterValue>(EMPTY_FILTERS);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [resetting, setResetting] = useState<StaffMember | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [pending, setPending] = useState<Pending>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: STAFF_KEY,
    queryFn: () => staffRequest<{ staff: StaffMember[] }>("/api/staff").then((r) => r.staff),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: STAFF_KEY });

  const rows = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return (data ?? []).filter((m) => {
      if (filters.role !== "all" && m.role !== filters.role) return false;
      if (filters.status === "active" && !m.active) return false;
      if (filters.status === "inactive" && m.active) return false;
      if (!q) return true;
      return [m.full_name, m.login_id, m.email].some((v) => v?.toLowerCase().includes(q));
    });
  }, [data, filters]);

  const name = (m: StaffMember) => m.full_name || m.login_id || m.email || "";
  const showAreas = isEnabled("places");
  const showUploads = isEnabled("upload");

  function lastSeen(iso: string | null) {
    if (!iso) return t("never");
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: locale === "hi" ? hiLocale : undefined });
  }

  async function runPending() {
    if (!pending) return;
    const { kind, member } = pending;
    try {
      if (kind === "delete") {
        await staffRequest(`/api/staff/${member.id}`, { method: "DELETE" });
        toast.success(t("deleted", { name: name(member) }));
      } else {
        const active = kind === "reactivate";
        await staffRequest(`/api/staff/${member.id}`, {
          method: "PATCH",
          body: JSON.stringify({ action: "set_active", active }),
        });
        toast.success(t(active ? "reactivated" : "deactivated", { name: name(member) }));
      }
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <>
            <Button variant="outline" className="min-h-11" onClick={() => setBulkOpen(true)}>
              <FileUp aria-hidden /> {t("bulkCreate")}
            </Button>
            <Button
              className="min-h-11"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <UserPlus aria-hidden /> {t("addStaff")}
            </Button>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <StaffFilters value={filters} onChange={setFilters} />
        {data ? (
          <span className="text-sm text-muted-foreground">{t("shown", { n: rows.length, total: data.length })}</span>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
          {t("loadFailed", { reason: error instanceof Error ? error.message : String(error) })}
        </p>
      ) : isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : data && data.length <= 1 && rows.length <= 1 && filters === EMPTY_FILTERS && data.every((m) => m.id === me.id) ? (
        <EmptyState
          icon={<Users className="size-8" aria-hidden />}
          title={t("empty")}
          body={t("emptyBody")}
          action={
            <Button className="min-h-11" onClick={() => setFormOpen(true)}>
              <UserPlus aria-hidden /> {t("addStaff")}
            </Button>
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState title={t("noMatch")} />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary hover:bg-secondary">
                <TableHead>{t("colName")}</TableHead>
                <TableHead>{t("colLogin")}</TableHead>
                <TableHead>{t("colRole")}</TableHead>
                {showAreas ? <TableHead>{t("colAreas")}</TableHead> : null}
                {showUploads ? <TableHead className="text-right">{t("colUploads")}</TableHead> : null}
                <TableHead>{t("colLastSeen")}</TableHead>
                <TableHead>{t("colStatus")}</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">{t("actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((m) => {
                const isMe = m.id === me.id;
                return (
                  <TableRow key={m.id} className={m.active ? undefined : "text-muted-foreground"}>
                    <TableCell className="font-semibold">
                      {name(m)}
                      {isMe ? <span className="ml-1 font-normal text-muted-foreground">({t("you")})</span> : null}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{m.login_id ?? m.email}</TableCell>
                    <TableCell>{m.role === "admin" ? t("roleAdmin") : t("roleUploader")}</TableCell>
                    {showAreas ? (
                      <TableCell>
                        {!m.assigned_district_ids?.length && !m.assigned_program_ids?.length
                          ? t("allAreas")
                          : t("areasCount", {
                              districts: m.assigned_district_ids?.length ?? 0,
                              programs: m.assigned_program_ids?.length ?? 0,
                            })}
                      </TableCell>
                    ) : null}
                    {showUploads ? <TableCell className="text-right tabular-nums">{m.uploads ?? "—"}</TableCell> : null}
                    <TableCell>{lastSeen(m.last_seen_at)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <ColorChip
                          color={m.active ? "var(--success)" : "var(--muted-foreground)"}
                          label={m.active ? t("statusActive") : t("statusInactive")}
                        />
                        {m.active && m.must_change_password ? (
                          <ColorChip color="var(--marigold)" label={t("mustChange")} />
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-10" aria-label={`${t("actions")}: ${name(m)}`}>
                            <MoreHorizontal aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing(m);
                              setFormOpen(true);
                            }}
                          >
                            {t("edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setResetting(m)}>{t("resetPassword")}</DropdownMenuItem>
                          {!isMe ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setPending({ kind: m.active ? "deactivate" : "reactivate", member: m })}
                              >
                                {m.active ? t("deactivate") : t("reactivate")}
                              </DropdownMenuItem>
                              {!m.uploads ? (
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setPending({ kind: "delete", member: m })}
                                >
                                  {t("delete")}
                                </DropdownMenuItem>
                              ) : null}
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <StaffForm open={formOpen} onOpenChange={setFormOpen} member={editing} onSaved={refresh} />
      <ResetPasswordDialog member={resetting} onOpenChange={(o) => !o && setResetting(null)} onDone={refresh} />
      <BulkCreateDialog open={bulkOpen} onOpenChange={setBulkOpen} onDone={refresh} />
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => !o && setPending(null)}
        title={
          pending
            ? t(pending.kind === "delete" ? "deleteTitle" : pending.kind === "deactivate" ? "deactivateTitle" : "reactivate", {
                name: name(pending.member),
              })
            : ""
        }
        body={pending ? (pending.kind === "delete" ? t("deleteBody") : pending.kind === "deactivate" ? t("deactivateBody") : undefined) : undefined}
        confirmLabel={pending ? t(pending.kind === "delete" ? "delete" : pending.kind === "deactivate" ? "deactivate" : "reactivate") : ""}
        destructive={pending?.kind !== "reactivate"}
        onConfirm={runPending}
      />
    </>
  );
}
