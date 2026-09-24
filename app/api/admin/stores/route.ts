import { assertAdminAccess, getAdminIdentity, setAdminContext } from "@/lib/server/context";
import { handle, jsonBody } from "@/lib/server/http";
import { createStore, listAccessibleStores } from "@/modules/stores/server/service";

export async function GET() {
  return handle(async () => Response.json({ data: await listAccessibleStores() }));
}

export async function POST(request: Request) {
  return handle(async () => {
    await assertAdminAccess(true);
    const { userId } = await getAdminIdentity();
    const store = await createStore(await jsonBody(request), userId ?? undefined);

    await setAdminContext(store.id);

    return Response.json({ data: store }, { status: 201 });
  });
}
