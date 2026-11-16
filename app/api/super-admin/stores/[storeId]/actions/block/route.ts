import { handle, jsonBody } from "@/lib/server/http";
import { setStoreBlocked } from "@/modules/platform-admin/server/actions";

export async function POST(request: Request, { params }: { params: Promise<{ storeId: string }> }) {
  return handle(async () => {
    const { storeId } = await params;

    await setStoreBlocked(storeId, true, await jsonBody(request));

    return Response.json({ data: { updated: true } });
  });
}
