import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { uploadMessages } from "@/lib/i18n/messages/upload";
import { MyUploadsTabs } from "@/components/uploads/MyUploadsTabs";

export const metadata: Metadata = { title: "My uploads" };

export default async function MyUploadsPage() {
  await requireUser();
  const t = await getT(uploadMessages);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">{t("myTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("mySub")}</p>
      </div>
      <MyUploadsTabs />
    </div>
  );
}
