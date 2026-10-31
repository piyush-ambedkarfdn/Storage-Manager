import { NextResponse } from "next/server";

/**
 * DELETE THIS FILE. It is an old stray copy of the photo route (api/media/[id]) that also served full-size photos.
 * Until it is deleted it only answers "not found".
 */
export const GET = () => NextResponse.json({ error: "Not found." }, { status: 404 });
