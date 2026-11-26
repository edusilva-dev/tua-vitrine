import type { BillingPlan } from "@/modules/billing/contracts";
import { type ProductFilters, parseVariantFilters } from "@/modules/catalog/contracts";
import {
  listCategories,
  listProductOptionFilters,
  listProducts,
} from "@/modules/catalog/server/service";
import { AnalyticsIdentity } from "@/modules/observability/components/analytics-identity";
import { getPublicPromotionCampaign } from "@/modules/promotions/server/service";
import type { StoreDTO } from "@/modules/stores/contracts";
import { Storefront } from "./components/storefront";

export async function StorefrontPage({
  store,
  searchParams,
  plan,
  preview = false,
  showFreeBranding = false,
}: {
  store: StoreDTO;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  plan: BillingPlan;
  preview?: boolean;
  showFreeBranding?: boolean;
}) {
  const params = await searchParams;
  const filters: ProductFilters = {};

  if (typeof params.q === "string") filters.q = params.q;

  if (typeof params.category === "string" && params.category !== "all")
    filters.category = params.category;

  if (typeof params.available === "string" && ["true", "false"].includes(params.available))
    filters.available = params.available;

  filters.variants = parseVariantFilters(params.variant);

  filters.page = Math.max(1, Number(typeof params.page === "string" ? params.page : "1") || 1);
  const context = { storeId: store.id };
  const promotion = await getPublicPromotionCampaign(context);
  const promotionActive = params.campaign === "1" && Boolean(promotion);
  const [catalog, categories, optionFilters] = await Promise.all([
    listProducts(context, filters, {
      publishedOnly: true,
      ...(promotionActive && promotion ? { productIds: promotion.productIds } : {}),
    }),
    listCategories(context),
    listProductOptionFilters(context),
  ]);

  return (
    <>
      {!preview ? (
        <AnalyticsIdentity
          store={{
            storeId: store.id,
            plan,
            status: store.status,
            onboardingStep: store.onboardingStep,
          }}
        />
      ) : null}
      <Storefront
        key={store.id}
        store={store}
        catalog={catalog}
        categories={categories}
        optionFilters={optionFilters}
        filters={filters}
        preview={preview}
        showFreeBranding={showFreeBranding}
        promotion={promotion}
        promotionActive={promotionActive}
      />
    </>
  );
}
