"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AiReportCard } from "@/components/photo/AiReportCard";
import { ReportEditDialog } from "@/components/photo/ReportEditDialog";
import { useT } from "@/lib/i18n/provider";
import { photoMessages, type PhotoKey } from "@/lib/i18n/messages/photo";
import { REPORT_PART_KEYS } from "@/types/report";
import type { ReportDetail } from "@/types/photo-detail";

function StaffText({ report, onEdit }: { report: ReportDetail; onEdit: () => void }) {
  const t = useT(photoMessages);
  const parts = report.report_parts;
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{t("staffNote", { name: report.uploader_name ?? "—" })}</p>
      {parts ? (
        REPORT_PART_KEYS.map((k) => (
          <div key={k}>
            <div className="text-sm font-bold">{t(`q_${k}` as PhotoKey)}</div>
            <p className="whitespace-pre-line">{parts[k]?.trim() || <span className="text-muted-foreground">{t("notGiven")}</span>}</p>
          </div>
        ))
      ) : (
        <p className="whitespace-pre-line">{report.report}</p>
      )}
      <Button variant="outline" size="sm" className="min-h-9 self-start" onClick={onEdit}>
        <Pencil aria-hidden /> {t("fixStaffText")}
      </Button>
    </div>
  );
}

/**
 * The field report twice: as staff wrote it, and as AI improved it. Side by side on wide screens,
 * tabs on phones and tablets.
 */
export function ReportView({ report, onChanged }: { report: ReportDetail | null; onChanged: () => void }) {
  const t = useT(photoMessages);
  const [editing, setEditing] = useState(false);
  if (!report) {
    return (
      <section className="rounded-lg border bg-card p-4">
        <h2 className="text-base font-semibold">{t("reportTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("noReport")}</p>
      </section>
    );
  }
  return (
    <section className="flex flex-col gap-3" aria-label={t("reportTitle")}>
      <h2 className="text-base font-semibold">{t("reportTitle")}</h2>
      {/* wide screens: both at once */}
      <div className="hidden gap-4 2xl:grid 2xl:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{t("tabStaff")}</h3>
          <StaffText report={report} onEdit={() => setEditing(true)} />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{t("tabAi")}</h3>
          <AiReportCard report={report} onChanged={onChanged} />
        </div>
      </div>
      {/* smaller screens: tabs */}
      <Tabs defaultValue={report.ai_report_en ? "ai" : "staff"} className="2xl:hidden">
        <TabsList>
          <TabsTrigger value="staff" className="min-h-9">
            {t("tabStaff")}
          </TabsTrigger>
          <TabsTrigger value="ai" className="min-h-9">
            {t("tabAi")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="staff">
          <StaffText report={report} onEdit={() => setEditing(true)} />
        </TabsContent>
        <TabsContent value="ai">
          <AiReportCard report={report} onChanged={onChanged} />
        </TabsContent>
      </Tabs>
      <ReportEditDialog mode="staff" report={report} open={editing} onOpenChange={setEditing} onSaved={onChanged} />
    </section>
  );
}
