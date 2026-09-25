import { assertAdminAccess, getAdminContext } from "@/lib/server/context";
import { handle, jsonBody } from "@/lib/server/http";
import { getEntitlements } from "@/modules/billing/server/entitlements";
import { importProducts } from "@/modules/catalog/server/import/service";

export async function POST(request: Request) {
  return handle(async () => {
    await assertAdminAccess(true);
    const context = await getAdminContext();
    const entitlements = await getEntitlements(context);
    const result = await importProducts(
      context,
      await jsonBody(request),
      request.headers.get("idempotency-key") ?? "",
      {
        enabled: entitlements.canImportProducts,
        productLimit: entitlements.productLimit,
      }
    );

    return Response.json({ data: result }, { status: result.alreadyImported ? 200 : 201 });
  });
}
