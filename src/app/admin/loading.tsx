import { PageSkeleton } from "@/components/shared/PageSkeleton";

/** Shown at once while any admin page is being prepared. */
export default function Loading() {
  return <PageSkeleton variant="page" />;
}
