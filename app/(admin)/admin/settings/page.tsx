import { redirect } from "next/navigation";
import { StoreSettings } from "@/modules/stores/components/store-settings";
import { getCurrentStore } from "@/modules/stores/server/service";
export default async function SettingsPage() {
  const store = await getCurrentStore();

  if (!store) redirect("/admin/onboarding");

  return <StoreSettings store={store} />;
}
