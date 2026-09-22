import { assertLocalAdmin, getAdminContext } from "@/lib/server/context";
import { handle, jsonBody } from "@/lib/server/http";
import { listProducts, saveProduct } from "@/modules/catalog/server/service";

export async function GET(request: Request) {
  return handle(async () => {
    const params = new URL(request.url).searchParams;

    return Response.json(
      await listProducts(await getAdminContext(), {
        q: params.get("q") ?? "",
        category: params.get("category") ?? "",
        available: params.get("available") ?? "",
        page: Number(params.get("page") ?? 1),
      })
    );
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    await assertLocalAdmin(true);

    return Response.json(
      {
        data: await saveProduct(
          await getAdminContext(),
          await jsonBody(request),
          undefined,
          request.headers.get("idempotency-key") ?? undefined
        ),
      },
      { status: 201 }
    );
  });
}
