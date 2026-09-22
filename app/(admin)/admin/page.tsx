import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/server/context";
import { MetricsOverview } from "@/modules/analytics/components/overview";
import { getMetrics } from "@/modules/analytics/server/service";
import { getCurrentStore } from "@/modules/stores/server/service";

export default async function AdminPage() {
  const store = await getCurrentStore();

  if (!store) redirect("/admin/onboarding");

  const metrics = await getMetrics(await getAdminContext());

  return <MetricsOverview metrics={metrics} store={store} />;
}
