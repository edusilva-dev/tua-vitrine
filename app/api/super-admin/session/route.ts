import { handle } from "@/lib/server/http";
import { requirePlatformAdmin } from "@/modules/platform-admin/server/access";

export async function GET() {
  return handle(async () => {
    const identity = await requirePlatformAdmin();

    return Response.json({
      data: { userId: identity.userId, name: identity.name, email: identity.email },
    });
  });
}
