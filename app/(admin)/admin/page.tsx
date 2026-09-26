import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/server/context";
import { MetricsOverview } from "@/modules/analytics/components/overview";
import { getMetrics } from "@/modules/analytics/server/service";
import { TrialBanner } from "@/modules/billing/components/trial-banner";
import { getEntitlements } from "@/modules/billing/server/entitlements";
import { getCurrentStore } from "@/modules/stores/server/service";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ plano?: string }>;
}) {
  const store = await getCurrentStore();

  if (!store) {
    const { plano } = await searchParams;
    const suffix = ["essencial", "profissional"].includes(plano ?? "") ? `?plano=${plano}` : "";

    redirect(`/admin/onboarding${suffix}`);
  }

  const context = await getAdminContext();
  const [metrics, entitlements] = await Promise.all([
    getMetrics(context),
    getEntitlements(context),
  ]);

  return (
    <div className="space-y-6">
      <TrialBanner entitlements={entitlements} />
      <MetricsOverview metrics={metrics} store={store} />
    </div>
  );
}
