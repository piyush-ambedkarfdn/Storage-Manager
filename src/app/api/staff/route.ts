import { handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { createStaff, listStaff } from "@/lib/staff";
import { createStaffSchema } from "@/lib/schemas/staff";

/** GET: every staff account (admin only). */
export const GET = handle(async () => {
  const session = await assertAdmin();
  return { staff: await listStaff(session) };
});

/** POST: create one staff account with a temporary password (admin only). */
export const POST = handle(async (req) => {
  const session = await assertAdmin();
  const input = await parseBody(createStaffSchema, req);
  return { staff: await createStaff(session, input) };
});
