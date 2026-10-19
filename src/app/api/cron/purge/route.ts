import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { optionalEnv } from "@/lib/env";
import { runPurge } from "@/lib/storage/purge";

export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = optionalEnv("CRON_SECRET");
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Daily purge. Vercel Cron calls it with "Authorization: Bearer <CRON_SECRET>" (see vercel.json);
 * a scheduled GitHub Action or any free cron service can call it the same way.
 * Deletes trashed photos older than the trash window from their storage, then marks them purged.
 */
async function run(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  try {
    return NextResponse.json(await runPurge());
  } catch (err) {
    console.error("[cron purge]", err);
    return NextResponse.json({ error: "Purge failed. See the server log." }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
