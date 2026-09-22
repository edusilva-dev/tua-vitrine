import { getAdminContext } from "@/lib/server/context";
import { handle } from "@/lib/server/http";
import { listCategories } from "@/modules/catalog/server/service";
export async function GET() {
  return handle(async () => Response.json({ data: await listCategories(await getAdminContext()) }));
}
