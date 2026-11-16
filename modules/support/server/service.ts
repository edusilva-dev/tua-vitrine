import "server-only";
import type { StoreContext } from "@/lib/server/context";
import { db } from "@/lib/server/db";
import { getEnv } from "@/lib/server/env";
import { AppError } from "@/lib/server/http";
import { logger } from "@/lib/server/logger";
import { sendSupportEmail } from "@/lib/server/mail";
import { type SupportRequest, supportCategoryLabels, supportRequestSchema } from "../contracts";

export async function sendSupportRequest(
  context: StoreContext,
  userId: string | null,
  input: unknown,
  dependencies: {
    sendEmail?: typeof sendSupportEmail;
    supportEmail?: string | null;
  } = {}
): Promise<{ id: string; notificationSent: boolean }> {
  const values = supportRequestSchema.parse(input);
  const env = getEnv();
  const [store, user] = await Promise.all([
    db.store.findUnique({
      where: { id: context.storeId },
      select: { id: true, name: true, slug: true },
    }),
    userId
      ? db.user.findUnique({
          where: { id: userId },
          select: { id: true, name: true, email: true },
        })
      : null,
  ]);

  if (!store) throw new AppError(404, "NOT_FOUND", "Loja não encontrada.");

  const account = user ?? {
    id: null,
    name: "Ambiente local",
    email: "não-disponivel@usetuavitrine.com.br",
  };
  const request = await db.supportRequest.create({
    data: {
      storeId: store.id,
      requesterId: account.id,
      requesterName: account.name,
      replyEmail: account.email,
      category: values.category,
      subject: values.subject,
      message: values.message,
    },
    select: { id: true },
  });

  try {
    const supportEmail =
      dependencies.supportEmail === undefined ? env.SUPPORT_EMAIL : dependencies.supportEmail;

    if (!supportEmail) throw new Error("SUPPORT_EMAIL não configurado.");

    await (dependencies.sendEmail ?? sendSupportEmail)({
      to: supportEmail,
      ...(user?.email ? { replyTo: user.email } : {}),
      subject: `[${supportCategoryLabels[values.category]}] ${values.subject}`,
      text: supportMessage(values, { store, account }),
    });

    await db.supportRequest.update({
      where: { id: request.id },
      data: { notificationStatus: "SENT", notificationAttemptedAt: new Date() },
    });

    return { id: request.id, notificationSent: true };
  } catch (error) {
    logger.error(
      { supportRequestId: request.id, errorName: error instanceof Error ? error.name : "Unknown" },
      "Falha ao notificar nova solicitação de suporte"
    );

    await db.supportRequest.update({
      where: { id: request.id },
      data: {
        notificationStatus: "FAILED",
        notificationAttemptedAt: new Date(),
        notificationErrorCode: "EMAIL_DELIVERY_FAILED",
      },
    });

    return { id: request.id, notificationSent: false };
  }
}

function supportMessage(
  request: SupportRequest,
  context: {
    store: { id: string; name: string; slug: string };
    account: { name: string; email: string };
  }
): string {
  return [
    "Nova solicitação de suporte pelo painel da Tua Vitrine",
    "",
    `Categoria: ${supportCategoryLabels[request.category]}`,
    `Assunto: ${request.subject}`,
    `Loja: ${context.store.name} (/${context.store.slug})`,
    `ID da loja: ${context.store.id}`,
    `Lojista: ${context.account.name}`,
    `E-mail da conta: ${context.account.email}`,
    "",
    "Mensagem:",
    request.message,
  ].join("\n");
}
