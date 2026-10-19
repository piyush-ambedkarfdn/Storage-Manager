"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActivityTypePicker } from "@/components/upload/ActivityTypePicker";
import { ConsentField } from "@/components/upload/ConsentField";
import { Dropzone, type DraftPhoto } from "@/components/upload/Dropzone";
import { PhotoOverrideSheet } from "@/components/upload/PhotoOverrideSheet";
import { PlaceFields, type PlaceErrors, type PlaceState } from "@/components/upload/PlaceFields";
import { ReportField } from "@/components/upload/ReportField";
import { ThemePicker } from "@/components/upload/ThemePicker";
import { UploadQueue } from "@/components/upload/UploadQueue";
import { missingRequired, ProgramFieldsPicker } from "@/components/categories/ProgramFieldsPicker";
import { useProgramFields } from "@/hooks/useProgramFields";
import { categoriesMessages } from "@/lib/i18n/messages/categories";
import type { FieldValues } from "@/types/program-fields";
import { activityLabel } from "@/config/activity-types";
import { useProfile } from "@/hooks/useProfile";
import { useUploadQueue } from "@/hooks/useUploadQueue";
import { readExif } from "@/lib/image";
import { batchDetailsSchema, type BatchDetails } from "@/lib/schemas/report";
import { useLocale, useT } from "@/lib/i18n/provider";
import { uploadMessages } from "@/lib/i18n/messages/upload";
import type { Consent } from "@/types/photo";
import type { ReportParts } from "@/types/report";

type Step = 1 | 2 | 3;
const EMPTY_REPORT: ReportParts = { what_happened: "", problem: "", who_affected: "", result: "" };
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * The 3-step upload: 1. batch details and field report, 2. photos, 3. the queue.
 * Mobile first: one column, large targets, Hindi beside English.
 */
