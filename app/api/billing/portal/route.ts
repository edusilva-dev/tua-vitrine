import { assertAdminAccess, getAdminContext } from "@/lib/server/context";
import { handle, jsonBody } from "@/lib/server/http";
import { createPortal } from "@/modules/billing/server/service";

export async function POST(request: Request) {
  return handle(async () => {
    await assertAdminAccess(true);
    const body = request.body ? await jsonBody(request) : {};
    const plan =
      typeof body === "object" && body !== null && "plan" in body ? body.plan : undefined;

    return Response.json({ data: await createPortal(await getAdminContext(), plan) });
  });
}
