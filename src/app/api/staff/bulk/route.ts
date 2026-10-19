import { handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { createStaff, readStaffCsv } from "@/lib/staff";
import { bulkCreateSchema, createStaffSchema } from "@/lib/schemas/staff";
import type { BulkRowResult } from "@/types/staff";

/**
 * POST { csv }: creates one account per row, one at a time, and reports each row.
 * A bad row never stops the others. Generated passwords are returned once so the admin can share them.
 */
export const POST = handle(async (req) => {
  const session = await assertAdmin();
  const { csv } = await parseBody(bulkCreateSchema, req);
  const rows = readStaffCsv(csv);
  const results: BulkRowResult[] = [];

  for (const r of rows) {
    const parsed = createStaffSchema.safeParse({
      full_name: r.full_name,
      login: r.login,
      password: r.password,
      role: r.role,
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      results.push({ row: r.row, login: r.login, ok: false, error: `${issue.path.join(".")}: ${issue.message}` });
      continue;
    }
    try {
      await createStaff(session, parsed.data);
      results.push({ row: r.row, login: r.login, ok: true, password: r.generated ? r.password : undefined });
    } catch (err) {
      results.push({ row: r.row, login: r.login, ok: false, error: err instanceof Error ? err.message : "Not created" });
    }
  }
  return { results };
});
