import { assertAdminAccess, getAdminContext } from "@/lib/server/context";
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

    return Response.json({
      data: await saveProduct(
        await getAdminContext(),
        await jsonBody(request),
        (await route.params).id
      ),
    });
  });
}

export async function DELETE(_request: Request, route: RouteContext) {
  return handle(async () => {
    await assertAdminAccess(true);
    await archiveProduct(await getAdminContext(), (await route.params).id);

    return new Response(null, { status: 204 });
  });
}
