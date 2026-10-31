import { assertAdminAccess, getAdminContext, getAdminIdentity } from "@/lib/server/context";
import { handle, jsonBody } from "@/lib/server/http";
import { archiveProduct, getProduct, saveProduct } from "@/modules/catalog/server/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, route: RouteContext) {
  return handle(async () =>
    Response.json({ data: await getProduct(await getAdminContext(), (await route.params).id) })
  );
}

export async function PATCH(request: Request, route: RouteContext) {
  return handle(async () => {
    await assertAdminAccess(true);
    const { userId } = await getAdminIdentity();

    return Response.json({
      data: await saveProduct(
        await getAdminContext(),
        await jsonBody(request),
        (await route.params).id,
        undefined,
        userId ?? undefined
      ),
    });
  });
}

export async function DELETE(_request: Request, route: RouteContext) {
  return handle(async () => {
    await assertAdminAccess(true);
    const { userId } = await getAdminIdentity();

    await archiveProduct(await getAdminContext(), (await route.params).id, userId ?? undefined);

    return Response.json({ data: { archived: true } });
  });
}
