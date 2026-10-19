"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Copy, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { createClient } from "@/lib/supabase/client";
import { isEnabled } from "@/config/features";
import { loginSchema, makeTempPassword, passwordSchema } from "@/lib/schemas/staff";
import { useT } from "@/lib/i18n/provider";
import { staffMessages } from "@/lib/i18n/messages/staff";
import { commonMessages } from "@/lib/i18n/messages/common";
import type { StaffMember } from "@/types/staff";

/** fetch + JSON with the API's `{ error }` turned into a thrown Error. Shared by the staff components. */
export async function staffRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body as T;
}

/** Copies text and shows a tick for a moment. */
export function CopyButton({ text, label, doneLabel }: { text: string; label: string; doneLabel: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      className="min-h-10"
      disabled={!text}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? <Check aria-hidden /> : <Copy aria-hidden />}
      {done ? doneLabel : label}
    </Button>
  );
}

type Area = { id: string; name: string };

/** Districts and programs for the assignment boxes. Only loaded once the places phase is installed. */
function useAreas(open: boolean) {
  const [areas, setAreas] = useState<{ districts: Area[]; programs: Area[] } | null>(null);
  useEffect(() => {
    if (!open || !isEnabled("places") || areas) return;
    const supabase = createClient();
    Promise.all([
      supabase.from("districts").select("id, name").order("name"),
      supabase.from("programs").select("id, name").eq("hidden", false).order("sort_order"),
    ]).then(([d, p]) => setAreas({ districts: (d.data ?? []) as Area[], programs: (p.data ?? []) as Area[] }));
  }, [open, areas]);
  return areas;
}

