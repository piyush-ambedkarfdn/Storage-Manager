import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handle, parseQuery } from "@/lib/api";
import { assertUser } from "@/lib/auth";
import { mediaQuery } from "@/lib/schemas/photo";
import { getProvider } from "@/lib/storage";
import type { ProviderName } from "@/types/storage";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET ?v=thumb|original. Access is checked first (row-level security: staff see their own photos,
 * admins all). R2: redirect to the public thumbnail or a short-lived signed original.
 * Google Drive: the file is streamed through the server and cached privately by the browser.
 */
export const GET = handle<Ctx>(async (req, ctx) => {
  const { supabase, profile } = await assertUser();
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "Photo not found.");
  const { v } = parseQuery(mediaQuery, req.url);
  // only admins can open or download the full-size photo; staff see thumbnails of their own photos
  if (v === "original" && profile.role !== "admin") throw new ApiError(403, "Only admins can open the full-size photo.");

  const { data: photo } = await supabase
    .from("photos")
    .select("id, storage_provider, storage_key, thumb_key, status")
    .eq("id", id)
    .maybeSingle();
  if (!photo || photo.status === "purged") throw new ApiError(404, "Photo not found.");
  if (v === "original" && photo.status === "archived") {
    throw new ApiError(410, "The original of this photo was archived to save space. Only the thumbnail is kept.");
  }

  const provider = getProvider(photo.storage_provider as ProviderName);
  const key = (v === "thumb" ? photo.thumb_key : photo.storage_key) as string;

  if (photo.storage_provider === "r2") {
    const url = v === "thumb" ? provider.thumbUrl(id, key) : await provider.originalUrl(id, key);
    if (!url.startsWith("/api/media/")) return NextResponse.redirect(url, 302);
  }

  const file = await provider.getBytes(key);
  return new Response(file.body, {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "private, max-age=31536000, immutable",
      ...(file.size ? { "Content-Length": String(file.size) } : {}),
    },
  });
});