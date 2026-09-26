import { assertAdminAccess, getAdminContext, getAdminIdentity } from "@/lib/server/context";
import { handle, jsonBody } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/session";
import { sendSupportRequest } from "@/modules/support/server/service";

export async function POST(request: Request) {
  return handle(async () => {
    await assertAdminAccess(true);
    const [context, identity] = await Promise.all([getAdminContext(), getAdminIdentity()]);

    rateLimit(`support:${identity.userId ?? context.storeId}`, 3);
    await sendSupportRequest(context, identity.userId, await jsonBody(request));

    return Response.json({ data: { sent: true } });
  });
}
