import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { CalendarView } from "@/components/calendar/CalendarView";

export const metadata: Metadata = { title: "Content calendar" };

export default async function CalendarPage() {
  await requireAdmin();
  return (
    <Suspense>
      <CalendarView />
    </Suspense>
  );
}
