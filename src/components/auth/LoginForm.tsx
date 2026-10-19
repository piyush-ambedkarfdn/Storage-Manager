"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { loginIdToEmail } from "@/config/app";
import { useT } from "@/lib/i18n/provider";
import { authMessages } from "@/lib/i18n/messages/auth";

type Values = { login: string; password: string };

/** Only allow redirects to paths inside this app. */
function safeNext(next: string | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export function LoginForm({ next, reason }: { next?: string; reason?: string }) {
  const t = useT(authMessages);
  const [error, setError] = useState<string | null>(
    reason === "inactive" ? t("inactive") : reason === "no-profile" ? t("noProfile") : null,
  );
  const [show, setShow] = useState(false);
  const router = useRouter();

  const schema = z.object({
    login: z.string().trim().min(1, t("needLogin")),
    password: z.string().min(1, t("needPassword")),
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { login: "", password: "" } });

  async function onSubmit(values: Values) {
    setError(null);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: loginIdToEmail(values.login),
        password: values.password,
      });
      if (signInError) {
        setError(t("wrongLogin"));
        return;
      }
      await fetch("/api/auth/login-event", { method: "POST" }).catch(() => undefined);
      // The session cookie is set now; refresh so server components see it.
      router.replace(safeNext(next));
      router.refresh();
    } catch {
      setError(t("networkError"));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login">{t("loginId")}</Label>
        <Input
          id="login"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          className="min-h-11"
          aria-invalid={errors.login ? true : undefined}
          aria-describedby="login-hint"
          {...register("login")}
        />
        <p id="login-hint" className="text-xs text-muted-foreground">
          {errors.login?.message ?? t("loginIdHint")}
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">{t("password")}</Label>
        <div className="relative">
          <Input
            id="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            className="min-h-11 pr-12"
            aria-invalid={errors.password ? true : undefined}
            {...register("password")}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-0 right-0 size-11"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? t("hidePassword") : t("showPassword")}
          >
            {show ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          </Button>
        </div>
        {errors.password ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
      </div>
      {error ? (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="min-h-12 text-base" disabled={isSubmitting}>
        {isSubmitting ? t("signingIn") : t("signIn")}
      </Button>
      <p className="text-center text-xs text-muted-foreground">{t("noSignup")}</p>
    </form>
  );
}
