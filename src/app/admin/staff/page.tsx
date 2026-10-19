import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { StaffTable } from "@/components/staff/StaffTable";

export const metadata: Metadata = { title: "Staff accounts" };

export default async function StaffPage() {
  await requireAdmin();
  return (
    <div className="max-w-6xl">
      <StaffTable />
    </div>
  );
}
