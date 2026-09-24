import { assertAdminAccess, getAdminContext } from "@/lib/server/context";
import { handle, jsonBody } from "@/lib/server/http";
import { saveWhatsapp } from "@/modules/stores/server/service";

export async function PUT(request: Request) {
  return handle(async () => {
    await assertAdminAccess(true);

    return Response.json({
      data: await saveWhatsapp(await getAdminContext(), await jsonBody(request)),
    });
  });
}
