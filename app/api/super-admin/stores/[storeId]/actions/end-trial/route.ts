import { handle, jsonBody } from "@/lib/server/http";
import { endStoreTrial } from "@/modules/platform-admin/server/actions";

export async function POST(request: Request, { params }: { params: Promise<{ storeId: string }> }) {
  return handle(async () => {
    const { storeId } = await params;

    await endStoreTrial(storeId, await jsonBody(request));

    return Response.json({ data: { updated: true } });
  });
}
