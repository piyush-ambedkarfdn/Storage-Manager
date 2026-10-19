import { handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { runLgdImport } from "@/lib/lgd/import";
import { lgdImportSchema } from "@/lib/schemas/places";

/** POST { rows } for ONE district (admin): imports it. The database logs place_imported. */
export const POST = handle(async (req) => {
  const session = await assertAdmin();
  const { rows } = await parseBody(lgdImportSchema, req);
  return { result: await runLgdImport(session, rows, true) };
});
