"use client";

import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ActivityChip } from "@/components/shared/ActivityChip";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";
import { storiesMessages } from "@/lib/i18n/messages/stories";
import type { ContentReport } from "@/types/content";

type Row = { id: string; event_date: string | null; activity_type: string | null; report: string | null; district: { name: string } | null; village: { name: string } | null };

/** The field reports a story is built from. Facts in the AI draft come only from these. */
export function SourceReportsPicker({ reports, ids, onChange }: { reports: ContentReport[]; ids: string[]; onChange: (ids: string[]) => void }) {
  const t = useT(storiesMessages);
  const [open, setOpen] = useState(false);
  const linked = ids.map((id) => reports.find((r) => r.id === id) ?? { id, place_path: "…", event_date: null, activity_type: null, report: null });
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("sources")}</h3>
        <Button size="sm" variant="outline" className="min-h-8" onClick={() => setOpen(true)}>
          <Plus aria-hidden /> {t("addReports")}
        </Button>
      </div>
      {!ids.length ? <p className="text-sm text-muted-foreground">{t("noSources")}</p> : null}
      <ul className="flex flex-col gap-1.5">
        {linked.map((r) => (
          <li key={r.id} className="flex items-start gap-2 rounded-md border bg-secondary/40 p-2 text-sm">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <ActivityChip id={r.activity_type} />
                {r.place_path} · {r.event_date}
              </div>
              <p className="line-clamp-2">{r.report}</p>
            </div>
            <Button size="icon" variant="ghost" className="size-8" onClick={() => onChange(ids.filter((x) => x !== r.id))} aria-label={t("remove")}>
              <X aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
      {open ? <Picker current={ids} onClose={() => setOpen(false)} onPick={(add) => onChange([...new Set([...ids, ...add])])} /> : null}
    </section>
  );
}

function Picker({ current, onClose, onPick }: { current: string[]; onClose: () => void; onPick: (ids: string[]) => void }) {
  const t = useT(storiesMessages);
  const [q, setQ] = useState("");
  const query = useDeferredValue(q.trim());
  const [picked, setPicked] = useState<string[]>([]);
  // admins can read every report (row-level security); newest first
  const { data } = useQuery({
    queryKey: ["report-picker", query],
    queryFn: async () => {
      let req = createClient()
        .from("field_reports")
        .select("id, event_date, activity_type, report, district:districts(name), village:villages(name)")
        .order("created_at", { ascending: false })
        .limit(60);
      if (query) req = req.ilike("report", `%${query.replace(/[%_]/g, "")}%`);
      const { data: rows } = await req;
      return (rows ?? []) as unknown as Row[];
    },
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("pickReports")}</DialogTitle>
        </DialogHeader>
        <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchReports")} aria-label={t("searchReports")} className="min-h-10" />
        <ul className="flex flex-col gap-1.5">
          {(data ?? [])
            .filter((r) => !current.includes(r.id))
            .map((r) => (
              <li key={r.id}>
                <label className="flex items-start gap-2 rounded-md border p-2 text-sm">
                  <Checkbox className="mt-1" checked={picked.includes(r.id)} onCheckedChange={(c) => setPicked(c ? [...picked, r.id] : picked.filter((x) => x !== r.id))} />
                  <span className="min-w-0">
                    <span className="block text-xs text-muted-foreground">
                      {[r.district?.name, r.village?.name].filter(Boolean).join(" / ")} · {r.event_date}
                    </span>
                    <span className="line-clamp-2">{r.report}</span>
                  </span>
                </label>
              </li>
            ))}
        </ul>
        <DialogFooter>
          <Button
            className="min-h-11"
            disabled={!picked.length}
            onClick={() => {
              onPick(picked);
              onClose();
            }}
          >
            {t("addSelected", { n: picked.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
