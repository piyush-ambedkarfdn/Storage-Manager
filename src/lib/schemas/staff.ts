import { z } from "zod";

/** Login IDs: lower-case letters, digits, dot, dash, underscore; 3 to 40 characters. Or a real email. */
export const LOGIN_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{2,39}$/;

export const loginSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine((v) => LOGIN_ID_PATTERN.test(v) || z.email().safeParse(v).success, {
    message: "Use 3 to 40 letters, numbers, dots or dashes (for example rakesh.chatra), or a real email.",
  });

export const passwordSchema = z.string().min(8, "The temporary password needs at least 8 characters.").max(72);

export const roleSchema = z.enum(["admin", "uploader"]);

const idList = z.array(z.uuid()).max(200).nullable().optional();

export const createStaffSchema = z.object({
  full_name: z.string().trim().min(1, "Enter the person's name.").max(120),
  login: loginSchema,
  password: passwordSchema,
  role: roleSchema.default("uploader"),
  assigned_district_ids: idList,
  assigned_program_ids: idList,
});
export type CreateStaffInput = z.infer<typeof createStaffSchema>;

export const updateStaffSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update"),
    full_name: z.string().trim().min(1, "Enter the person's name.").max(120),
    role: roleSchema,
    assigned_district_ids: idList,
    assigned_program_ids: idList,
  }),
  z.object({ action: z.literal("set_active"), active: z.boolean() }),
  z.object({ action: z.literal("reset_password"), password: passwordSchema }),
]);
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;

export const BULK_MAX_ROWS = 200;
export const bulkCreateSchema = z.object({
  csv: z.string().min(1, "The file is empty.").max(200_000, "The file is too large. Split it into smaller files."),
});

/** Readable temporary password, e.g. "kamal-7384-nadi". Works in the browser and on the server. */
const WORDS = ["kamal", "nadi", "pahad", "suraj", "chand", "khet", "dhan", "mitti", "baadal", "pedh", "taara", "hawa", "gaon", "raah", "deep", "phool"];
export function makeTempPassword(): string {
  const r = new Uint32Array(3);
  globalThis.crypto.getRandomValues(r);
  const w = (n: number) => WORDS[n % WORDS.length];
  return `${w(r[0])}-${String(1000 + (r[1] % 9000))}-${w(r[2])}`;
}
