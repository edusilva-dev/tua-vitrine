import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import type { StoreContext } from "@/lib/server/context";
import { db } from "@/lib/server/db";
import { AppError } from "@/lib/server/http";
import { normalizeSlug } from "@/modules/stores/contracts";
import { type ProductImportResultDTO, productImportConfirmSchema } from "../../contracts/import";

type ImportAllowance = {
  enabled: boolean;
  productLimit: number;
};

function categorySlug(name: string): string {
  return (
    (normalizeSlug(name) || "categoria") +
    "-" +
    createHash("sha256").update(name).digest("hex").slice(0, 8)
  );
}

export async function importProducts(
  context: StoreContext,
  input: unknown,
  idempotencyKey: string,
  allowance: ImportAllowance
): Promise<ProductImportResultDTO> {
  if (!allowance.enabled)
    throw new AppError(
      403,
      "PLAN_REQUIRED",
      "A importação por planilha está disponível nos planos Essencial e Profissional."
    );

  const { rows } = productImportConfirmSchema.parse(input);

  if (!idempotencyKey)
    throw new AppError(400, "IDEMPOTENCY_REQUIRED", "Envie uma chave de idempotência.");

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      idempotencyKey
    )
  )
    throw new AppError(400, "IDEMPOTENCY_INVALID", "A chave de idempotência é inválida.");

  const normalizedRows = rows.map(({ row: _row, ...product }) => product);
  const requestHash = createHash("sha256").update(JSON.stringify(normalizedRows)).digest("hex");
  const existing = await db.idempotency.findUnique({
    where: { storeId_key: { storeId: context.storeId, key: idempotencyKey } },
  });

  if (existing) {
    if (existing.requestHash !== requestHash)
      throw new AppError(409, "IDEMPOTENCY", "A chave já foi usada em outra importação.");

    return { importedCount: rows.length, alreadyImported: true };
  }

  try {
    return await db.$transaction(
      async (tx) => {
        const store = await tx.store.findUnique({
          where: { id: context.storeId },
          select: { id: true, whatsapp: true },
        });

        if (!store) throw new AppError(404, "NOT_FOUND", "Loja não encontrada.");

        if (!store.whatsapp)
          throw new AppError(422, "ONBOARDING", "Cadastre o WhatsApp antes de importar produtos.");

        const currentProducts = await tx.product.count({
          where: { storeId: context.storeId, archivedAt: null },
        });
        const remainingProducts = Math.max(0, allowance.productLimit - currentProducts);

        if (rows.length > remainingProducts)
          throw new AppError(
            422,
            "PRODUCT_LIMIT",
            `Seu plano permite importar mais ${remainingProducts} produto(s).`
          );

        const categoryNames = [...new Set(rows.map((row) => row.categoryName).filter(Boolean))];

        await tx.category.createMany({
          data: categoryNames.map((name) => ({
            id: randomUUID(),
            storeId: context.storeId,
            name,
            slug: categorySlug(name),
          })),
          skipDuplicates: true,
        });

        const categories = await tx.category.findMany({
          where: { storeId: context.storeId, name: { in: categoryNames } },
          select: { id: true, name: true },
        });
        const categoryIds = new Map(categories.map((category) => [category.name, category.id]));
        const products = rows.map((row) => ({
          id: randomUUID(),
          storeId: context.storeId,
          categoryId: row.categoryName ? (categoryIds.get(row.categoryName) ?? null) : null,
          name: row.name,
          description: row.description,
          priceCents: row.priceCents,
          available: row.available,
          published: true,
        }));
        const firstProduct = products[0];

        if (!firstProduct)
          throw new AppError(422, "EMPTY_IMPORT", "A importação não possui produtos válidos.");

        await tx.product.createMany({ data: products });
        await tx.idempotency.create({
          data: {
            storeId: context.storeId,
            key: idempotencyKey,
            requestHash,
            productId: firstProduct.id,
          },
        });

        return { importedCount: products.length, alreadyImported: false };
      },
      { timeout: 20_000 }
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const saved = await db.idempotency.findUnique({
        where: { storeId_key: { storeId: context.storeId, key: idempotencyKey } },
      });

      if (saved?.requestHash === requestHash)
        return { importedCount: rows.length, alreadyImported: true };
    }

    throw error;
  }
}
