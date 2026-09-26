import { assertAdminAccess, getAdminContext } from "@/lib/server/context";
import { handle } from "@/lib/server/http";
import { activateInternalTrial } from "@/modules/billing/server/service";

export async function POST() {
  return handle(async () => {
    await assertAdminAccess(true);
    await activateInternalTrial(await getAdminContext());

    return Response.json({ data: { activated: true } });
  });
}
