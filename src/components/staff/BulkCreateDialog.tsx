"use client";

import { useState } from "react";
import { Download, FileUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { staffRequest } from "@/components/staff/StaffForm";
import { useT } from "@/lib/i18n/provider";
import { staffMessages } from "@/lib/i18n/messages/staff";
import { commonMessages } from "@/lib/i18n/messages/common";
import type { BulkRowResult } from "@/types/staff";

const TEMPLATE = "full_name,login,password,role\nRakesh Kumar,rakesh.chatra,,uploader\nSunita Devi,sunita.giridih,,uploader\n";

function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob(["\uFEFF" + text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Paste or pick a CSV; the server creates each row and reports row by row. */
export function BulkCreateDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const t = useT(staffMessages);
  const tc = useT(commonMessages);
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<BulkRowResult[] | null>(null);

  function close(o: boolean) {
    if (busy) return;
    if (!o) {
      setCsv("");
      setResults(null);
    }
    onOpenChange(o);
  }

  async function run() {
    setBusy(true);
    try {
      const res = await staffRequest<{ results: BulkRowResult[] }>("/api/staff/bulk", {
        method: "POST",
        body: JSON.stringify({ csv }),
      });
      setResults(res.results);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const ok = results?.filter((r) => r.ok).length ?? 0;
  const failed = (results?.length ?? 0) - ok;
  const hasPasswords = results?.some((r) => r.password) ?? false;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("bulkTitle")}</DialogTitle>
          <DialogDescription>{t("bulkBody")}</DialogDescription>
        </DialogHeader>

        {results === null ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="min-h-10" onClick={() => downloadText("staff-template.csv", TEMPLATE)}>
                <Download aria-hidden /> {t("template")}
              </Button>
              <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent">
                <FileUp className="size-4" aria-hidden /> {t("chooseFile")}
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) setCsv(await file.text());
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bulk-csv">{t("orPaste")}</Label>
              <Textarea
                id="bulk-csv"
                value={csv}
                onChange={(e) => setCsv(e.target.value)}
                rows={8}
                className="font-mono text-xs"
                placeholder={TEMPLATE}
                spellCheck={false}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p role="status" className="font-semibold">
              {t("resultSummary", { ok, failed })}
            </p>
            <div className="max-h-80 overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-secondary">
                  <tr>
                    <th className="px-3 py-2 text-left">{t("colRow")}</th>
                    <th className="px-3 py-2 text-left">{t("colLogin")}</th>
                    <th className="px-3 py-2 text-left">{t("colResult")}</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.row} className="border-t">
                      <td className="px-3 py-1.5">{r.row}</td>
                      <td className="px-3 py-1.5 font-mono text-xs">{r.login || "—"}</td>
                      <td className="px-3 py-1.5">
                        {r.ok ? (
                          <span className="font-semibold text-success">{t("rowOk")}</span>
                        ) : (
                          <span>
                            <span className="font-semibold text-destructive">{t("rowFailed")}</span>: {r.error}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hasPasswords ? (
              <div className="flex flex-col gap-2 rounded-md border border-marigold bg-marigold/10 p-3 text-sm">
                <p>{t("resultsWarning")}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-10 self-start"
                  onClick={() =>
                    downloadText(
                      "new-staff-passwords.csv",
                      "login,temporary_password\n" +
                        results
                          .filter((r) => r.ok && r.password)
                          .map((r) => `${csvCell(r.login)},${csvCell(r.password ?? "")}`)
                          .join("\n"),
                    )
                  }
                >
                  <Download aria-hidden /> {t("downloadResults")}
                </Button>
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" className="min-h-11" onClick={() => close(false)} disabled={busy}>
            {results === null ? tc("cancel") : tc("close")}
          </Button>
          {results === null ? (
            <Button className="min-h-11" onClick={run} disabled={busy || csv.trim() === ""}>
              {busy ? t("running") : t("run")}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
