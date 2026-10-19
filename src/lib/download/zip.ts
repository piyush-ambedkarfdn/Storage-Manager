import { downloadZip } from "client-zip";

/**
 * ZIP download for browsers without folder writing. The ZIP is built in the browser (no server
 * zipping) in parts of about 400 MB, so phones and small laptops do not run out of memory.
 */
export const ZIP_PART_BYTES = 400 * 1024 * 1024;

export type ZipEntry = { path: string; size: number; open: () => Promise<Response | Blob | null> };

/** Splits entries into parts under the size limit (an entry larger than the limit gets a part of its own). */
export function splitParts<T extends { size: number }>(entries: T[], limit = ZIP_PART_BYTES): T[][] {
  const parts: T[][] = [];
  let current: T[] = [];
  let bytes = 0;
  for (const e of entries) {
    if (current.length && bytes + e.size > limit) {
      parts.push(current);
      current = [];
      bytes = 0;
    }
    current.push(e);
    bytes += e.size;
  }
  if (current.length) parts.push(current);
  return parts;
}

/** Builds one ZIP part and hands it to the browser as a download. */
export async function saveZipPart(entries: ZipEntry[], fileName: string): Promise<void> {
  async function* files() {
    for (const e of entries) {
      const input = await e.open();
      if (input) yield { name: e.path, input, lastModified: new Date() };
    }
  }
  const blob = await downloadZip(files()).blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
