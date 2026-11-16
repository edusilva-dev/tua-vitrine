import { handle, jsonBody } from "@/lib/server/http";
import { grantManualPlan } from "@/modules/platform-admin/server/actions";

export async function POST(request: Request, { params }: { params: Promise<{ storeId: string }> }) {
  return handle(async () => {
    const { storeId } = await params;

    await grantManualPlan(storeId, await jsonBody(request));

    return Response.json({ data: { updated: true } });
  });
}
