/**
 * Writes real folders to the computer (Chrome and Edge on desktop: File System Access API).
 * The admin picks a destination folder once; sub-folders are created as needed.
 */

type DirectoryPicker = (options?: { mode?: "read" | "readwrite"; id?: string }) => Promise<FileSystemDirectoryHandle>;

export function supportsFolderWrite(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window && window.isSecureContext;
}

export async function pickFolder(): Promise<FileSystemDirectoryHandle> {
  const picker = (window as unknown as { showDirectoryPicker: DirectoryPicker }).showDirectoryPicker;
  return picker({ mode: "readwrite", id: "storage-org-downloads" });
}

export async function writeFile(root: FileSystemDirectoryHandle, path: string, data: ReadableStream<Uint8Array> | Blob): Promise<void> {
  const parts = path.split("/");
  const name = parts.pop()!;
  let dir = root;
  for (const p of parts) dir = await dir.getDirectoryHandle(p, { create: true });
  const handle = await dir.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  if (data instanceof Blob) {
    await writable.write(data);
    await writable.close();
  } else {
    await data.pipeTo(writable); // closes the file when done
  }
}
