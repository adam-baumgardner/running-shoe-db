import { notFound, redirect } from "next/navigation";
import { getShoeParentPageData } from "@/lib/server/catalog";

interface ShoeDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ShoeDetailPage({ params }: ShoeDetailPageProps) {
  const { slug } = await params;
  const shoe = await getShoeParentPageData(slug);

  if (!shoe || !shoe.releases.length) {
    notFound();
  }

  redirect(`/shoes/${shoe.slug}/${shoe.releases[0].releaseSlug}`);
}
