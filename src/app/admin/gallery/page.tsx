import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { galleryMessages } from "@/lib/i18n/messages/gallery";
import { PageHeader } from "@/components/shared/PageHeader";
import { Crumbs } from "@/components/gallery/Crumbs";
import { GalleryFilterMemory } from "@/components/gallery/GalleryFilterMemory";
import { GalleryFilterPanel } from "@/components/gallery/GalleryFilterPanel";
import { FolderTree } from "@/components/gallery/FolderTree";
import { PhotoGrid } from "@/components/gallery/PhotoGrid";

export const metadata: Metadata = { title: "Gallery" };

export default async function GalleryPage() {
  await requireAdmin();
  const t = await getT(galleryMessages);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      {/* the gallery reads its filters from the URL */}
      <Suspense>
        <div className="grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-16">
            <FolderTree />
          </div>
          <div className="flex min-w-0 flex-col gap-3">
            <GalleryFilterMemory />
            <GalleryFilterPanel />
            <Crumbs />
            <PhotoGrid />
          </div>
        </div>
      </Suspense>
    </div>
  );
}
