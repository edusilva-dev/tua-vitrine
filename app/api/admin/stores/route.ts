import { assertLocalAdmin, setAdminContext } from "@/lib/server/context";
import { handle, jsonBody } from "@/lib/server/http";
import { createStore, listLocalStores } from "@/modules/stores/server/service";
export async function GET() {
  return handle(async () => Response.json({ data: await listLocalStores() }));
}
export async function POST(request: Request) {
  return handle(async () => {
    await assertLocalAdmin(true);
    const store = await createStore(await jsonBody(request));

    await setAdminContext(store.id);

    return Response.json({ data: store }, { status: 201 });
  });
}
