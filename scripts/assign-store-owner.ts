import { db } from "@/lib/server/db";

const [slug, email, mode] = process.argv.slice(2);

try {
  if (!slug || !email || (mode && mode !== "--apply")) {
    throw new Error(
      "Use: bun run store:assign-owner SLUG EMAIL [--apply]. Sem --apply apenas confere."
    );
  }

  await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    const store = await tx.store.findUnique({ where: { slug } });

    if (!user?.emailVerified || !store)
      throw new Error("Informe uma loja existente e uma conta com e-mail confirmado.");

    await tx.$queryRaw`SELECT id FROM "Store" WHERE id = ${store.id}::uuid FOR UPDATE`;
    const members = await tx.storeMember.findMany({ where: { storeId: store.id } });

    if (members.some((member) => member.userId !== user.id)) {
      throw new Error("A loja já tem proprietário. Este comando não transfere propriedade.");
    }

    if (mode === "--apply" && members.length === 0) {
      await tx.storeMember.create({ data: { storeId: store.id, userId: user.id } });
    }

    process.stdout.write(
      `${JSON.stringify({
        dryRun: mode !== "--apply",
        storeId: store.id,
        userId: user.id,
        alreadyAssigned: members.length > 0,
      })}\n`
    );
  });
} finally {
  await db.$disconnect();
}
