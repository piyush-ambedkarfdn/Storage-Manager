import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { DashboardView } from "@/components/dashboard/DashboardView";

export const metadata: Metadata = { title: "Dashboard" };

/** Admin home: the dashboard (replaces the phase 1 welcome page). */
export default async function AdminHomePage() {
  await requireAdmin();
  return <DashboardView />;
}
