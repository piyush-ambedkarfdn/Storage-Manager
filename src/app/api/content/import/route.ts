import { ApiError, handle } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { listImports, runImport } from "@/lib/content/import-server";
import { importPayloadSchema } from "@/lib/schemas/content-import";

/** GET (admin): the last 10 imports. */
export const GET = handle(async () => {
  const session = await assertAdmin();
  return { imports: await listImports(session) };
});

/**
 * POST multipart (admin): `file` (.xlsx or .csv) and `payload` (JSON: { rows, addOptions, skipDuplicates }).
 * The file goes to the active storage and the rows to the database in one go.
 */
export const POST = handle(async (req) => {
  const session = await assertAdmin();
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const raw = form?.get("payload");
  if (!(file instanceof File) || typeof raw !== "string") throw new ApiError(400, "Send the file and the rows together.");
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new ApiError(400, "The rows are not valid JSON.");
  }
  const parsed = importPayloadSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ApiError(400, `${issue?.path.join(".") ?? "rows"}: ${issue?.message ?? "invalid"}`);
  }
  return { result: await runImport(session, file, parsed.data) };
});
