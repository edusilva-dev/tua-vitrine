import { assertAdminAccess, getAdminContext, getAdminIdentity } from "@/lib/server/context";
import { handle, jsonBody } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/session";
import { createPlatformFeedback } from "@/modules/feedback/server/service";

export async function POST(request: Request) {
  return handle(async () => {
    await assertAdminAccess(true);
    const [context, identity] = await Promise.all([getAdminContext(), getAdminIdentity()]);

    rateLimit(`platform-feedback:${identity.userId ?? context.storeId}`, 5);
    await createPlatformFeedback(context, identity.userId, await jsonBody(request));

    return Response.json({ data: { saved: true } }, { status: 201 });
  });
}
