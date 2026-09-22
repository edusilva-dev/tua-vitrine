import { assertLocalAdmin, getAdminContext } from "@/lib/server/context";
import { handle, jsonBody } from "@/lib/server/http";
import { getCurrentStore, saveSettings } from "@/modules/stores/server/service";

export async function GET() {
  return handle(async () => Response.json({ data: await getCurrentStore() }));
}

export async function PATCH(request: Request) {
  return handle(async () => {
    await assertLocalAdmin(true);

    return Response.json({
      data: await saveSettings(await getAdminContext(), await jsonBody(request)),
    });
  });
}
