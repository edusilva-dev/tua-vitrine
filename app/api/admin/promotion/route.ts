import { assertAdminAccess, getAdminContext } from "@/lib/server/context";
import { handle, jsonBody } from "@/lib/server/http";
import { getPromotionCampaign, savePromotionCampaign } from "@/modules/promotions/server/service";

export async function GET() {
  return handle(async () => {
    await assertAdminAccess();

    return Response.json({ data: await getPromotionCampaign(await getAdminContext()) });
  });
}

export async function PUT(request: Request) {
  return handle(async () => {
    await assertAdminAccess(true);

    return Response.json({
      data: await savePromotionCampaign(await getAdminContext(), await jsonBody(request)),
    });
  });
}
