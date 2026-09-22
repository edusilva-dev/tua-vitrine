import { z } from "zod";
import { AppError, handle, jsonBody } from "@/lib/server/http";
import { anonymousSession, assertSameOrigin, rateLimit } from "@/lib/server/session";
import { likeSchema } from "@/modules/analytics/contracts";
import { setLike } from "@/modules/analytics/server/service";
import { getStoreBySlug } from "@/modules/stores/server/service";
export async function PUT(
  request: Request,
  route: { params: Promise<{ slug: string; id: string }> }
) {
  return handle(async () => {
    await assertSameOrigin();
    const params = await route.params;

    z.string().uuid().parse(params.id);
    const store = await getStoreBySlug(params.slug);

    if (!store) throw new AppError(404, "NOT_FOUND", "Loja não encontrada.");

    const sessionId = await anonymousSession();

    rateLimit(sessionId);
    const { liked } = likeSchema.parse(await jsonBody(request));

    await setLike({ storeId: store.id }, sessionId, params.id, liked);

    return Response.json({ data: { liked } });
  });
}
