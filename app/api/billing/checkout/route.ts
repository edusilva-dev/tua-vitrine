import { assertAdminAccess, getAdminContext } from "@/lib/server/context";
import { handle, jsonBody } from "@/lib/server/http";
import { createCheckout } from "@/modules/billing/server/service";

export async function POST(request: Request) {
  return handle(async () => {
    await assertAdminAccess(true);
    const body = await jsonBody(request);
    const plan =
      typeof body === "object" && body !== null && "plan" in body ? body.plan : undefined;

    return Response.json({ data: await createCheckout(await getAdminContext(), plan) });
  });
}
