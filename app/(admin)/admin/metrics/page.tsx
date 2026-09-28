import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { getAdminContext } from "@/lib/server/context";
import { AppError } from "@/lib/server/http";
import { MetricsOverview } from "@/modules/analytics/components/overview";
import { getMetrics } from "@/modules/analytics/server/service";
import { getCurrentStore } from "@/modules/stores/server/service";

export default async function MetricsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const store = await getCurrentStore();

  if (!store) redirect("/admin/onboarding");

  const context = await getAdminContext();
  let periodError: string | undefined;
  let metrics: Awaited<ReturnType<typeof getMetrics>>;

  try {
    metrics = await getMetrics(context, await searchParams);
  } catch (error) {
    if (
      !(error instanceof ZodError) &&
      !(error instanceof AppError && error.code === "INVALID_PERIOD")
    )
      throw error;

    periodError =
      error instanceof AppError
        ? error.message
        : "O período informado é inválido. Exibimos o período padrão.";
    metrics = await getMetrics(context);
  }

  return <MetricsOverview metrics={metrics} store={store} detailed periodError={periodError} />;
}
