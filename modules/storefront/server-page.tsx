import type { ProductFilters } from "@/modules/catalog/contracts";
import { listCategories, listProducts } from "@/modules/catalog/server/service";
import { getPublicPromotionCampaign } from "@/modules/promotions/server/service";
import type { StoreDTO } from "@/modules/stores/contracts";
import { Storefront } from "./components/storefront";

export async function StorefrontPage({
  store,
  searchParams,
  preview = false,
  showFreeBranding = false,
}: {
  store: StoreDTO;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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

  filters.page = Math.max(1, Number(typeof params.page === "string" ? params.page : "1") || 1);
  const context = { storeId: store.id };
  const promotion = await getPublicPromotionCampaign(context);
  const promotionActive = params.campaign === "1" && Boolean(promotion);
  const [catalog, categories] = await Promise.all([
    listProducts(context, filters, {
      publishedOnly: true,
      ...(promotionActive && promotion ? { productIds: promotion.productIds } : {}),
    }),
    listCategories(context),
  ]);

  return (
    <Storefront
      key={store.id}
      store={store}
      catalog={catalog}
      categories={categories}
      filters={filters}
      preview={preview}
      showFreeBranding={showFreeBranding}
      promotion={promotion}
      promotionActive={promotionActive}
    />
  );
}
