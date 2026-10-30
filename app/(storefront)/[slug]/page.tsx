import { notFound } from "next/navigation";
import { getEntitlements } from "@/modules/billing/server/entitlements";
import { AnalyticsIdentity } from "@/modules/observability/components/analytics-identity";
import { toAnalyticsStoreGroup } from "@/modules/observability/contracts/store-group";
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

  const entitlements = await getEntitlements({ storeId: store.id });

  return (
    <>
      <AnalyticsIdentity userId={null} store={toAnalyticsStoreGroup(store, entitlements.plan)} />
      <StorefrontPage
        store={store}
        searchParams={searchParams}
        showFreeBranding={entitlements.plan === "FREE"}
      />
    </>
  );
}
