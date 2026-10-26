import { PageSkeleton } from "@/components/shared/PageSkeleton";

/** Upload and My uploads: shown at once while the page is being prepared. */
export default function Loading() {
  return <PageSkeleton variant="form" />;
}
