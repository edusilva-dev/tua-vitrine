import { handle } from "@/lib/server/http";
import { listPlatformStores } from "@/modules/platform-admin/server/stores";

export async function GET(request: Request) {
  return handle(async () => {
    const search = new URL(request.url).searchParams;
    const result = await listPlatformStores({
      q: search.get("q") ?? undefined,
      status: search.get("status") ?? undefined,
      plan: search.get("plan") ?? undefined,
      subscription: search.get("subscription") ?? undefined,
      page: search.get("page") ?? undefined,
    });

    return Response.json({ data: result });
  });
}