export function BatchForm() {
  const t = useT(uploadMessages);
  const locale = useLocale();
  const profile = useProfile();
  const queue = useUploadQueue();
  const [step, setStep] = useState<Step>(1);

  const [place, setPlace] = useState<PlaceState>({ program_id: null, district_id: null, block: null, panchayat: null, village: null });
  const tc = useT(categoriesMessages);
  const { fields: programFields } = useProgramFields(place.program_id);
  const [fieldValues, setFieldValues] = useState<FieldValues>({});
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const [activity, setActivity] = useState("");
  const [date, setDate] = useState(today);
  const [dateTouched, setDateTouched] = useState(false);
  const [dateFromPhoto, setDateFromPhoto] = useState(false);
  const [takenBy, setTakenBy] = useState(profile.full_name ?? "");
  const [report, setReport] = useState<ReportParts>(EMPTY_REPORT);
  const [themes, setThemes] = useState<string[]>([]);
  const [consent, setConsent] = useState<Consent>("unknown");
  const [people, setPeople] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  function details(): BatchDetails | null {
    const candidate = {
      program_id: place.program_id ?? "",
      district_id: place.district_id ?? "",
      block_id: place.block?.id ?? "",
      panchayat_id: place.panchayat?.id ?? "",
      village_id: place.village?.id ?? "",
      activity_type: activity,
      event_date: date,
      taken_by: takenBy,
      report_parts: report,
      theme_ids: themes,
      consent,
      beneficiary_count: people.trim() ? Number(people) : null,
      // only categories of the chosen program
      field_values: Object.fromEntries(programFields.map((f) => [f.id, fieldValues[f.id] ?? []])),
    };
    const missing = missingRequired(programFields, fieldValues);
    setFieldErrors(missing.map((f) => f.id));
    const parsed = batchDetailsSchema.safeParse(candidate);
    if (parsed.success && missing.length) {
      toast.error(tc("mustChoose", { name: missing.map((f) => f.label).join(", ") }));
      return null;
    }
    if (parsed.success) {
      setErrors({});
      return parsed.data;
    }
    const map: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] === "report_parts" ? "report" : String(issue.path[0]);
      map[key] ??= issue.message;
    }
    setErrors(map);
    toast.error(t("fixErrors"));
    return null;
  }

  async function addFiles(files: File[]) {
    setPhotos((p) => [...p, ...files.map((file) => ({ key: crypto.randomUUID(), file, override: { has_children: false } }))]);
    if (!dateTouched && files[0]) {
      const { takenAt } = await readExif(files[0]);
      if (takenAt) {
        setDate(takenAt.slice(0, 10));
        setDateFromPhoto(true);
      }
    }
  }

  async function startUpload() {
    const d = details();
    if (!d || !photos.length) return;
    setSending(true);
    const label = [place.village?.name, activityLabel(d.activity_type, locale), d.event_date].filter(Boolean).join(" · ");
    await queue.add(d, label, photos.map((p) => ({ file: p.file, override: p.override })));
    setSending(false);
    setPhotos([]);
    setStep(3);
  }

  function newBatch() {
    // keep program, place and activity; a new report starts empty
    setReport(EMPTY_REPORT);
    setThemes([]);
    setPeople("");
    setDateTouched(false);
    setDateFromPhoto(false);
    setStep(1);
  }

  const placeErrors: PlaceErrors = {
    program_id: errors.program_id,
    district_id: errors.district_id,
    block_id: errors.block_id,
    panchayat_id: errors.panchayat_id,
    village_id: errors.village_id,
  };
  const editingPhoto = photos.find((p) => p.key === editing) ?? null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="text-sm text-muted-foreground">
          {t("stepOf", { n: step })} · {step === 1 ? t("step1") : step === 2 ? t("step2") : t("step3")}
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-secondary">
          <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${(step / 3) * 100}%` }} />
        </div>
      </div>

      {step !== 3 && queue.counts.pending > 0 ? (
        <div className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm">
          <span>{t("pendingNotice", { n: queue.counts.pending })}</span>
          <Button variant="outline" size="sm" className="min-h-9" onClick={() => setStep(3)}>
            {t("openQueue")}
          </Button>
        </div>
      ) : null}

      {step === 1 ? (
        <form
          className="flex flex-col gap-5"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (details()) setStep(2);
          }}
        >
          <PlaceFields
            value={place}
            onChange={(next) => {
              if (next.program_id !== place.program_id) {
                setFieldValues({}); // categories belong to a program
                setFieldErrors([]);
              }
              setPlace(next);
            }}
            errors={placeErrors}
          />
          {programFields.length ? (
            <section className="flex flex-col gap-2 rounded-lg border p-3">
              <ProgramFieldsPicker fields={programFields} value={fieldValues} onChange={setFieldValues} errorFieldIds={fieldErrors} />
              <p className="text-xs text-muted-foreground">{tc("forAllPhotos")}</p>
            </section>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-date">{t("date")}</Label>
              <Input
                id="event-date"
                type="date"
                value={date}
                max={today()}
                onChange={(e) => {
                  setDate(e.target.value);
                  setDateTouched(true);
                  setDateFromPhoto(false);
                }}
                className="min-h-11"
                aria-invalid={!!errors.event_date || undefined}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="taken-by">{t("takenBy")}</Label>
              <Input id="taken-by" value={takenBy} onChange={(e) => setTakenBy(e.target.value)} className="min-h-11" maxLength={120} />
            </div>
          </div>
          {dateFromPhoto ? <p className="-mt-3 text-xs text-muted-foreground">{t("dateFromPhoto")}</p> : null}
          {errors.event_date ? <p className="-mt-3 text-xs text-destructive">{errors.event_date}</p> : null}

          <ActivityTypePicker value={activity} onChange={setActivity} error={errors.activity_type} />
          <ReportField value={report} onChange={setReport} error={errors.report} />
          <ThemePicker value={themes} onChange={setThemes} report={report} error={errors.theme_ids} />
          <ConsentField value={consent} onChange={setConsent} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="people">{t("people")}</Label>
            <Input id="people" inputMode="numeric" pattern="[0-9]*" value={people} onChange={(e) => setPeople(e.target.value.replace(/\D/g, ""))} className="min-h-11" />
          </div>
          <Button type="submit" className="min-h-12 text-base">
            {t("next")}
          </Button>
        </form>
      ) : null}

      {step === 2 ? (
        <div className="flex flex-col gap-4">
          <Dropzone
            photos={photos}
            onAdd={(f) => void addFiles(f)}
            onRemove={(key) => setPhotos((p) => p.filter((x) => x.key !== key))}
            onEdit={setEditing}
          />
          <div className="flex gap-2">
            <Button variant="outline" className="min-h-12" onClick={() => setStep(1)}>
              <ArrowLeft aria-hidden /> {t("back")}
            </Button>
            <Button className="min-h-12 flex-1 text-base" disabled={!photos.length || sending} onClick={startUpload}>
              {t("upload", { n: photos.length })}
            </Button>
          </div>
          <PhotoOverrideSheet
            photo={editingPhoto}
            panchayatId={place.panchayat?.id ?? null}
            programFields={programFields}
            batchValues={fieldValues}
            blockId={place.block?.id ?? null}
            onSave={(key, override) => setPhotos((p) => p.map((x) => (x.key === key ? { ...x, override } : x)))}
            onClose={() => setEditing(null)}
          />
        </div>
      ) : null}

      {step === 3 ? <UploadQueue queue={queue} onNewBatch={newBatch} /> : null}
    </div>
  );
}
