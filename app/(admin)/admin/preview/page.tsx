import { redirect } from "next/navigation";
import { getEntitlements } from "@/modules/billing/server/entitlements";
import { StorefrontPage } from "@/modules/storefront/server-page";
import { getCurrentStore } from "@/modules/stores/server/service";

export const dynamic = "force-dynamic";

export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const store = await getCurrentStore();

  if (!store) redirect("/admin/onboarding");

  const entitlements = await getEntitlements({ storeId: store.id });

  return (
    <StorefrontPage store={store} searchParams={searchParams} plan={entitlements.plan} preview />
  );
}
