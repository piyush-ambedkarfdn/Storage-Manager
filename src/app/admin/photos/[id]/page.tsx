import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getPhotoDetail } from "@/lib/photos/detail";
import { PhotoDetailView } from "@/components/photo/PhotoDetailView";

export const metadata: Metadata = { title: "Photo" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Photo detail: what staff entered and the field report as written and as improved by AI (admins only). */
export default async function PhotoPage({ params, searchParams }: Props) {
  const session = await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const fromRaw = (await searchParams).from;
  const from = typeof fromRaw === "string" ? fromRaw.slice(0, 4000) : "";
  const detail = await getPhotoDetail(session, id, from);
  if (!detail) notFound();
  return <PhotoDetailView key={id} id={id} from={from} initial={detail} />;
}
