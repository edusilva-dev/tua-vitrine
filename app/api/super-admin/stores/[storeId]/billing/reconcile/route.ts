import { handle, jsonBody } from "@/lib/server/http";
import { reconcilePlatformStoreBilling } from "@/modules/platform-admin/server/billing";

export async function POST(request: Request, { params }: { params: Promise<{ storeId: string }> }) {
  return handle(async () => {
    const { storeId } = await params;
    const result = await reconcilePlatformStoreBilling(storeId, await jsonBody(request));

    return Response.json({ data: result });
  });
}
