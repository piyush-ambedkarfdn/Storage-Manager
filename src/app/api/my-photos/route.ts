import { handle } from "@/lib/api";
import { assertUser } from "@/lib/auth";
import { listMyPhotos } from "@/lib/uploads/my-photos-server";

/** GET (any signed-in person): their own photos with village, program and activity type, newest first. */
export const GET = handle(async () => {
  const session = await assertUser();
  return { photos: await listMyPhotos(session) };
});
