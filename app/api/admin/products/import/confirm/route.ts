import { assertAdminAccess, getAdminContext, getAdminIdentity } from "@/lib/server/context";
import { handle, jsonBody } from "@/lib/server/http";
import { getEntitlements } from "@/modules/billing/server/entitlements";
import { importProducts } from "@/modules/catalog/server/import/service";

export async function POST(request: Request) {
  return handle(async () => {
    await assertAdminAccess(true);
    const { userId } = await getAdminIdentity();
    const context = await getAdminContext();
    const entitlements = await getEntitlements(context);
    const result = await importProducts(
      context,
      await jsonBody(request),
      request.headers.get("idempotency-key") ?? "",
      {
        enabled: entitlements.canImportProducts,
        productLimit: entitlements.productLimit,
      },
      userId ?? undefined
    );

    return Response.json({ data: result }, { status: result.alreadyImported ? 200 : 201 });
  });
}
