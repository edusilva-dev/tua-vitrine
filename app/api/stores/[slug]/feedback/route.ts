import { AppError, handle, jsonBody } from "@/lib/server/http";
import { anonymousSession, assertSameOrigin, rateLimit } from "@/lib/server/session";
import { createStorefrontFeedback } from "@/modules/feedback/server/service";
import { getStoreBySlug } from "@/modules/stores/server/service";

export async function POST(request: Request, route: { params: Promise<{ slug: string }> }) {
  return handle(async () => {
    await assertSameOrigin();
    const store = await getStoreBySlug((await route.params).slug);

    if (store?.status !== "ACTIVE") throw new AppError(404, "NOT_FOUND", "Loja não encontrada.");

    const sessionId = await anonymousSession();

    rateLimit(`storefront-feedback:${sessionId}`, 3);
    await createStorefrontFeedback({ storeId: store.id }, sessionId, await jsonBody(request));

    return Response.json({ data: { saved: true } }, { status: 201 });
  });
}
