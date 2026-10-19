import { z } from "zod";
import { ACTIVITY_GROUPS } from "@/types/activity-view";

const groups = Object.keys(ACTIVITY_GROUPS) as [keyof typeof ACTIVITY_GROUPS, ...(keyof typeof ACTIVITY_GROUPS)[]];

export const timelineQuery = z.object({
  user: z.uuid().optional(),
  group: z.enum(groups).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  cursor: z.iso.datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(10).max(200).default(50),
});
export type TimelineQuery = z.infer<typeof timelineQuery>;

export const activityQuery = z.object({
  view: z.enum(["staff", "perday", "timeline"]).default("timeline"),
  days: z.coerce.number().int().min(7).max(90).default(14),
});
