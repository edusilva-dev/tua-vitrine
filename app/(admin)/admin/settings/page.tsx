import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/server/context";
import { getEntitlements } from "@/modules/billing/server/entitlements";
import { listCategories } from "@/modules/catalog/server/service";
import { StoreSettings } from "@/modules/stores/components/store-settings";
import { getCurrentStore } from "@/modules/stores/server/service";

export default async function SettingsPage() {
  const store = await getCurrentStore();

  if (!store) redirect("/admin/onboarding");

  const context = await getAdminContext();
  const [entitlements, categories] = await Promise.all([
    getEntitlements(context),
    listCategories(context),
  ]);

  return <StoreSettings store={store} entitlements={entitlements} categories={categories} />;
}
