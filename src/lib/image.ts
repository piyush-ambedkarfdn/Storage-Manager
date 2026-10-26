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

export type PreparedImage = { blob: Blob; width: number; height: number; thumb: Blob };

async function shrink(bitmap: ImageBitmap, maxSide: number, targetBytes: number, qualities: number[]): Promise<ImageResult> {
  const { canvas, width, height } = draw(bitmap, maxSide);
  let blob: Blob | null = null;
  for (const q of qualities) {
    blob = await toJpeg(canvas, q);
    if (blob.size <= targetBytes) break;
  }
  return { blob: blob!, width, height };
}

/**
 * The upload copy (about 1600 px, aimed at 500 KB) and the grid thumbnail (400 px), from ONE decode of the photo.
 * Decoding a 12 MP camera photo twice at once is what makes low-memory phones stall.
 */
export async function prepareImage(file: Blob): Promise<PreparedImage> {
  const bitmap = await decode(file);
  try {
    const main = await shrink(bitmap, 1600, 500_000, [0.82, 0.74, 0.66, 0.58, 0.5]);
    const thumb = await shrink(bitmap, 400, 60_000, [0.72, 0.6, 0.5]);
    return { blob: main.blob, width: main.width, height: main.height, thumb: thumb.blob };
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
  const bytes = await blob.arrayBuffer();
  // crypto.subtle only exists on secure pages (https or localhost); keep working elsewhere with a simple fingerprint
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // 8 different 32-bit hashes of the bytes, written as 64 hex characters (the same shape as a SHA-256)
  const view = new Uint8Array(bytes);
  const seeds = [0xdeadbeef, 0x41c6ce57, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35, 0x27d4eb2f, 0x165667b1, 0xd3a2646c];
  return seeds
    .map((seed, k) => {
      let h = seed ^ view.length;
      const m = 2654435761 + k * 2;
      for (let i = 0; i < view.length; i++) h = Math.imul(h ^ view[i], m);
      h = Math.imul(h ^ (h >>> 15), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return ((h ^ (h >>> 16)) >>> 0).toString(16).padStart(8, "0");
    })
    .join("");
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
