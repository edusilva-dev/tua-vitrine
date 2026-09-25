import { AppError, handle } from "@/lib/server/http";
import { listProducts, listProductsByIds } from "@/modules/catalog/server/service";
import { getStoreBySlug } from "@/modules/stores/server/service";

export async function GET(request: Request, route: { params: Promise<{ slug: string }> }) {
  return handle(async () => {
    const store = await getStoreBySlug((await route.params).slug);

    if (!store) throw new AppError(404, "NOT_FOUND", "Loja não encontrada.");

    const params = new URL(request.url).searchParams;
    const context = { storeId: store.id };

    if (params.has("ids"))
      return Response.json({
        data: await listProductsByIds(
          context,
          (params.get("ids") ?? "").split(",").filter(Boolean),
          { publishedOnly: true }
        ),
      });

    return Response.json(
      await listProducts(
        context,
        {
          q: params.get("q") ?? "",
          category: params.get("category") ?? "",
          available: params.get("available") ?? "",
          page: Number(params.get("page") ?? 1),
        },
        { publishedOnly: true }
      )
    );
  });
}
