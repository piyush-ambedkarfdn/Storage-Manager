"use client";

import { useState } from "react";
import { Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyButton, staffRequest } from "@/components/staff/StaffForm";
import { makeTempPassword, passwordSchema } from "@/lib/schemas/staff";
import { useT } from "@/lib/i18n/provider";
import { staffMessages } from "@/lib/i18n/messages/staff";
import { commonMessages } from "@/lib/i18n/messages/common";
import type { StaffMember } from "@/types/staff";

/** Sets a new temporary password. The person must choose their own at next sign-in. */
export function ResetPasswordDialog({
  member,
  onOpenChange,
  onDone,
}: {
  member: StaffMember | null;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={member !== null} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent>
        {member ? (
          <ResetBody key={member.id} member={member} busy={busy} setBusy={setBusy} onOpenChange={onOpenChange} onDone={onDone} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ResetBody({
  member,
  busy,
  setBusy,
  onOpenChange,
  onDone,
}: {
  member: StaffMember;
  busy: boolean;
  setBusy: (b: boolean) => void;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const t = useT(staffMessages);
  const tc = useT(commonMessages);
  const [password, setPassword] = useState(() => makeTempPassword());
  const name = member.full_name || member.login_id || "";
  const check = passwordSchema.safeParse(password);

  async function save() {
    if (!check.success) return;
    setBusy(true);
    try {
      await staffRequest(`/api/staff/${member.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "reset_password", password }),
      });
      toast.success(t("resetDone", { name }), { duration: 8000 });
      onDone();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("resetTitle", { name })}</DialogTitle>
        <DialogDescription>{t("resetBody")}</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rp-password">{t("tempPassword")}</Label>
        <div className="flex flex-wrap gap-2">
          <Input
            id="rp-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-h-10 flex-1 font-mono"
            autoComplete="off"
            aria-invalid={!check.success || undefined}
          />
          <Button type="button" variant="outline" className="min-h-10" onClick={() => setPassword(makeTempPassword())}>
            <Wand2 aria-hidden /> {t("generate")}
          </Button>
          <CopyButton text={password} label={t("copy")} doneLabel={t("copied")} />
        </div>
        {!check.success ? <p className="text-xs text-destructive">{check.error.issues[0]?.message}</p> : null}
      </div>
      <DialogFooter>
        <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)} disabled={busy}>
          {tc("cancel")}
        </Button>
        <Button className="min-h-11" onClick={save} disabled={busy || !check.success}>
          {busy ? t("saving") : t("resetPassword")}
        </Button>
      </DialogFooter>
    </>
  );
}
