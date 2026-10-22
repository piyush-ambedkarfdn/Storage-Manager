import { z } from "zod";
import { ApiError, handle } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { getProvider } from "@/lib/storage";
import type { ProviderName } from "@/types/storage";

type Ctx = { params: Promise<{ id: string }> };

/** GET (admin): downloads the original file of an import from the storage that holds it. */
export const GET = handle<Ctx>(async (_req, ctx) => {
  const { supabase } = await assertAdmin();
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "This import does not exist.");
  const { data } = await supabase.from("calendar_imports").select("file_name, storage_provider, storage_key").eq("id", id).maybeSingle();
  if (!data) throw new ApiError(404, "This import does not exist.");

  const file = await getProvider(data.storage_provider as ProviderName).getBytes(data.storage_key as string);
  const name = encodeURIComponent(data.file_name as string);
  return new Response(file.body, {
    headers: {
      "Content-Type": file.contentType || "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${name}`,
      "Cache-Control": "private, no-store",
    },
  });
});
