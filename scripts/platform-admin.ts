import { z } from "zod";
import { db } from "@/lib/server/db";

const inputSchema = z.tuple([z.enum(["grant", "revoke"]), z.string().trim().toLowerCase().email()]);

async function main() {
  const parsed = inputSchema.safeParse(process.argv.slice(2));

  if (!parsed.success) {
    throw new Error("Uso: bun run platform-admin <grant|revoke> <email>");
  }

  const [action, email] = parsed.data;
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, emailVerified: true },
  });

  if (!user) throw new Error("Usuário não encontrado.");

  if (!user.emailVerified) throw new Error("O usuário precisa ter o e-mail verificado.");

  if (action === "grant") {
    await db.platformAdmin.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: { revokedAt: null, grantedAt: new Date() },
    });

    process.stdout.write("Acesso de plataforma concedido.\n");

    return;
  }

  const result = await db.platformAdmin.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  if (result.count === 0) throw new Error("O usuário não possui acesso ativo.");

  process.stdout.write("Acesso de plataforma revogado.\n");
}

try {
  await main();
} finally {
  await db.$disconnect();
}
