import { z } from "zod";
import { DAY_SCOPES } from "@/types/days";

export const daysQuery = z.object({
  from: z.iso.date(),
  to: z.iso.date(),
  all: z.enum(["1", "0"]).optional(),
});

const validDate = (v: { month: number; day: number; year?: number | null }) => {
  const y = v.year ?? 2024; // a leap year, so 29 Feb is allowed for yearly days
  const d = new Date(Date.UTC(y, v.month - 1, v.day));
  return d.getUTCMonth() === v.month - 1;
};

export const customDaySchema = z
  .object({
    name: z.string().trim().min(1, "Write the name of the day.").max(120),
    name_hi: z.string().trim().max(120).nullable().optional(),
    month: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(31),
    year: z.number().int().min(2020).max(2100).nullable().optional(),
    scope: z.enum(DAY_SCOPES).default("local"),
    tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
    note: z.string().trim().max(500).nullable().optional(),
  })
  .refine(validDate, { message: "That date does not exist.", path: ["day"] });

export const hideDaySchema = z.object({ id: z.string().min(1).max(120), hidden: z.boolean() });
