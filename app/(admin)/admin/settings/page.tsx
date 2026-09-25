import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/server/context";
import { BillingPanel } from "@/modules/billing/components/billing-panel";
import { getBillingStatus } from "@/modules/billing/server/service";
import { PromotionSettings } from "@/modules/promotions/components/promotion-settings";
import {
  getPromotionCampaign,
  listPromotionProductChoices,
} from "@/modules/promotions/server/service";
import { StoreSettings } from "@/modules/stores/components/store-settings";
import { getCurrentStore } from "@/modules/stores/server/service";

export default async function SettingsPage() {
  const store = await getCurrentStore();

  if (!store) redirect("/admin/onboarding");

  const context = await getAdminContext();
  const [billing, campaign, promotionProducts] = await Promise.all([
    getBillingStatus(context),
    getPromotionCampaign(context),
    listPromotionProductChoices(context),
  ]);

  return (
    <div className="space-y-8">
      <StoreSettings store={store} entitlements={billing.entitlements} />
      <PromotionSettings
        enabled={billing.entitlements.canUsePromotionCampaign}
        campaign={campaign}
        products={promotionProducts}
      />
      <BillingPanel status={billing} />
    </div>
  );
}
