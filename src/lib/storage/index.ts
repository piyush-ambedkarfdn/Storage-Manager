import "server-only";
import { ApiError } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { r2Provider } from "@/lib/storage/r2-provider";
import { driveProvider } from "@/lib/storage/drive-provider";
import type { StorageProvider } from "@/lib/storage/types";
import type { PhotoDto } from "@/types/photo";
import type { ProviderName } from "@/types/storage";

export type { StorageProvider, ProviderName };

const PROVIDERS: Record<ProviderName, StorageProvider> = { r2: r2Provider, gdrive: driveProvider };

export function getProvider(name: ProviderName): StorageProvider {
  const p = PROVIDERS[name];
  if (!p) throw new ApiError(500, `Unknown storage ${name}.`);
  return p;
}

/** Where NEW uploads go (app_settings.storage_provider). Existing photos stay where they are. */
export async function getActiveProviderName(): Promise<ProviderName> {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("value").eq("key", "storage_provider").maybeSingle();
  const active = (data?.value as { active?: string } | undefined)?.active;
  return active === "gdrive" ? "gdrive" : "r2";
}

type StoredPhoto = { storage_provider: ProviderName; storage_key: string; thumb_key: string };

/** The storage that holds this photo's files (each photo remembers its own). */
export function providerForPhoto(photo: Pick<StoredPhoto, "storage_provider">): StorageProvider {
  return getProvider(photo.storage_provider);
}

/** Turns a photos row into what the browser may see: storage keys removed, thumbUrl added. */
export function toPhotoDto(row: Record<string, unknown> & StoredPhoto & { id: string }): PhotoDto {
  const { storage_key: _key, thumb_key, content_hash: _hash, ...rest } = row as Record<string, unknown> &
    StoredPhoto & { id: string; content_hash?: string };
  void _key;
  void _hash;
  return {
    ...(rest as unknown as Omit<PhotoDto, "thumbUrl">),
    thumbUrl: providerForPhoto(row).thumbUrl(row.id, thumb_key),
  };
}
