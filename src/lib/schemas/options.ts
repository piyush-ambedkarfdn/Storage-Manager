import { z } from "zod";
import { OPTION_TYPES } from "@/types/options";

export const optionTypeSchema = z.enum(OPTION_TYPES);
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a colour like #3B7DD8.");
const label = z.string().trim().min(1, "Enter a name.").max(80, "That name is too long.");

export const optionListQuery = z.object({
  type: optionTypeSchema.optional(),
  all: z.enum(["1", "0"]).optional(),
});

export const createOptionSchema = z.object({
  type: optionTypeSchema,
  value: label,
  color: hexColor.nullable().optional(),
});

export const updateOptionSchema = z
  .object({
    value: label.optional(),
    color: hexColor.nullable().optional(),
    hidden: z.boolean().optional(),
    protects_photos: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to change.");

export const reorderSchema = z.object({
  type: z.union([optionTypeSchema, z.literal("program")]),
  ids: z.array(z.uuid()).min(1).max(200),
});

export const createProgramSchema = z.object({ name: label });
export const updateProgramSchema = z
  .object({ name: label.optional(), hidden: z.boolean().optional() })
  .refine((v) => Object.keys(v).length > 0, "Nothing to change.");
