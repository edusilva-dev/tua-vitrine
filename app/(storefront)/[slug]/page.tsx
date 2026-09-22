import { notFound } from "next/navigation";
import { StorefrontPage } from "@/modules/storefront/server-page";
import { getStoreBySlug } from "@/modules/stores/server/service";

export const dynamic = "force-dynamic";

export default async function PublicStorePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);

  if (store?.status !== "ACTIVE") notFound();

  return <StorefrontPage store={store} searchParams={searchParams} />;
}
