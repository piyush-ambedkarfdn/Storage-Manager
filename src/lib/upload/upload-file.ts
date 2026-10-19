import { compressImage, makeThumbnail, readExif, sha256 } from "@/lib/image";
import type { QueueBatch, QueueItem } from "@/lib/upload/queue-db";
import type { ProxyUploadResult, UploadPlan } from "@/types/storage";

/** An upload error that says whether trying again later can help. */
export class UploadError extends Error {
  constructor(
    message: string,
    public retryable: boolean,
    public status = 0,
  ) {
    super(message);
    this.name = "UploadError";
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new UploadError("No network. Will try again.", true);
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    // 4xx means the request itself is wrong, except: timeout, conflict (file not there yet), rate limit, storage full
    const retryable = res.status >= 500 || [401, 408, 409, 429, 507].includes(res.status);
    throw new UploadError(data.error ?? `Upload failed (${res.status}).`, retryable, res.status);
  }
  return data;
}

/** XMLHttpRequest, because fetch cannot report upload progress. */
function send(method: "PUT" | "POST", url: string, body: Blob | FormData, headers: Record<string, string>, onProgress: (f: number) => void) {
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.responseText);
      else {
        let msg = `Upload failed (${xhr.status}).`;
        try {
          msg = (JSON.parse(xhr.responseText) as { error?: string }).error ?? msg;
        } catch {
          // storage services answer in XML; keep the generic message
        }
        reject(new UploadError(msg, xhr.status >= 500 || [401, 403, 408, 429, 507].includes(xhr.status), xhr.status));
      }
    };
    xhr.onerror = () => reject(new UploadError("No network. Will try again.", true));
    xhr.ontimeout = () => reject(new UploadError("The network is too slow. Will try again.", true));
    xhr.timeout = 120_000;
    xhr.send(body);
  });
}

/** Creates the batch's field report once (idempotent through client_ref). */
export async function ensureReport(batch: QueueBatch): Promise<string> {
  if (batch.reportId) return batch.reportId;
  const d = batch.details;
  const { id } = await postJson<{ id: string }>("/api/reports", {
    client_ref: batch.id,
    program_id: d.program_id,
    district_id: d.district_id,
    block_id: d.block_id ?? null,
    panchayat_id: d.panchayat_id ?? null,
    village_id: d.village_id ?? null,
    activity_type: d.activity_type,
    event_date: d.event_date,
    report_parts: d.report_parts,
    theme_ids: d.theme_ids,
    beneficiary_count: d.beneficiary_count ?? null,
  });
  return id;
}

export type Stage = QueueItem["stage"];

/**
 * Uploads one queued photo: compress, fingerprint, skip duplicates, upload to the active storage
 * (direct to R2 or through the server for Drive), then register it.
 */
export async function uploadItem(
  item: QueueItem,
  batch: QueueBatch & { reportId: string },
  report: (stage: Stage, progress: number) => void,
): Promise<{ status: "done" | "duplicate"; photoId: string | null }> {
  if (!item.file) throw new UploadError("The photo file is missing on this phone. Add it again.", false);

  report("compressing", 0.05);
  let original, thumb;
  try {
    [original, thumb] = await Promise.all([compressImage(item.file), makeThumbnail(item.file)]);
  } catch (err) {
    throw new UploadError(err instanceof Error ? err.message : "This file is not a photo.", false);
  }
  const [hash, exif] = await Promise.all([sha256(original.blob), readExif(item.file)]);

  report("checking", 0.15);
  const { duplicate } = await postJson<{ duplicate: boolean }>("/api/photos/check-hash", { hash });
  if (duplicate) return { status: "duplicate", photoId: null };

  report("uploading", 0.2);
  const plan = await postJson<UploadPlan>("/api/upload-url", {
    program_id: batch.details.program_id,
    size_bytes: original.blob.size,
    thumb_size_bytes: thumb.blob.size,
  });

  let keys: { provider: "r2" | "gdrive"; originalKey: string; thumbKey: string; receipt: string };
  if (plan.mode === "direct") {
    await send("PUT", plan.puts.original.url, original.blob, plan.puts.original.headers, (f) => report("uploading", 0.2 + f * 0.6));
    await send("PUT", plan.puts.thumb.url, thumb.blob, plan.puts.thumb.headers, (f) => report("uploading", 0.8 + f * 0.1));
    keys = { provider: "r2", originalKey: plan.originalKey, thumbKey: plan.thumbKey, receipt: plan.receipt };
  } else {
    const form = new FormData();
    form.set("original", new File([original.blob], "photo.jpg", { type: "image/jpeg" }));
    form.set("thumb", new File([thumb.blob], "thumb.jpg", { type: "image/jpeg" }));
    form.set("program_id", batch.details.program_id);
    const text = await send("POST", "/api/upload/proxy", form, {}, (f) => report("uploading", 0.2 + f * 0.7));
    const res = JSON.parse(text) as ProxyUploadResult;
    keys = { provider: res.provider, originalKey: res.originalKey, thumbKey: res.thumbKey, receipt: res.receipt };
  }

  report("saving", 0.95);
  const o = item.override;
  const res = await postJson<{ duplicate: boolean; photo?: { id: string } }>("/api/photos", {
    report_id: batch.reportId,
    provider: keys.provider,
    original_key: keys.originalKey,
    thumb_key: keys.thumbKey,
    receipt: keys.receipt,
    size_bytes: original.blob.size,
    thumb_size_bytes: thumb.blob.size,
    width: original.width,
    height: original.height,
    content_hash: hash,
    exif_taken_at: exif.takenAt,
    village_id: o.village_id ?? null,
    panchayat_id: o.village_id ? (o.panchayat_id ?? null) : null,
    block_id: o.village_id ? (o.block_id ?? null) : null,
    note: o.note?.trim() || null,
    has_children: o.has_children,
    consent: batch.details.consent,
    taken_by: batch.details.taken_by || null,
    field_values: { ...(batch.details.field_values ?? {}), ...(o.field_values ?? {}) },
  });
  return res.duplicate ? { status: "duplicate", photoId: null } : { status: "done", photoId: res.photo?.id ?? null };
}
