import { handle } from "@/lib/api";
import { assertUser } from "@/lib/auth";
import { getUsage } from "@/lib/storage-guard";

/** GET: usage of each storage against its limit. Staff use it for the "storage almost full" banner. */
export const GET = handle(async () => {
  const { profile } = await assertUser();
  const usage = await getUsage();
  if (profile.role === "admin") return usage;
  // staff only need to know whether uploads are paused
  return { ...usage, providers: usage.providers.filter((p) => p.active) };
});
