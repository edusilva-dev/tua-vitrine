import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/server/context";
import { ProductManager } from "@/modules/catalog/components/product-manager";
import { listCategories, listProducts } from "@/modules/catalog/server/service";
import { getCurrentStore } from "@/modules/stores/server/service";
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  if (!(await getCurrentStore())) redirect("/admin/onboarding");

  const params = await searchParams;
  const context = await getAdminContext();
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const [products, categories] = await Promise.all([
    listProducts(context, {
      ...(params.q ? { q: params.q } : {}),
      ...(params.category ? { category: params.category } : {}),
      page,
    }),
    listCategories(context),
  ]);

  return (
    <ProductManager
      products={products}
      categories={categories}
      initialQuery={params.q ?? ""}
      initialCategory={params.category ?? ""}
    />
  );
}
