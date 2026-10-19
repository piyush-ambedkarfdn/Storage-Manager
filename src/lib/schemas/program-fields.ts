import { z } from "zod";

const label = z.string().trim().min(1, "Write a name.").max(80, "That name is too long.");
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a colour like #3B7DD8.").nullable().optional();

export const fieldValuesSchema = z.record(z.uuid(), z.array(z.uuid()).max(20)).default({});

export const createFieldSchema = z.object({
  program_id: z.uuid(),
  label,
  label_hi: z.string().trim().max(80).nullable().optional(),
  multiple: z.boolean().default(false),
  required: z.boolean().default(false),
  options: z.array(label).max(30).default([]),
});

export const updateFieldSchema = z
  .object({
    label: label.optional(),
    label_hi: z.string().trim().max(80).nullable().optional(),
    multiple: z.boolean().optional(),
    required: z.boolean().optional(),
    hidden: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to change.");

export const reorderSchema = z.object({ ids: z.array(z.uuid()).min(1).max(100) });

export const createOptionSchema = z.object({ value: label, value_hi: z.string().trim().max(80).nullable().optional(), color });

export const updateOptionSchema = z
  .object({ value: label.optional(), value_hi: z.string().trim().max(80).nullable().optional(), color, hidden: z.boolean().optional() })
  .refine((v) => Object.keys(v).length > 0, "Nothing to change.");

export const setCategoriesSchema = z.object({ values: fieldValuesSchema });
