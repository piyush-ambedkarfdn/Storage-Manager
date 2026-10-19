import { z } from "zod";
import { CHILD_LEVELS, PLACE_LEVELS } from "@/types/places";

export const placeLevelSchema = z.enum(PLACE_LEVELS);
export const childLevelSchema = z.enum(CHILD_LEVELS);
const placeName = z.string().trim().min(1, "Enter a name.").max(120, "That name is too long.");

const boolish = z
  .enum(["1", "0", "true", "false"])
  .optional()
  .transform((v) => v === "1" || v === "true");

export const placeListQuery = z.object({
  level: placeLevelSchema,
  parent: z.uuid().optional(),
  q: z.string().trim().max(80).optional(),
  pending: boolish,
  limit: z.coerce.number().int().min(1).max(1000).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const createPlaceSchema = z.object({
  level: placeLevelSchema,
  name: placeName,
  parent_id: z.uuid().nullable().optional(),
});

export const updatePlaceSchema = z
  .object({
    name: placeName.optional(),
    approved: z.boolean().optional(),
    parent_id: z.uuid().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to change.");

export const mergeSchema = z.object({
  type: z.enum(["program", ...CHILD_LEVELS]),
  from: z.uuid(),
  into: z.uuid(),
});

export const similarQuery = z.object({
  type: z.enum(["program", ...CHILD_LEVELS]),
  q: z.string().trim().min(1).max(120),
  parent: z.uuid().optional(),
});

const code = z.string().regex(/^\d*$/).max(12);
const lgdName = z.string().max(200);
export const lgdRowSchema = z.object({
  dc: code, dn: lgdName, bc: code, bn: lgdName, pc: code, pn: lgdName, vc: code, vn: lgdName,
});
export const LGD_MAX_ROWS = 20_000;
export const lgdImportSchema = z.object({
  rows: z.array(lgdRowSchema).min(1, "No rows to import.").max(LGD_MAX_ROWS, "Too many rows. Import one district at a time."),
});
