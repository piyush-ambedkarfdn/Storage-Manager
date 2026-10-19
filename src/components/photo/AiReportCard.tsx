"use client";

import { Fragment, useState } from "react";
import { format } from "date-fns";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ColorChip } from "@/components/shared/ColorChip";
import { ReportEditDialog } from "@/components/photo/ReportEditDialog";
import { isEnabled } from "@/config/features";
import { requestJson, useOptions } from "@/hooks/useOptions";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/provider";
import { photoMessages, type PhotoKey } from "@/lib/i18n/messages/photo";
import { commonMessages } from "@/lib/i18n/messages/common";
import { REPORT_PART_KEYS } from "@/types/report";
import type { ReportDetail } from "@/types/photo-detail";

/** Shows "[confirm: …]" markers as highlighted text so they cannot be missed. */
export function WithConfirmMarks({ text }: { text: string }) {
  const parts = text.split(/(\[(?:confirm|पुष्टि करें):[^\]]*\])/g);
  return (
    <>
      {parts.map((p, i) =>
        /^\[(confirm|पुष्टि करें):/.test(p) ? (
          <mark key={i} className="rounded bg-marigold/25 px-1 font-semibold text-marigold-ink">
            {p}
          </mark>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

/**
 * The staff report as improved by AI (phase 8 writes it). The admin accepts, edits then accepts,
 * rejects, or asks for a new version. AI never changes the staff text.
 */
export function AiReportCard({ report, onChanged }: { report: ReportDetail; onChanged: () => void }) {
  const t = useT(photoMessages);
  const tc = useT(commonMessages);
  const { allOptions: themes } = useOptions("theme");
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [editing, setEditing] = useState(false);
  const [improveOpen, setImproveOpen] = useState(false);
  const [opts, setOpts] = useState({ hindi: false, shorter: false, formal: false });
  const [busy, setBusy] = useState(false);

  if (!report.ai_report_en) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-dashed bg-card p-4">
        <p className="font-semibold">{t("aiNotYet")}</p>
        <p className="text-sm text-muted-foreground">{t("aiNotYetBody")}</p>
        {isEnabled("ai") ? (
          <Button variant="outline" className="min-h-10 self-start" onClick={() => setImproveOpen(true)}>
            <Sparkles aria-hidden /> {t("improveAgain")}
          </Button>
        ) : null}
        {improveDialog()}
      </div>
    );
  }

  async function review(action: "accept" | "reject") {
    setBusy(true);
    try {
      await requestJson(`/api/reports/${report.id}/review`, { method: "POST", body: { action } });
      toast.success(action === "accept" ? t("accepted") : t("rejected"));
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function addTheme(id: string) {
    try {
      const next = [...new Set([...report.theme_ids, id])].slice(0, 3);
      await requestJson(`/api/reports/${report.id}`, { method: "PATCH", body: { theme_ids: next } });
      toast.success(t("themeAdded"));
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  function improveDialog() {
    return (
      <Dialog open={improveOpen} onOpenChange={(o) => !busy && setImproveOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("improveTitle")}</DialogTitle>
            <DialogDescription>{t("onlyAccepted")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {(["hindi", "shorter", "formal"] as const).map((k) => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <Checkbox checked={opts[k]} onCheckedChange={(c) => setOpts({ ...opts, [k]: !!c })} />
                {k === "hindi" ? t("withHindi") : k === "shorter" ? t("shorter") : t("formal")}
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" className="min-h-11" onClick={() => setImproveOpen(false)} disabled={busy}>
              {tc("cancel")}
            </Button>
            <Button
              className="min-h-11"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await requestJson("/api/ai/improve-report", {
                    method: "POST",
                    body: { reportId: report.id, hindi: opts.hindi, style: opts.shorter ? "shorter" : opts.formal ? "formal" : undefined },
                  });
                  toast.success(t("improved"));
                  setImproveOpen(false);
                  onChanged();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : String(err));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? t("improving") : t("improveAgain")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const status = report.ai_review_status;
  const statusChip =
    status === "accepted" ? (
      <ColorChip color="var(--success)" label={t("status_accepted", { name: report.ai_reviewed_by_name ?? "" })} />
    ) : status === "rejected" ? (
      <ColorChip color="var(--destructive)" label={t("status_rejected")} />
    ) : (
      <ColorChip color="var(--marigold)" label={t("status_draft")} />
    );
  const newThemes = report.ai_theme_ids.filter((id) => !report.theme_ids.includes(id));
  const text = lang === "hi" ? report.ai_report_hi : report.ai_report_en;

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {statusChip}
          {report.ai_model ? <span className="text-xs text-muted-foreground">{t("model", { model: report.ai_model })}</span> : null}
          {report.ai_reviewed_at && status !== "draft" ? (
            <span className="text-xs text-muted-foreground">{format(new Date(report.ai_reviewed_at), "d MMM yyyy")}</span>
          ) : null}
        </div>
        <div role="group" aria-label="Language" className="flex overflow-hidden rounded-md border">
          {(["en", "hi"] as const).map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={lang === l}
              onClick={() => setLang(l)}
              className={cn("min-h-9 px-3 text-sm font-semibold", lang === l ? "bg-secondary" : "bg-card")}
            >
              {l === "en" ? t("english") : t("hindi")}
            </button>
          ))}
        </div>
      </div>

      {lang === "en" && report.ai_sections ? (
        <div className="flex flex-col gap-2">
          {REPORT_PART_KEYS.filter((k) => report.ai_sections?.[k]).map((k) => (
            <div key={k}>
              <div className="text-sm font-bold">{t(`s_${k}` as PhotoKey)}</div>
              <p className="whitespace-pre-line">
                <WithConfirmMarks text={report.ai_sections![k]!} />
              </p>
            </div>
          ))}
        </div>
      ) : text ? (
        <p className="whitespace-pre-line" lang={lang}>
          <WithConfirmMarks text={text} />
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">{t("noHindi")}</p>
      )}

      {report.ai_problems?.length ? (
        <div className="border-t pt-2 text-sm">
          <b>{t("problems")}:</b> {report.ai_problems.join("; ")}
        </div>
      ) : null}
      {report.ai_missing?.length ? (
        <div className="text-sm">
          <b>{t("missing")}:</b>{" "}
          {report.ai_missing.map((m) => (
            <mark key={m} className="mr-1 rounded bg-marigold/25 px-1 text-marigold-ink">
              [confirm: {m}]
            </mark>
          ))}
        </div>
      ) : null}
      {newThemes.length ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <b>{t("suggestedThemes")}:</b>
          {newThemes.map((id) => {
            const th = themes.find((o) => o.id === id);
            return th ? (
              <span key={id} className="inline-flex items-center gap-1">
                <span className="rounded-full border border-dashed border-marigold-ink px-2 py-0.5 text-xs font-semibold">{th.value}</span>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => addTheme(id)} disabled={report.theme_ids.length >= 3}>
                  {t("addTheme")}
                </Button>
              </span>
            ) : null;
          })}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 border-t pt-3">
        {status !== "accepted" ? (
          <Button className="min-h-11 bg-success text-white hover:bg-success/90" onClick={() => review("accept")} disabled={busy}>
            {t("accept")}
          </Button>
        ) : null}
        <Button variant="outline" className="min-h-11" onClick={() => setEditing(true)} disabled={busy}>
          {t("editAccept")}
        </Button>
        {status !== "rejected" ? (
          <Button variant="outline" className="min-h-11 border-destructive text-destructive" onClick={() => review("reject")} disabled={busy}>
            {t("reject")}
          </Button>
        ) : null}
        {isEnabled("ai") ? (
          <Button variant="outline" className="min-h-11" onClick={() => setImproveOpen(true)} disabled={busy}>
            <Sparkles aria-hidden /> {t("improveAgain")}
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{t("onlyAccepted")}</p>
      <ReportEditDialog mode="ai" report={report} open={editing} onOpenChange={setEditing} onSaved={onChanged} />
      {improveDialog()}
    </div>
  );
}
