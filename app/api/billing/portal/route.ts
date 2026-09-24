import { assertAdminAccess, getAdminContext } from "@/lib/server/context";
import { handle } from "@/lib/server/http";
import { createPortal } from "@/modules/billing/server/service";

export async function POST() {
  return handle(async () => {
    await assertAdminAccess(true);

    return Response.json({ data: await createPortal(await getAdminContext()) });
  });
}
