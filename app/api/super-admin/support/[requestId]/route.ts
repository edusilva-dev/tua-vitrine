import { handle, jsonBody } from "@/lib/server/http";
import { updateSupportRequest } from "@/modules/platform-admin/server/support";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  return handle(async () => {
    const { requestId } = await params;

    await updateSupportRequest(requestId, await jsonBody(request));

    return Response.json({ data: { updated: true } });
  });
}
