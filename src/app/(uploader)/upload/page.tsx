import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { uploadMessages } from "@/lib/i18n/messages/upload";
import { BatchForm } from "@/components/upload/BatchForm";
import { StorageBanner } from "@/components/upload/StorageBanner";

export const metadata: Metadata = { title: "Upload photos" };

export default async function UploadPage() {
  await requireUser();
  const t = await getT(uploadMessages);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">
        {t("title")} <span className="text-base font-normal text-muted-foreground">· फोटो अपलोड</span>
      </h1>
      <StorageBanner />
      <BatchForm />
    </div>
  );
}
