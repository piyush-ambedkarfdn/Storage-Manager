"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";
import { authMessages } from "@/lib/i18n/messages/auth";

type Values = { password: string; confirm: string };

export function ChangePasswordForm() {
  const t = useT(authMessages);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const schema = z
    .object({
      password: z.string().min(8, t("tooShort")),
      confirm: z.string(),
    })
    .refine((v) => v.password === v.confirm, { path: ["confirm"], message: t("mismatch") });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { password: "", confirm: "" } });

  async function onSubmit(values: Values) {
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password: values.password });
    if (updateError) {
      setError(t("changeFailed", { reason: updateError.message }));
      return;
    }
    const { error: rpcError } = await supabase.rpc("clear_must_change_password");
    if (rpcError) {
      setError(t("changeFailed", { reason: rpcError.message }));
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-password">{t("newPassword")}</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          className="min-h-11"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby="password-rule"
          {...register("password")}
        />
        <p id="password-rule" className={errors.password ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
          {errors.password?.message ?? t("passwordRule")}
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm-password">{t("confirmPassword")}</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          className="min-h-11"
          aria-invalid={errors.confirm ? true : undefined}
          {...register("confirm")}
        />
        {errors.confirm ? <p className="text-xs text-destructive">{errors.confirm.message}</p> : null}
      </div>
      {error ? (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="min-h-12 text-base" disabled={isSubmitting}>
        {isSubmitting ? t("saving") : t("savePassword")}
      </Button>
    </form>
  );
}
