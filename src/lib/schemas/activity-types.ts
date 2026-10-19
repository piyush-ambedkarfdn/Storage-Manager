import { z } from "zod";

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a colour like #3B7DD8.");

export const createActivityTypeSchema = z.object({
  label: z.string().trim().min(1, "Write a name.").max(60),
  label_hi: z.string().trim().max(60).nullable().optional(),
  color: color.default("#7A8AA3"),
});

export const updateActivityTypeSchema = z
  .object({
    label: z.string().trim().min(1).max(60).optional(),
    label_hi: z.string().trim().max(60).nullable().optional(),
    color: color.optional(),
    hidden: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to change.");

export const reorderActivityTypesSchema = z.object({ ids: z.array(z.string().regex(/^[a-z0-9-]{1,40}$/)).min(1).max(100) });
