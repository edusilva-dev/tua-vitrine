import { assertAdminAccess, getAdminContext } from "@/lib/server/context";
import { handle, jsonBody } from "@/lib/server/http";
import { listCategories, reorderCategories } from "@/modules/catalog/server/service";

export async function GET() {
  return handle(async () => Response.json({ data: await listCategories(await getAdminContext()) }));
}

export async function PUT(request: Request) {
  return handle(async () => {
    await assertAdminAccess(true);
    await reorderCategories(await getAdminContext(), await jsonBody(request));

    return Response.json({ data: { updated: true } });
  });
}
