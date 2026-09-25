import { z } from "zod";
import { assertAdminAccess, getAdminContext } from "@/lib/server/context";
import { handle, jsonBody } from "@/lib/server/http";
import { listPublicationChoices, selectPublishedProducts } from "@/modules/catalog/server/service";

export async function GET() {
  return handle(async () => {
    await assertAdminAccess();

    return Response.json({ data: await listPublicationChoices(await getAdminContext()) });
  });
}

export async function PUT(request: Request) {
  return handle(async () => {
    await assertAdminAccess(true);
    const { productIds } = z
      .object({ productIds: z.array(z.string().uuid()).max(1000) })
      .parse(await jsonBody(request));

    await selectPublishedProducts(await getAdminContext(), productIds);

    return Response.json({ data: { updated: true } });
  });
}
