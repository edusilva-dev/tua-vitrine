import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/server/context";
import { getEntitlements } from "@/modules/billing/server/entitlements";
import { PromotionSettings } from "@/modules/promotions/components/promotion-settings";
import {
  getPromotionCampaign,
  listPromotionProductChoices,
} from "@/modules/promotions/server/service";
import { getCurrentStore } from "@/modules/stores/server/service";

export default async function PromotionsPage() {
  if (!(await getCurrentStore())) redirect("/admin/onboarding");

  const context = await getAdminContext();
  const [entitlements, campaign, products] = await Promise.all([
    getEntitlements(context),
    getPromotionCampaign(context),
    listPromotionProductChoices(context),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">CAMPANHAS</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">
          Campanha promocional
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Crie um destaque na sua vitrine e direcione seus clientes para uma seleção de produtos.
        </p>
      </header>

      <PromotionSettings
        enabled={entitlements.canUsePromotionCampaign}
        campaign={campaign}
        products={products}
      />
    </div>
  );
}
