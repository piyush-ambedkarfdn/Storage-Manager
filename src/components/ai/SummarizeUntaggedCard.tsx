"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestJson } from "@/hooks/useOptions";
import { useT } from "@/lib/i18n/provider";
import { aiMessages, type AiKey } from "@/lib/i18n/messages/ai";

type Step = { remaining: number; done?: number; described?: number; failed: number };

/**
 * Shared "process the backlog" card: repeats small batches until N are done, nothing is left, the
 * daily budget runs out, or Stop is pressed.
 */
export function BacklogCard({ endpoint, titleKey, bodyKey, queryKey }: { endpoint: string; titleKey: AiKey; bodyKey: AiKey; queryKey: string }) {
  const t = useT(aiMessages);
  const router = useRouter();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: [queryKey], queryFn: () => requestJson<{ remaining: number }>(endpoint) });
  const [n, setN] = useState(20);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const stop = useRef(false);
  const remaining = data?.remaining ?? 0;

  async function run() {
    setRunning(true);
    stop.current = false;
    setDone(0);
    let total = 0;
    let failed = 0;
    try {
      while (!stop.current && total + failed < n) {
        const r = await requestJson<Step>(endpoint, { method: "POST", body: { limit: Math.min(5, n - total - failed) } });
        const got = r.done ?? r.described ?? 0;
        total += got;
        failed += r.failed;
        setDone(total);
        if (r.remaining === 0 || got + r.failed === 0) break;
      }
      toast.success(t("finished", { done: total, failed }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(/budget/i.test(msg) ? t("budgetUsed") : msg);
    } finally {
      setRunning(false);
      await qc.invalidateQueries({ queryKey: [queryKey] });
      router.refresh(); // update the usage card
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div>
        <h2 className="text-base font-semibold">{t(titleKey)}</h2>
        <p className="text-sm text-muted-foreground">{t(bodyKey)}</p>
      </div>
      <p className="font-semibold">{remaining ? t("remaining", { n: remaining }) : t("nothing")}</p>
      {remaining ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${queryKey}-n`} className="text-xs">
              {t("howMany")}
            </Label>
            <Input id={`${queryKey}-n`} type="number" min={1} max={200} value={n} onChange={(e) => setN(Math.min(200, Math.max(1, Number(e.target.value))))} className="h-10 w-24" disabled={running} />
          </div>
          {running ? (
            <Button variant="outline" className="min-h-10" onClick={() => (stop.current = true)}>
              {t("stop")}
            </Button>
          ) : (
            <Button className="min-h-10" onClick={run}>
              {t("run", { n: Math.min(n, remaining) })}
            </Button>
          )}
          {running ? (
            <span role="status" className="text-sm">
              {t("running", { done })}
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function SummarizeUntaggedCard() {
  return <BacklogCard endpoint="/api/ai/summarize-untagged" titleKey="reportsTitle" bodyKey="reportsBody" queryKey="ai-reports-backlog" />;
}
