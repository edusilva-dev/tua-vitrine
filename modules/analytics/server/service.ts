import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { StoreContext } from "@/lib/server/context";
import { db } from "@/lib/server/db";
import { AppError } from "@/lib/server/http";
import type { Entitlements } from "@/modules/billing/contracts";
import { getEntitlements } from "@/modules/billing/server/entitlements";
import {
  type MetricsDTO,
  type MetricsQuery,
  metricEventSchema,
  metricsQuerySchema,
} from "../contracts";

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const DAILY_TIMELINE_LIMIT = 62;

type MetricsPeriod = {
  from: Date;
  until: Date;
  fromKey: string;
  toKey: string;
  availableFromKey: string | null;
  availableToKey: string;
  interval: "DAY" | "MONTH";
};

type TimelineRow = {
  key: string;
  impressions: number;
  productViews: number;
};

function dateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function resolveMetricsPeriod(
  entitlements: Pick<Entitlements, "metricsHistoryDays">,
  query: MetricsQuery,
  now = new Date()
): MetricsPeriod {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const earliest = entitlements.metricsHistoryDays
    ? new Date(today.getTime() - (entitlements.metricsHistoryDays - 1) * DAY_IN_MILLISECONDS)
    : null;
  const defaultFrom =
    earliest ?? new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const requestedFrom = query.from ? parseDate(query.from) : defaultFrom;
  const from = earliest && requestedFrom < earliest ? earliest : requestedFrom;
  const to = query.to ? parseDate(query.to) : today;

  if (from > to)
    throw new AppError(422, "INVALID_PERIOD", "A data inicial deve ser anterior à final.");

  if (to > today)
    throw new AppError(422, "INVALID_PERIOD", "O período não pode terminar no futuro.");

  const until = new Date(to.getTime() + DAY_IN_MILLISECONDS);
  const days = Math.floor((to.getTime() - from.getTime()) / DAY_IN_MILLISECONDS) + 1;

  return {
    from,
    until,
    fromKey: dateKey(from),
    toKey: dateKey(to),
    availableFromKey: earliest ? dateKey(earliest) : null,
    availableToKey: dateKey(today),
    interval: days <= DAILY_TIMELINE_LIMIT ? "DAY" : "MONTH",
  };
}

function fillTimeline(period: MetricsPeriod, rows: TimelineRow[]): MetricsDTO["timeline"] {
  const values = new Map(rows.map((row) => [row.key, row]));
  const timeline: MetricsDTO["timeline"] = [];
  const cursor = new Date(period.from);
  const last = new Date(period.until.getTime() - DAY_IN_MILLISECONDS);

  if (period.interval === "MONTH") cursor.setUTCDate(1);

  while (cursor <= last) {
    const key = period.interval === "DAY" ? dateKey(cursor) : cursor.toISOString().slice(0, 7);
    const value = values.get(key);
    const label = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "UTC",
      ...(period.interval === "DAY"
        ? { day: "2-digit", month: "2-digit" }
        : { month: "short", year: "2-digit" }),
    }).format(cursor);

    timeline.push({
      key,
      label,
      impressions: value?.impressions ?? 0,
      productViews: value?.productViews ?? 0,
    });

    if (period.interval === "DAY") cursor.setUTCDate(cursor.getUTCDate() + 1);
    else cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return timeline;
}

async function getTimeline(storeId: string, period: MetricsPeriod): Promise<TimelineRow[]> {
  if (period.interval === "DAY") {
    return db.$queryRaw<TimelineRow[]>(Prisma.sql`
      SELECT
        to_char(date_trunc('day', "occurredAt"), 'YYYY-MM-DD') AS key,
        count(*) FILTER (WHERE type = 'STORE_VIEW')::int AS impressions,
        count(*) FILTER (WHERE type = 'PRODUCT_VIEW')::int AS "productViews"
      FROM "MetricEvent"
      WHERE "storeId" = ${storeId}::uuid
        AND "occurredAt" >= ${period.from}
        AND "occurredAt" < ${period.until}
      GROUP BY 1
      ORDER BY 1
    `);
  }

  return db.$queryRaw<TimelineRow[]>(Prisma.sql`
    SELECT
      to_char(date_trunc('month', "occurredAt"), 'YYYY-MM') AS key,
      count(*) FILTER (WHERE type = 'STORE_VIEW')::int AS impressions,
      count(*) FILTER (WHERE type = 'PRODUCT_VIEW')::int AS "productViews"
    FROM "MetricEvent"
    WHERE "storeId" = ${storeId}::uuid
      AND "occurredAt" >= ${period.from}
      AND "occurredAt" < ${period.until}
    GROUP BY 1
    ORDER BY 1
  `);
}

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

export async function getMetrics(context: StoreContext, input: unknown = {}): Promise<MetricsDTO> {
  const storeId = context.storeId;
  const entitlements = await getEntitlements(context);
  const query = metricsQuerySchema.parse(input);
  const period = resolveMetricsPeriod(entitlements, query);
  const eventPeriod = { occurredAt: { gte: period.from, lt: period.until } };
  const likePeriod = { createdAt: { gte: period.from, lt: period.until } };
  const [impressions, totalLikes, productViews, productCount, viewed, liked, timelineRows] =
    await Promise.all([
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
      getTimeline(storeId, period),
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
    period: {
      from: period.fromKey,
      to: period.toKey,
      availableFrom: period.availableFromKey,
      availableTo: period.availableToKey,
      interval: period.interval,
      metricsHistoryDays: entitlements.metricsHistoryDays,
    },
    timeline: fillTimeline(period, timelineRows),
  };
}
