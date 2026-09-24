import {
  assertAdminAccess,
  getAdminContext,
  getAdminIdentity,
  setAdminContext,
} from "@/lib/server/context";
import { AppError, handle, jsonBody } from "@/lib/server/http";
import { saveIdentity } from "@/modules/stores/server/service";

export async function PUT(request: Request) {
  return handle(async () => {
    await assertAdminAccess(true);
    const { userId } = await getAdminIdentity();
    let context = null;

    try {
      context = await getAdminContext();
    } catch (error) {
      if (!(error instanceof AppError && error.code === "NO_STORE")) throw error;
    }

    const store = await saveIdentity(context, await jsonBody(request), userId ?? undefined);

    await setAdminContext(store.id);

    return Response.json({ data: store });
  });
}
