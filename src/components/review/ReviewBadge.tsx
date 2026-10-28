"use client";

import { useReviewCount } from "@/hooks/useReview";

/** The number of photos waiting for review, shown next to "Review" in the sidebar. */
export function ReviewBadge() {
  const { data } = useReviewCount();
  if (!data) return null;
  return (
    <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-marigold px-1.5 text-xs font-bold text-[#14213a]" aria-label={`${data}`}>
      {data > 99 ? "99+" : data}
    </span>
  );
}
