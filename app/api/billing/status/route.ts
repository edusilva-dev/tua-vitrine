import { assertAdminAccess, getAdminContext } from "@/lib/server/context";
import { handle } from "@/lib/server/http";
import { getBillingStatus } from "@/modules/billing/server/service";

export async function GET() {
  return handle(async () => {
    await assertAdminAccess();

    return Response.json({ data: await getBillingStatus(await getAdminContext()) });
  });
}
