"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
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
import { PhotoList, photosMissingCategories } from "@/components/upload/PhotoList";
import { useProgramFields } from "@/hooks/useProgramFields";
import { uploadPhotosMessages } from "@/lib/i18n/messages/uploadPhotos";
import type { PhotoOverride } from "@/lib/upload/queue-db";
import { activityLabel } from "@/config/activity-types";
import { useProfile } from "@/hooks/useProfile";
import { useUploadQueue } from "@/hooks/useUploadQueue";
import { usePhotoPreparer } from "@/hooks/usePhotoPreparer";
import { clearUploadDraft, loadUploadDraft, removeDraftPhoto, saveDraftForm, saveDraftPhoto } from "@/lib/upload/draft-db";
import { uploadSafeMessages } from "@/lib/i18n/messages/uploadSafe";
import { uuid } from "@/lib/uuid";
import { cn } from "@/lib/utils";
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
 * The 3-step upload: 1. batch details and field report (shared by every photo), 2. photos: each photo gets its own
 * program categories and star rating, 3. the queue.
 * Mobile first: one column, large targets, Hindi beside English.
 */
export function BatchForm() {
  const t = useT(uploadMessages);
  const locale = useLocale();
  const profile = useProfile();
  const queue = useUploadQueue();
  const [step, setStep] = useState<Step>(1);

  const [place, setPlace] = useState<PlaceState>({ program_id: null, district_id: null, block: null, panchayat: null, village: null });
  const tp = useT(uploadPhotosMessages);
  const { fields: programFields } = useProgramFields(place.program_id);
  /** photo key → required categories still missing, shown in red on its card */
  const [missing, setMissing] = useState<Map<string, string[]>>(new Map());
  const [activity, setActivity] = useState("");
  const [date, setDate] = useState(today);
  const [dateTouched, setDateTouched] = useState(false);
  const [takenBy, setTakenBy] = useState(profile.full_name ?? "");
  const [report, setReport] = useState<ReportParts>(EMPTY_REPORT);
  const [themes, setThemes] = useState<string[]>([]);
  const [consent, setConsent] = useState<Consent>("unknown");
  const [people, setPeople] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const ts = useT(uploadSafeMessages);
  const { prepare, cancel } = usePhotoPreparer(setPhotos);
  const [draftInfo, setDraftInfo] = useState<{ savedAt: number } | null>(null);
  /** true once the saved draft (if any) has been read, so we never overwrite it with an empty form */
  const hydrated = useRef(false);
  /** photo keys already written to the draft */
  const keptKeys = useRef(new Set<string>());

  // The camera date of the first photo fills the date field, until the person picks a date themselves.
  const photoDate = useMemo(() => photos.find((p) => p.status === "ready" && p.takenAt)?.takenAt?.slice(0, 10) ?? null, [photos]);
  const shownDate = !dateTouched && photoDate ? photoDate : date;
  const dateFromPhoto = !dateTouched && !!photoDate;

  // Bring back an unfinished upload (answers and photos) from an earlier visit, within 24 hours.
  useEffect(() => {
    let stop = false;
    void (async () => {
      const d = await loadUploadDraft(profile.id);
      if (stop) return;
      if (d) {
        const f = d.form;
        setPlace(f.place as PlaceState);
        setActivity(f.activity);
        setDate(f.date);
        setDateTouched(f.dateTouched);
        setTakenBy(f.takenBy);
        setReport(f.report);
        setThemes(f.themes);
        setConsent(f.consent);
        setPeople(f.people);
        d.photos.forEach((p) => keptKeys.current.add(p.key));
        setPhotos(d.photos.map((p) => ({ key: p.key, name: p.name, status: "ready", file: p.file, thumb: p.thumb, width: p.width, height: p.height, takenAt: p.takenAt, override: p.override })));
        setStep(f.step);
        setDraftInfo({ savedAt: d.savedAt });
      }
      hydrated.current = true;
    })();
    return () => {
      stop = true;
    };
  }, [profile.id]);

  // Keep the draft up to date a moment after each change; remove it when the form is empty.
  useEffect(() => {
    if (!hydrated.current || step === 3 || sending) return;
    const empty =
      !photos.length && !place.program_id && !activity && !people && !themes.length && !Object.values(report).some((v) => v.trim());
    const id = setTimeout(() => {
      if (empty) {
        keptKeys.current.clear();
        void clearUploadDraft(profile.id);
        return;
      }
      void (async () => {
        const live = new Set(photos.map((p) => p.key));
        for (const key of [...keptKeys.current]) {
          if (!live.has(key)) {
            keptKeys.current.delete(key);
            await removeDraftPhoto(profile.id, key);
          }
        }
        for (const p of photos) {
          if (p.status !== "ready" || !p.file || !p.thumb || keptKeys.current.has(p.key)) continue;
          const ok = await saveDraftPhoto(profile.id, { key: p.key, name: p.name, file: p.file, thumb: p.thumb, width: p.width, height: p.height, takenAt: p.takenAt });
          if (ok) keptKeys.current.add(p.key);
        }
        await saveDraftForm(
          profile.id,
          { step: step === 2 ? 2 : 1, place, activity, date: shownDate, dateTouched, dateFromPhoto: false, takenBy, report, themes, consent, people },
          photos.filter((p) => keptKeys.current.has(p.key)).map((p) => ({ key: p.key, override: p.override })),
        );
      })();
    }, 700);
    return () => clearTimeout(id);
  }, [profile.id, step, sending, photos, place, activity, shownDate, dateTouched, takenBy, report, themes, consent, people]);

  const preparing = photos.filter((p) => p.status === "preparing").length;
  const ready = photos.filter((p) => p.status === "ready" && p.file);
  const bottomClass = profile.role === "admin" ? "bottom-0" : "bottom-[calc(3.5rem+env(safe-area-inset-bottom))]";

  function discardDraft() {
    keptKeys.current.clear();
    void clearUploadDraft(profile.id);
    setDraftInfo(null);
    setPhotos([]);
    setPlace({ program_id: null, district_id: null, block: null, panchayat: null, village: null });
    setActivity("");
    setDate(today());
    setDateTouched(false);
    setReport(EMPTY_REPORT);
    setThemes([]);
    setConsent("unknown");
    setPeople("");
    setMissing(new Map());
    setStep(1);
    toast.success(ts("draftDiscarded"));
  }

  function details(): BatchDetails | null {
    const candidate = {
      program_id: place.program_id ?? "",
      district_id: place.district_id ?? "",
      block_id: place.block?.id ?? "",
      panchayat_id: place.panchayat?.id ?? "",
      village_id: place.village?.id ?? "",
      activity_type: activity,
      event_date: shownDate,
      taken_by: takenBy,
      report_parts: report,
      theme_ids: themes,
      consent,
      beneficiary_count: people.trim() ? Number(people) : null,
      // program categories are chosen per photo in step 2, not here
    };
    const parsed = batchDetailsSchema.safeParse(candidate);
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

  function addFiles(files: File[]) {
    const jobs = files.map((file) => ({ key: uuid(), file }));
    setPhotos((p) => [
      ...p,
      ...jobs.map(({ key, file }) => ({
        key,
        name: file.name || "photo.jpg",
        status: "preparing" as const,
        file: null,
        thumb: null,
        width: 0,
        height: 0,
        takenAt: null,
        override: { has_children: false },
      })),
    ]);
    // shrink them one by one in the background; the cards fill in as each is ready
    prepare(jobs);
  }

  function changePhoto(key: string, patch: Partial<PhotoOverride>) {
    setPhotos((list) => list.map((x) => (x.key === key ? { ...x, override: { ...x.override, ...patch } } : x)));
    if (patch.field_values) {
      setMissing((m) => {
        if (!m.has(key)) return m;
        const next = new Map(m);
        next.delete(key);
        return next;
      });
    }
  }

  async function startUpload() {
    if (sending) return;
    if (preparing > 0) {
      toast.info(ts("waitPrep"));
      return;
    }
    if (photos.length && !ready.length) {
      toast.error(ts("nothingReady"));
      return;
    }
    const d = details();
    if (!d || !photos.length) return;
    // every photo needs the program's required categories
    const lacking = photosMissingCategories(photos, programFields);
    setMissing(lacking);
    if (lacking.size) {
      toast.error(tp("needCategories"));
      const first = photos.find((p) => lacking.has(p.key));
      if (first) document.getElementById(`photo-${first.key}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSending(true);
    try {
      const label = [place.village?.name, activityLabel(d.activity_type, locale), d.event_date].filter(Boolean).join(" · ");
      const items = ready.map((p) => ({
        file: p.file as Blob,
        name: p.name,
        override: p.override,
        prepared: { width: p.width, height: p.height, thumb: p.thumb as Blob, takenAt: p.takenAt },
      }));
      // a phone that is out of space can make this hang: stop waiting after 45 seconds and say so
      await Promise.race([
        queue.add(d, label, items),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("slow")), 45_000)),
      ]);
      const left = photos.length - ready.length;
      if (left > 0) toast.info(ts("skipped", { n: left }));
      keptKeys.current.clear();
      void clearUploadDraft(profile.id);
      setPhotos([]);
      setSelectedNone();
      setStep(3);
    } catch (err) {
      console.error("[upload] could not queue the photos", err);
      toast.error(err instanceof Error && err.message === "slow" ? ts("saveSlow") : ts("saveFailed", { reason: err instanceof Error && err.message ? err.message : "?" }));
    } finally {
      setSending(false);
    }
  }
  function setSelectedNone() {
    setMissing(new Map());
    setDraftInfo(null);
  }

  function newBatch() {
    // keep program, place and activity; a new report starts empty
    setMissing(new Map());
    setReport(EMPTY_REPORT);
    setThemes([]);
    setPeople("");
    setDateTouched(false);
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
          {t("stepOf", { n: step })} · {step === 1 ? t("step1") : step === 2 ? tp("step2") : t("step3")}
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-secondary">
          <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${(step / 3) * 100}%` }} />
        </div>
      </div>

      {draftInfo && step !== 3 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm" role="status">
          <span>{ts("draftRestored", { when: new Date(draftInfo.savedAt).toLocaleString(locale === "hi" ? "hi-IN" : "en-IN", { dateStyle: "medium", timeStyle: "short" }) })}</span>
          <Button variant="outline" size="sm" className="min-h-9" onClick={discardDraft}>
            {ts("discardDraft")}
          </Button>
        </div>
      ) : null}

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
                // categories belong to a program: photos already added start again without them
                setPhotos((list) => list.map((x) => ({ ...x, override: { ...x.override, field_values: {} } })));
                setMissing(new Map());
              }
              setPlace(next);
            }}
            errors={placeErrors}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-date">{t("date")}</Label>
              <Input
                id="event-date"
                type="date"
                value={shownDate}
                max={today()}
                onChange={(e) => {
                  setDate(e.target.value);
                  setDateTouched(true);
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
          <Dropzone onAdd={addFiles} />
          <PhotoList
            photos={photos}
            programFields={programFields}
            missing={missing}
            onChange={changePhoto}
            onRemove={(key) => {
              cancel(key);
              setPhotos((p) => p.filter((x) => x.key !== key));
            }}
            onEdit={setEditing}
          />
          {/* stays in view while scrolling a long list of photos; sits above the bottom menu on phones */}
          <div className={cn("sticky z-20 -mx-4 flex gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur", bottomClass)}>
            <Button variant="outline" className="min-h-12" onClick={() => setStep(1)} disabled={sending}>
              <ArrowLeft aria-hidden /> {t("back")}
            </Button>
            <Button className="min-h-12 flex-1 text-base" disabled={!photos.length || sending || preparing > 0} onClick={() => void startUpload()} aria-busy={sending || preparing > 0}>
              {sending ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden /> {ts("saving")}
                </>
              ) : preparing > 0 ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden /> {ts("preparing", { done: photos.length - preparing, total: photos.length })}
                </>
              ) : (
                t("upload", { n: ready.length || photos.length })
              )}
            </Button>
          </div>
          <PhotoOverrideSheet
            photo={editingPhoto}
            panchayatId={place.panchayat?.id ?? null}
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
