import { getAdminContext } from "@/lib/server/context";
import { handle } from "@/lib/server/http";
import { getMetrics } from "@/modules/analytics/server/service";

export async function GET(request: Request) {
  return handle(async () => {
    const searchParams = Object.fromEntries(new URL(request.url).searchParams);

    return Response.json({ data: await getMetrics(await getAdminContext(), searchParams) });
  });
}
