import { z } from "zod";
import { PROVIDER_NAMES } from "@/types/storage";

export const setProviderSchema = z.object({ active: z.enum(PROVIDER_NAMES) });
