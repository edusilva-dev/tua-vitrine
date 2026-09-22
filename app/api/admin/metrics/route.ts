import { getAdminContext } from "@/lib/server/context";
import { handle } from "@/lib/server/http";
import { getMetrics } from "@/modules/analytics/server/service";
export async function GET() {
  return handle(async () => Response.json({ data: await getMetrics(await getAdminContext()) }));
}
