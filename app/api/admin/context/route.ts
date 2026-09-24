import { z } from "zod";
import { assertAdminAccess, setAdminContext } from "@/lib/server/context";
import { handle, jsonBody } from "@/lib/server/http";

export async function PUT(request: Request) {
  return handle(async () => {
    await assertAdminAccess(true);
    const { storeId } = z.object({ storeId: z.string().uuid() }).parse(await jsonBody(request));

    await setAdminContext(storeId);

    return Response.json({ data: { storeId } });
  });
}
