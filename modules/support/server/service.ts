import "server-only";
import type { StoreContext } from "@/lib/server/context";
import { db } from "@/lib/server/db";
import { getEnv } from "@/lib/server/env";
import { AppError } from "@/lib/server/http";
import { sendSupportEmail } from "@/lib/server/mail";
import { type SupportRequest, supportCategoryLabels, supportRequestSchema } from "../contracts";

export async function sendSupportRequest(
  context: StoreContext,
  userId: string | null,
  input: unknown
): Promise<void> {
  const values = supportRequestSchema.parse(input);
  const env = getEnv();

  if (!env.SUPPORT_EMAIL || env.MAIL_TRANSPORT === "disabled")
    throw new AppError(
      503,
      "SUPPORT_UNAVAILABLE",
      "O canal de suporte ainda não está disponível. Tente novamente mais tarde."
    );

  const [store, user] = await Promise.all([
    db.store.findUnique({
      where: { id: context.storeId },
      select: { id: true, name: true, slug: true },
    }),
    userId
      ? db.user.findUnique({
          where: { id: userId },
          select: { name: true, email: true },
        })
      : null,
  ]);

  if (!store) throw new AppError(404, "NOT_FOUND", "Loja não encontrada.");

  await sendSupportEmail({
    to: env.SUPPORT_EMAIL,
    ...(user?.email ? { replyTo: user.email } : {}),
    subject: `[${supportCategoryLabels[values.category]}] ${values.subject}`,
    text: supportMessage(values, {
      store,
      account: user ?? { name: "Ambiente local", email: "não disponível" },
    }),
  });
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
