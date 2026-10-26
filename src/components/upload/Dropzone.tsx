"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/provider";
import { uploadMessages } from "@/lib/i18n/messages/upload";
import type { PhotoOverride } from "@/lib/upload/queue-db";

/**
 * A photo picked in step 2. It is shrunk right away (see usePhotoPreparer): `file` becomes the small upload copy and
 * `thumb` the preview, so a phone never has to hold ten full-size camera photos at once.
 */
export type DraftPhoto = {
  key: string;
  name: string;
  status: "preparing" | "ready" | "error";
  file: Blob | null;
  thumb: Blob | null;
  width: number;
  height: number;
  takenAt: string | null;
  error?: string;
  override: PhotoOverride;
};

/** Shows a File/Blob as an image and frees the memory afterwards. */
export function BlobThumb({ blob, alt, className }: { blob: Blob; alt: string; className?: string }) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  // eslint-disable-next-line @next/next/no-img-element -- local preview of a file on the phone
  return <img src={url} alt={alt} className={cn("aspect-square w-full rounded-md bg-photo-surface object-cover", className)} />;
}

/** "Take photo" (camera), "Choose from gallery", or drag and drop on a computer. The added photos are listed by PhotoList. */
export function Dropzone({ onAdd }: { onAdd: (files: File[]) => void }) {
  const t = useT(uploadMessages);
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const take = (list: FileList | null) => {
    const files = [...(list ?? [])].filter((f) => f.type.startsWith("image/") || /\.(heic|heif|jpe?g|png|webp)$/i.test(f.name));
    if (files.length) onAdd(files);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" className="min-h-14 text-base" onClick={() => camera.current?.click()}>
          <Camera aria-hidden className="size-5" /> {t("takePhoto")}
        </Button>
        <Button type="button" variant="outline" className="min-h-14 text-base" onClick={() => gallery.current?.click()}>
          <ImagePlus aria-hidden className="size-5" /> {t("chooseFromGallery")}
        </Button>
        <input ref={camera} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} onChange={(e) => (take(e.target.files), (e.target.value = ""))} />
        <input ref={gallery} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} onChange={(e) => (take(e.target.files), (e.target.value = ""))} />
      </div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          take(e.dataTransfer.files);
        }}
        className={cn("hidden rounded-lg border-2 border-dashed p-4 text-center text-sm text-muted-foreground sm:block", over && "border-primary bg-primary/5")}
      >
        {t("dropHere")}
      </div>
    </div>
  );
}
