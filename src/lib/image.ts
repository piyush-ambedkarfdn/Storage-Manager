/**
 * Browser-side image work, without extra libraries:
 * compressImage: about 1600 px on the long side, JPEG, aimed at 300-500 KB (orientation from EXIF is applied).
 * makeThumbnail: 400 px JPEG for grids. sha256: fingerprint for duplicate checks. readExif: the camera date.
 */

export type ImageResult = { blob: Blob; width: number; height: number };

async function decode(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This file could not be read as a photo.");
  }
}

function draw(bitmap: ImageBitmap, maxSide: number): { canvas: OffscreenCanvas | HTMLCanvasElement; width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas: OffscreenCanvas | HTMLCanvasElement =
    typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(width, height) : Object.assign(document.createElement("canvas"), { width, height });
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!ctx) throw new Error("This phone cannot process photos in the browser.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  return { canvas, width, height };
}

async function toJpeg(canvas: OffscreenCanvas | HTMLCanvasElement, quality: number): Promise<Blob> {
  if ("convertToBlob" in canvas) return canvas.convertToBlob({ type: "image/jpeg", quality });
  return new Promise((resolve, reject) =>
    (canvas as HTMLCanvasElement).toBlob((b) => (b ? resolve(b) : reject(new Error("Could not compress the photo."))), "image/jpeg", quality),
  );
}

async function encode(file: Blob, maxSide: number, targetBytes: number, qualities: number[]): Promise<ImageResult> {
  const bitmap = await decode(file);
  try {
    const { canvas, width, height } = draw(bitmap, maxSide);
    let blob: Blob | null = null;
    for (const q of qualities) {
      blob = await toJpeg(canvas, q);
      if (blob.size <= targetBytes) break;
    }
    return { blob: blob!, width, height };
  } finally {
    bitmap.close();
  }
}

export function compressImage(file: Blob): Promise<ImageResult> {
  return encode(file, 1600, 500_000, [0.82, 0.74, 0.66, 0.58, 0.5]);
}

export function makeThumbnail(file: Blob): Promise<ImageResult> {
  return encode(file, 400, 60_000, [0.72, 0.6, 0.5]);
}

export async function sha256(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** The camera's "date taken", as an ISO string in local time, or null. */
export async function readExif(file: Blob): Promise<{ takenAt: string | null }> {
  try {
    const { load } = await import("exifreader");
    const tags = load(await file.slice(0, 256 * 1024).arrayBuffer());
    const raw = tags.DateTimeOriginal?.description ?? tags.DateTime?.description;
    const m = raw && /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(String(raw));
    if (!m) return { takenAt: null };
    const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
    return { takenAt: Number.isNaN(d.getTime()) ? null : d.toISOString() };
  } catch {
    return { takenAt: null };
  }
}
