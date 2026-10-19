import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { authUrl, googleAppConfigured } from "@/lib/storage/google-auth";
import { signToken } from "@/lib/storage/secrets";

/** GET (admin): sends the admin to Google's consent page. The signed state ties the reply to this admin. */
export const GET = handle(async (req) => {
  const { profile } = await assertAdmin();
  if (!googleAppConfigured()) {
    return NextResponse.redirect(new URL("/admin/storage?google=not-configured", req.url));
  }
  return NextResponse.redirect(authUrl(signToken({ uid: profile.id }, 10 * 60)));
});
