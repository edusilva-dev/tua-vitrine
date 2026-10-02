import "server-only";

import type { StoreContext } from "@/lib/server/context";
import { db } from "@/lib/server/db";
import { getEnv } from "@/lib/server/env";
import { AppError } from "@/lib/server/http";
import { logger } from "@/lib/server/logger";
import { sendSupportEmail } from "@/lib/server/mail";
import {
  type PlatformFeedbackInput,
  platformFeedbackKindLabels,
  platformFeedbackSchema,
  type StorefrontFeedbackInput,
  type StorefrontFeedbackSummaryDTO,
  storefrontFeedbackSchema,
} from "../contracts";

export async function createPlatformFeedback(
  context: StoreContext,
  userId: string | null,
  input: unknown
): Promise<void> {
  const values = platformFeedbackSchema.parse(input);
  const [store, user] = await Promise.all([
    db.store.findUnique({
      where: { id: context.storeId },
      select: { id: true, name: true, slug: true },
    }),
    userId
      ? db.user.findUnique({ where: { id: userId }, select: { name: true, email: true } })
      : null,
  ]);

  if (!store) throw new AppError(404, "NOT_FOUND", "Loja não encontrada.");

  await db.feedback.create({
    data: {
      storeId: context.storeId,
      userId,
      source: "PLATFORM",
      kind: values.kind,
      rating: values.rating,
      message: values.message ?? null,
      context: values.context,
    },
  });

  const supportEmail = getEnv().SUPPORT_EMAIL;

  if (!supportEmail) return;

  try {
    await sendSupportEmail({
      to: supportEmail,
      ...(user?.email ? { replyTo: user.email } : {}),
      subject: `[Feedback · ${values.rating}/5] ${platformFeedbackKindLabels[values.kind]}`,
      text: platformFeedbackMessage(values, {
        store,
        account: user ?? { name: "Ambiente local", email: "não disponível" },
      }),
    });
  } catch (error) {
    logger.error({ err: error }, "Feedback salvo, mas o aviso por e-mail falhou.");
  }
}

export async function createStorefrontFeedback(
  context: StoreContext,
  sessionId: string,
  input: unknown
): Promise<void> {
  const values = storefrontFeedbackSchema.parse(input);

  await db.feedback.create({
    data: {
      storeId: context.storeId,
      sessionId,
      source: "STOREFRONT",
      kind: values.kind,
      rating: values.rating,
      message: values.message ?? null,
      context: values.context,
    },
  });
}

export async function getStorefrontFeedbackSummary(
  context: StoreContext
): Promise<StorefrontFeedbackSummaryDTO> {
  const where = { storeId: context.storeId, source: "STOREFRONT" as const };
  const [aggregate, grouped, recent] = await Promise.all([
    db.feedback.aggregate({ where, _count: { _all: true }, _avg: { rating: true } }),
    db.feedback.groupBy({ by: ["kind"], where, _count: { _all: true } }),
    db.feedback.findMany({
      where: { ...where, message: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        kind: true,
        rating: true,
        message: true,
        context: true,
        createdAt: true,
      },
    }),
  ]);
  const counts = new Map(grouped.map((item) => [item.kind, item._count._all]));

  return {
    total: aggregate._count._all,
    averageRating: aggregate._avg.rating,
    found: counts.get("FOUND") ?? 0,
    notFound: counts.get("NOT_FOUND") ?? 0,
    problems: counts.get("PROBLEM") ?? 0,
    recent: recent.flatMap((item) => {
      if (
        !item.message ||
        !["FOUND", "NOT_FOUND", "PROBLEM"].includes(item.kind) ||
        !["GENERAL", "SEARCH_EMPTY"].includes(item.context)
      )
        return [];

      return [
        {
          id: item.id,
          kind: item.kind as StorefrontFeedbackInput["kind"],
          rating: item.rating,
          message: item.message,
          context: item.context as StorefrontFeedbackInput["context"],
          createdAt: item.createdAt.toISOString(),
        },
      ];
    }),
  };
}

function platformFeedbackMessage(
  feedback: PlatformFeedbackInput,
  context: {
    store: { id: string; name: string; slug: string };
    account: { name: string; email: string };
  }
): string {
  return [
    "Novo feedback sobre a plataforma Tua Vitrine",
    "",
    `Tipo: ${platformFeedbackKindLabels[feedback.kind]}`,
    `Nota: ${feedback.rating}/5`,
    `Contexto: ${feedback.context}`,
    `Loja: ${context.store.name} (/${context.store.slug})`,
    `ID da loja: ${context.store.id}`,
    `Lojista: ${context.account.name}`,
    `E-mail: ${context.account.email}`,
    "",
    "Comentário:",
    feedback.message ?? "Sem comentário.",
  ].join("\n");
}
