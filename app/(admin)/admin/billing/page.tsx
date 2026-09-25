import { CheckCircle2 } from "lucide-react";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/server/context";
import { BillingPanel } from "@/modules/billing/components/billing-panel";
import { getBillingStatus } from "@/modules/billing/server/service";
import { getCurrentStore } from "@/modules/stores/server/service";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>;
}) {
  const [store, params] = await Promise.all([getCurrentStore(), searchParams]);

  if (!store) redirect("/admin/onboarding");

  const status = await getBillingStatus(await getAdminContext());
  const checkoutCompleted = params.billing === "success";

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">ASSINATURA</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Plano e cobrança</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Consulte seu plano, a próxima renovação e abra o portal seguro para trocar ou cancelar a
          assinatura.
        </p>
      </div>
      {checkoutCompleted ? (
        <div
          role="status"
          className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"
        >
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-medium">Assinatura concluída</p>
            <p className="mt-1 text-emerald-800">
              O Stripe confirmou seu checkout. A atualização do plano pode levar alguns segundos.
            </p>
          </div>
        </div>
      ) : null}
      <BillingPanel status={status} />
    </div>
  );
}
