import { z } from "zod";
import { ApiError, handle, parseBody } from "@/lib/api";
import { assertAdmin } from "@/lib/auth";
import { deleteStaff, resetPassword, setActive, updateStaff } from "@/lib/staff";
import { updateStaffSchema } from "@/lib/schemas/staff";

type Ctx = { params: Promise<{ id: string }> };

async function staffId(ctx: Ctx): Promise<string> {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "This staff account does not exist.");
  return id;
}

/** PATCH: edit details, switch on/off, or reset the password (admin only). */
export const PATCH = handle<Ctx>(async (req, ctx) => {
  const session = await assertAdmin();
  const id = await staffId(ctx);
  const input = await parseBody(updateStaffSchema, req);
  switch (input.action) {
    case "update":
      await updateStaff(session, id, input);
      break;
    case "set_active":
      await setActive(session, id, input.active);
      break;
    case "reset_password":
      await resetPassword(session, id, input.password);
      break;
  }
  return { ok: true };
});

/** DELETE: only for accounts with no uploads (admin only). */
export const DELETE = handle<Ctx>(async (_req, ctx) => {
  const session = await assertAdmin();
  await deleteStaff(session, await staffId(ctx));
  return { ok: true };
});
