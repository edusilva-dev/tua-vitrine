import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/server/context";
import { getEntitlements } from "@/modules/billing/server/entitlements";
import { StoreSettings } from "@/modules/stores/components/store-settings";
import { getCurrentStore } from "@/modules/stores/server/service";

export default async function SettingsPage() {
  const store = await getCurrentStore();

  if (!store) redirect("/admin/onboarding");

  const entitlements = await getEntitlements(await getAdminContext());

  return <StoreSettings store={store} entitlements={entitlements} />;
}
