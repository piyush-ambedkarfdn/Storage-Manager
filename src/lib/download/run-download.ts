import { pickFolder, supportsFolderWrite, writeFile } from "@/lib/download/fs-writer";
import { saveZipPart, splitParts, type ZipEntry } from "@/lib/download/zip";
import type { DownloadManifest, ManifestFile } from "@/types/gallery";

export type DownloadProgress = {
  done: number;
  total: number;
  bytes: number;
  totalBytes: number;
  current: string;
  part: number;
  parts: number;
  failed: { path: string; error: string }[];
};

export type DownloadMode = "folder" | "zip";

async function fetchFile(f: ManifestFile, signal: AbortSignal): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(f.url, { signal, credentials: f.url.startsWith("/") ? "same-origin" : "omit" });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      if (signal.aborted || attempt >= 1) throw err;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
}

/**
 * Downloads every file of a manifest into folders (Chrome/Edge) or ZIP parts (other browsers),
 * plus _metadata.csv. Files that fail are listed, never silently dropped. Returns the photo ids saved.
 */
export async function runDownload(
  manifest: DownloadManifest,
  opts: { mode: DownloadMode; zipName: string; signal: AbortSignal; onProgress: (p: DownloadProgress) => void },
): Promise<{ savedIds: string[]; failed: DownloadProgress["failed"] }> {
  const progress: DownloadProgress = {
    done: 0,
    total: manifest.files.length,
    bytes: 0,
    totalBytes: manifest.totalBytes,
    current: "",
    part: 1,
    parts: 1,
    failed: [],
  };
  const savedIds: string[] = [];
  const report = () => opts.onProgress({ ...progress, failed: [...progress.failed] });
  const csv = new Blob([manifest.csv], { type: "text/csv;charset=utf-8" });

  if (opts.mode === "folder" && supportsFolderWrite()) {
    const root = await pickFolder();
    await writeFile(root, "_metadata.csv", csv);
    for (const f of manifest.files) {
      if (opts.signal.aborted) break;
      progress.current = f.path;
      report();
      try {
        const res = await fetchFile(f, opts.signal);
        await writeFile(root, f.path, res.body!);
        savedIds.push(f.photoId);
        progress.bytes += f.size;
      } catch (err) {
        if (opts.signal.aborted) break;
        progress.failed.push({ path: f.path, error: err instanceof Error ? err.message : String(err) });
      }
      progress.done++;
      report();
    }
    return { savedIds, failed: progress.failed };
  }

  const parts = splitParts(manifest.files);
  progress.parts = parts.length;
  for (const [i, files] of parts.entries()) {
    if (opts.signal.aborted) break;
    progress.part = i + 1;
    const entries: ZipEntry[] = files.map((f) => ({
      path: f.path,
      size: f.size,
      open: async () => {
        progress.current = f.path;
        report();
        try {
          const res = await fetchFile(f, opts.signal);
          const blob = await res.blob();
          savedIds.push(f.photoId);
          progress.bytes += f.size;
          return blob;
        } catch (err) {
          if (!opts.signal.aborted) progress.failed.push({ path: f.path, error: err instanceof Error ? err.message : String(err) });
          return null;
        } finally {
          progress.done++;
          report();
        }
      },
    }));
    if (i === 0) entries.unshift({ path: "_metadata.csv", size: csv.size, open: async () => csv });
    const name = parts.length > 1 ? `${opts.zipName}-part${i + 1}of${parts.length}.zip` : `${opts.zipName}.zip`;
    await saveZipPart(entries, name);
  }
  return { savedIds, failed: progress.failed };
}