function AreaChecklist({
  legend,
  items,
  value,
  onChange,
}: {
  legend: string;
  items: Area[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1 text-sm font-semibold">{legend}</legend>
      <div className="flex max-h-36 flex-wrap gap-x-4 gap-y-2 overflow-y-auto rounded-md border p-2">
        {items.map((it) => {
          const checked = value.includes(it.id);
          return (
            <label key={it.id} className="flex min-h-8 items-center gap-2 text-sm">
              <Checkbox
                checked={checked}
                onCheckedChange={(c) => onChange(c ? [...value, it.id] : value.filter((v) => v !== it.id))}
              />
              {it.name}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

type FormValues = {
  full_name: string;
  login: string;
  password: string;
  role: "admin" | "uploader";
  assigned_district_ids: string[];
  assigned_program_ids: string[];
};

/** Add a new staff member (with temporary password) or edit an existing one. */
export function StaffForm({
  open,
  onOpenChange,
  member,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = add a new person */
  member: StaffMember | null;
  onSaved: () => void;
}) {
  const t = useT(staffMessages);
  const tc = useT(commonMessages);
  const editing = member !== null;
  const areas = useAreas(open);

  const schema = z.object({
    full_name: z.string().trim().min(1, t("nameRequired")),
    login: editing ? z.string() : loginSchema,
    password: editing ? z.string() : passwordSchema,
    role: z.enum(["admin", "uploader"]),
    assigned_district_ids: z.array(z.string()),
    assigned_program_ids: z.array(z.string()),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: blank(),
  });
  const { register, handleSubmit, setValue, reset, formState, control } = form;

  function blank(): FormValues {
    return { full_name: "", login: "", password: "", role: "uploader", assigned_district_ids: [], assigned_program_ids: [] };
  }

  useEffect(() => {
    if (!open) return;
    reset(
      member
        ? {
            full_name: member.full_name ?? "",
            login: member.login_id ?? member.email ?? "",
            password: "",
            role: member.role,
            assigned_district_ids: member.assigned_district_ids ?? [],
            assigned_program_ids: member.assigned_program_ids ?? [],
          }
        : { ...blank(), password: makeTempPassword() },
    );
  }, [open, member, reset]);

  async function onSubmit(v: FormValues) {
    const areaFields = isEnabled("places")
      ? { assigned_district_ids: v.assigned_district_ids, assigned_program_ids: v.assigned_program_ids }
      : {};
    try {
      if (editing) {
        await staffRequest(`/api/staff/${member.id}`, {
          method: "PATCH",
          body: JSON.stringify({ action: "update", full_name: v.full_name, role: v.role, ...areaFields }),
        });
        toast.success(t("saved"));
      } else {
        await staffRequest("/api/staff", {
          method: "POST",
          body: JSON.stringify({ full_name: v.full_name, login: v.login, password: v.password, role: v.role, ...areaFields }),
        });
        toast.success(t("created", { name: v.full_name }), { duration: 8000 });
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  const role = useWatch({ control, name: "role" });
  const password = useWatch({ control, name: "password" });
  const districtIds = useWatch({ control, name: "assigned_district_ids" });
  const programIds = useWatch({ control, name: "assigned_program_ids" });
  const errors = formState.errors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? t("formEditTitle", { name: member.full_name ?? "" }) : t("formAddTitle")}</DialogTitle>
          {!editing ? <DialogDescription>{t("tempPasswordHint")}</DialogDescription> : null}
        </DialogHeader>

        <form id="staff-form" onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-name">{t("fullName")}</Label>
            <Input id="sf-name" className="min-h-11" aria-invalid={errors.full_name ? true : undefined} {...register("full_name")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sf-login">{t("login")}</Label>
            <Input
              id="sf-login"
              className="min-h-11"
              autoCapitalize="none"
              spellCheck={false}
              readOnly={editing}
              aria-invalid={errors.login ? true : undefined}
              aria-describedby="sf-login-hint"
              {...register("login")}
            />
            <p id="sf-login-hint" className={errors.login ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
              {errors.login?.message ?? t("loginHint")}
            </p>
          </div>

          {!editing ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sf-password">{t("tempPassword")}</Label>
              <div className="flex flex-wrap gap-2">
                <Input
                  id="sf-password"
                  className="min-h-10 flex-1 font-mono"
                  autoComplete="off"
                  aria-invalid={errors.password ? true : undefined}
                  {...register("password")}
                />
                <Button type="button" variant="outline" className="min-h-10" onClick={() => setValue("password", makeTempPassword())}>
                  <Wand2 aria-hidden /> {t("generate")}
                </Button>
                <CopyButton text={password} label={t("copy")} doneLabel={t("copied")} />
              </div>
              {errors.password ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
            </div>
          ) : null}

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold">{t("role")}</legend>
            <RadioGroup value={role} onValueChange={(v) => setValue("role", v as FormValues["role"])} className="gap-2">
              <label className="flex items-start gap-3 rounded-md border p-3">
                <RadioGroupItem value="uploader" className="mt-1" />
                <span>
                  <span className="block font-semibold">{t("roleUploader")}</span>
                  <span className="block text-xs text-muted-foreground">{t("roleUploaderHint")}</span>
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-md border p-3">
                <RadioGroupItem value="admin" className="mt-1" />
                <span>
                  <span className="block font-semibold">{t("roleAdmin")}</span>
                  <span className="block text-xs text-muted-foreground">{t("roleAdminHint")}</span>
                </span>
              </label>
            </RadioGroup>
          </fieldset>

          {isEnabled("places") ? (
            areas ? (
              <div className="flex flex-col gap-3">
                <AreaChecklist
                  legend={t("districts")}
                  items={areas.districts}
                  value={districtIds}
                  onChange={(v) => setValue("assigned_district_ids", v)}
                />
                <AreaChecklist
                  legend={t("programs")}
                  items={areas.programs}
                  value={programIds}
                  onChange={(v) => setValue("assigned_program_ids", v)}
                />
                <p className="text-xs text-muted-foreground">{t("areasHint")}</p>
              </div>
            ) : null
          ) : (
            <p className="text-xs text-muted-foreground">{t("areasLater")}</p>
          )}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button type="submit" form="staff-form" className="min-h-11" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? t("saving") : editing ? t("save") : t("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
