import { handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { runLgdImport } from "@/lib/lgd/import";
import { lgdImportSchema } from "@/lib/schemas/places";

/** POST { rows } for ONE district (admin): counts what an import would do. Nothing is saved. */
export const POST = handle(async (req) => {
  const session = await assertAdmin();
  const { rows } = await parseBody(lgdImportSchema, req);
  return { result: await runLgdImport(session, rows, false) };
});
