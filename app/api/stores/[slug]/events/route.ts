import { AppError, handle, jsonBody } from "@/lib/server/http";
import { anonymousSession, assertSameOrigin, rateLimit } from "@/lib/server/session";
import { recordEvent } from "@/modules/analytics/server/service";
import { getStoreBySlug } from "@/modules/stores/server/service";
export async function POST(request: Request, route: { params: Promise<{ slug: string }> }) {
  return handle(async () => {
    await assertSameOrigin();
    const store = await getStoreBySlug((await route.params).slug);

    if (!store) throw new AppError(404, "NOT_FOUND", "Loja não encontrada.");

    const sessionId = await anonymousSession();

    rateLimit(sessionId);
    await recordEvent({ storeId: store.id }, sessionId, await jsonBody(request));

    return new Response(null, { status: 204 });
  });
}
