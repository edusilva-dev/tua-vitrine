import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { StoreContext } from "@/lib/server/context";
import { db } from "@/lib/server/db";
import { AppError } from "@/lib/server/http";
import { getEntitlements } from "@/modules/billing/server/entitlements";
import { type MetricsDTO, metricEventSchema } from "../contracts";

export async function recordEvent(
  context: StoreContext,
  sessionId: string,
  input: unknown
): Promise<void> {
  const event = metricEventSchema.parse(input);

  if (event.type === "PRODUCT_VIEW" && !event.productId)
    throw new AppError(422, "PRODUCT", "Informe o produto visualizado.");

  if (
    event.productId &&
    !(await db.product.findFirst({
      where: { id: event.productId, storeId: context.storeId, archivedAt: null },
    }))
  )
    throw new AppError(404, "NOT_FOUND", "Produto não encontrado.");

  const day = new Date().toISOString().slice(0, 10);
  const dedupeKey =
    event.type === "PRODUCT_VIEW"
      ? `${context.storeId}:${sessionId}:${event.productId}:${day}`
      : `${context.storeId}:${event.eventId}`;

  try {
    await db.metricEvent.create({
      data: {
        storeId: context.storeId,
        sessionId,
        type: event.type,
        productId: event.type === "PRODUCT_VIEW" ? (event.productId ?? null) : null,
        eventId: event.eventId,
        dedupeKey,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return;

    throw error;
  }
}

export async function setLike(
  context: StoreContext,
  sessionId: string,
  productId: string,
  liked: boolean
): Promise<void> {
  if (
    !(await db.product.findFirst({
      where: { id: productId, storeId: context.storeId, archivedAt: null },
    }))
  )
    throw new AppError(404, "NOT_FOUND", "Produto não encontrado.");

  const key = { storeId: context.storeId, productId, sessionId };

  if (!liked) {
    await db.productLike.deleteMany({ where: key });

    return;
  }

  await db.productLike.upsert({
    where: { storeId_productId_sessionId: key },
    create: key,
    update: {},
  });
}

export async function getMetrics(context: StoreContext): Promise<MetricsDTO> {
  const storeId = context.storeId;
  const entitlements = await getEntitlements(context);
  const since = entitlements.metricsHistoryDays
    ? new Date(Date.now() - entitlements.metricsHistoryDays * 24 * 60 * 60 * 1000)
    : null;
  const eventPeriod = since ? { occurredAt: { gte: since } } : {};
  const likePeriod = since ? { createdAt: { gte: since } } : {};
  const [impressions, totalLikes, productViews, productCount, viewed, liked] = await Promise.all([
    db.metricEvent.count({ where: { storeId, type: "STORE_VIEW", ...eventPeriod } }),
    db.productLike.count({ where: { storeId, product: { archivedAt: null }, ...likePeriod } }),
    db.metricEvent.count({ where: { storeId, type: "PRODUCT_VIEW", ...eventPeriod } }),
    db.product.count({ where: { storeId, archivedAt: null } }),
    db.metricEvent.groupBy({
      by: ["productId"],
      where: {
        storeId,
        type: "PRODUCT_VIEW",
        productId: { not: null },
        product: { archivedAt: null },
        ...eventPeriod,
      },
      _count: { _all: true },
      orderBy: { _count: { productId: "desc" } },
      take: 5,
    }),
    db.productLike.groupBy({
      by: ["productId"],
      where: { storeId, product: { archivedAt: null }, ...likePeriod },
      _count: { _all: true },
      orderBy: { _count: { productId: "desc" } },
      take: 5,
    }),
  ]);
  const ids = [
    ...viewed.map((item) => item.productId),
    ...liked.map((item) => item.productId),
  ].filter((id): id is string => id !== null);
  const products = await db.product.findMany({
    where: { storeId, id: { in: ids } },
    select: { id: true, name: true },
  });
  const names = new Map(products.map((item) => [item.id, item.name]));

  return {
    impressions,
    totalLikes,
    productViews,
    productCount,
    mostViewed: viewed.flatMap((item) =>
      item.productId
        ? [
            {
              id: item.productId,
              name: names.get(item.productId) ?? "Produto",
              count: item._count._all,
            },
          ]
        : []
    ),
    mostLiked: liked.map((item) => ({
      id: item.productId,
      name: names.get(item.productId) ?? "Produto",
      count: item._count._all,
    })),
  };
}
