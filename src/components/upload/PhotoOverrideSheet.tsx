"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { BlobThumb, type DraftPhoto } from "@/components/upload/Dropzone";
import { NameCombobox, type PlaceValue } from "@/components/upload/NameCombobox";
import { useT } from "@/lib/i18n/provider";
import { uploadMessages } from "@/lib/i18n/messages/upload";
import type { PhotoOverride } from "@/lib/upload/queue-db";

/** Per-photo details: another village in the same panchayat, a one-line note, contains children. (Categories and rating are on the photo's card.) */
export function PhotoOverrideSheet({
  photo,
  panchayatId,
  blockId,
  onSave,
  onClose,
}: {
  photo: DraftPhoto | null;
  panchayatId: string | null;
  blockId: string | null;
  onSave: (key: string, override: PhotoOverride) => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={photo !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto">
        {photo ? (
          <Body key={photo.key} photo={photo} panchayatId={panchayatId} blockId={blockId} onSave={onSave} onClose={onClose} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Body({
  photo,
  panchayatId,
  blockId,
  onSave,
  onClose,
}: {
  photo: DraftPhoto;
  panchayatId: string | null;
  blockId: string | null;
  onSave: (key: string, override: PhotoOverride) => void;
  onClose: () => void;
}) {
  const t = useT(uploadMessages);
  const o = photo.override;
  const [village, setVillage] = useState<PlaceValue | null>(o.village_id ? { id: o.village_id, name: o.village_name ?? "" } : null);
  const [note, setNote] = useState(o.note ?? "");
  const [children, setChildren] = useState(o.has_children);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-4">
      <SheetHeader className="px-0">
        <SheetTitle>{t("overrideTitle")}</SheetTitle>
        <SheetDescription className="sr-only">{photo.file.name}</SheetDescription>
      </SheetHeader>
      <div className="w-28">
        <BlobThumb blob={photo.file} alt={photo.file.name} />
      </div>
      <NameCombobox
        level="village"
        parentId={panchayatId}
        value={village}
        onChange={setVillage}
        label={t("overrideVillage")}
        levelLabel={t("village")}
        parentLabel={t("panchayat")}
      />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ov-note">{t("overrideNote")}</Label>
        <Input id="ov-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className="min-h-11" />
      </div>
      <label className="flex items-start gap-3 rounded-md border p-3">
        <Switch checked={children} onCheckedChange={setChildren} className="mt-0.5" />
        <span>
          <span className="block font-semibold">{t("containsChildren")}</span>
          <span className="block text-xs text-muted-foreground">{t("containsChildrenHint")}</span>
        </span>
      </label>
      <SheetFooter className="px-0">
        <Button
          className="min-h-12"
          onClick={() => {
            // rating and categories are set on the photo's card, so they are kept as they are
            onSave(photo.key, {
              ...photo.override,
              village_id: village?.id ?? null,
              village_name: village?.name ?? null,
              panchayat_id: village ? panchayatId : null,
              block_id: village ? blockId : null,
              note,
              has_children: children,
            });
            onClose();
          }}
        >
          {t("done")}
        </Button>
      </SheetFooter>
    </div>
  );
}
