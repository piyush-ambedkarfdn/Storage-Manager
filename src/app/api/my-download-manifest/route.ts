import { NextResponse } from "next/server";

/**
 * DELETE THIS FILE. Staff can no longer download photos; only admins can (see api/review/download-manifest and
 * the gallery download). Until it is deleted it only answers "not allowed".
 */
export const POST = () => NextResponse.json({ error: "Downloads are for admins only." }, { status: 403 });
