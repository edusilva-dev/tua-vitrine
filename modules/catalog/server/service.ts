import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import type { StoreContext } from "@/lib/server/context";
import { db } from "@/lib/server/db";
import { AppError } from "@/lib/server/http";
import { assetUrl } from "@/lib/server/storage-adapter";
import { PLAN_CAPABILITIES } from "@/modules/billing/contracts";
import { getEntitlements } from "@/modules/billing/server/entitlements";
import { normalizeSlug } from "@/modules/stores/contracts";
import {
  type CategoryDTO,
  type ProductDTO,
  type ProductFilters,
  type ProductListDTO,
  type ProductOptionFilterDTO,
  productInputSchema,
  variantLabel,
} from "../contracts";
import { catalogRepository, type ProductRecord, productInclude } from "./repository";

export function toProductDTO(product: ProductRecord): ProductDTO {
  return {
    id: product.id,
    storeId: product.storeId,
    name: product.name,
    description: product.description,
    priceCents: product.priceCents,
    discountPriceCents: product.discountPriceCents,
    available: product.available,
    published: product.published,
    category: product.category ? { id: product.category.id, name: product.category.name } : null,
    images: product.images.map(({ asset }) => ({
      id: asset.id,
      url: assetUrl(asset),
      width: asset.width,
      height: asset.height,
    })),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      label: variant.label,
      options: Object.fromEntries(
        variant.values.map(({ value }) => [value.option.name, value.value])
      ),
      priceCents: variant.priceCents,
      discountPriceCents: variant.discountPriceCents ?? null,
      available: variant.available,
    })),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export async function listProducts(
  context: StoreContext,
  filters: ProductFilters = {},
  options: { publishedOnly?: boolean; productIds?: string[] } = {}
): Promise<ProductListDTO> {
  const page = Number.isFinite(filters.page) ? Math.max(1, Math.floor(filters.page ?? 1)) : 1;
  const pageSize = 24;
  const where: Prisma.ProductWhereInput = {
    storeId: context.storeId,
    archivedAt: null,
    ...(options.publishedOnly ? { published: true } : {}),
    ...(options.productIds ? { id: { in: options.productIds } } : {}),
  };

  if (filters.q) where.name = { contains: filters.q.slice(0, 120), mode: "insensitive" };

  if (filters.category && z.string().uuid().safeParse(filters.category).success)
    where.categoryId = filters.category;

  if (filters.available === "true" || filters.available === "false")
    where.available = filters.available === "true";

  const variantFilters = Object.entries(filters.variants ?? {});

  if (variantFilters.length) {
    where.variants = {
      some: {
        available: true,
        AND: variantFilters.map(([name, value]) => ({
          values: { some: { value: { value, option: { name } } } },
        })),
      },
    };
  }

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      include: productInclude,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.product.count({ where }),
  ]);

  return {
    data: products.map(toProductDTO),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

export async function listProductOptionFilters(
  context: StoreContext
): Promise<ProductOptionFilterDTO[]> {
  const options = await db.productOption.findMany({
    where: {
      storeId: context.storeId,
      product: { archivedAt: null, published: true, available: true },
    },
    select: {
      name: true,
      values: {
        where: { variants: { some: { variant: { available: true } } } },
        select: { value: true },
      },
    },
    orderBy: { name: "asc" },
  });
  const grouped = new Map<string, Set<string>>();

  for (const option of options) {
    const values = grouped.get(option.name) ?? new Set<string>();

    for (const entry of option.values) values.add(entry.value);

    grouped.set(option.name, values);
  }

  return [...grouped.entries()].map(([name, values]) => ({
    name,
    values: [...values].sort((first, second) => first.localeCompare(second, "pt-BR")),
  }));
}

export async function listProductsByIds(
  context: StoreContext,
  ids: string[],
  options: { publishedOnly?: boolean } = {}
): Promise<ProductDTO[]> {
  z.array(z.string().uuid()).max(100).parse(ids);

  return (
    await db.product.findMany({
      where: {
        storeId: context.storeId,
        id: { in: ids },
        archivedAt: null,
        ...(options.publishedOnly ? { published: true } : {}),
      },
      include: productInclude,
    })
  ).map(toProductDTO);
}

export function listCategories(context: StoreContext): Promise<CategoryDTO[]> {
  return catalogRepository.categories(context);
}

export async function getProduct(context: StoreContext, id: string): Promise<ProductDTO> {
  z.string().uuid().parse(id);
  const product = await catalogRepository.find(context, id);

  if (!product) throw new AppError(404, "NOT_FOUND", "Produto não encontrado.");

  return toProductDTO(product);
}

export async function saveProduct(
  context: StoreContext,
  input: unknown,
  id?: string,
  idempotencyKey?: string
): Promise<ProductDTO> {
  const values = productInputSchema.parse(input);
  const entitlements = await getEntitlements(context);

  if (id) z.string().uuid().parse(id);

  if (idempotencyKey) z.string().uuid().parse(idempotencyKey);

  if (new Set(values.assetIds).size !== values.assetIds.length)
    throw new AppError(422, "ASSETS", "Não repita a mesma imagem.");

  const requestHash = createHash("sha256").update(JSON.stringify(values)).digest("hex");
  const existingKey = idempotencyKey
    ? await db.idempotency.findUnique({
        where: { storeId_key: { storeId: context.storeId, key: idempotencyKey } },
      })
    : null;

  if (existingKey) {
    if (existingKey.requestHash !== requestHash)
      throw new AppError(409, "IDEMPOTENCY", "A chave já foi utilizada para outro produto.");

    return getProduct(context, existingKey.productId);
  }

  try {
    return await db.$transaction(async (tx) => {
      const store = await tx.store.findUnique({ where: { id: context.storeId } });

      if (!store) throw new AppError(404, "NOT_FOUND", "Loja não encontrada.");

      const imagesPerProductLimit = store.onboardingCompletedAt
        ? entitlements.imagesPerProductLimit
        : PLAN_CAPABILITIES.PROFESSIONAL.imagesPerProductLimit;

      if (values.assetIds.length > imagesPerProductLimit)
        throw new AppError(
          403,
          "IMAGE_LIMIT",
          `Seu plano permite até ${imagesPerProductLimit} ${imagesPerProductLimit === 1 ? "imagem" : "imagens"} por produto.`
        );

      if (
        !id &&
        (await tx.product.count({
          where: { storeId: context.storeId, archivedAt: null },
        })) >= entitlements.productLimit
      )
        throw new AppError(
          403,
          "PRODUCT_LIMIT",
          `Seu plano permite até ${entitlements.productLimit} produtos publicados.`
        );

      if (!store.whatsapp)
        throw new AppError(422, "ONBOARDING", "Cadastre o WhatsApp antes do primeiro produto.");

      if (
        id &&
        !(await tx.product.findFirst({ where: { id, storeId: context.storeId, archivedAt: null } }))
      )
        throw new AppError(404, "NOT_FOUND", "Produto não encontrado.");

      if (
        (await tx.asset.count({
          where: { id: { in: values.assetIds }, storeId: context.storeId },
        })) !== values.assetIds.length
      )
        throw new AppError(422, "ASSETS", "Imagem inválida para esta loja.");

      const category = values.categoryName
        ? await tx.category.upsert({
            where: { storeId_name: { storeId: context.storeId, name: values.categoryName } },
            create: {
              storeId: context.storeId,
              name: values.categoryName,
              slug:
                (normalizeSlug(values.categoryName) || "categoria") +
                "-" +
                createHash("sha256").update(values.categoryName).digest("hex").slice(0, 8),
            },
            update: {},
          })
        : null;
      const fields = {
        name: values.name,
        description: values.description,
        priceCents: values.priceCents,
        discountPriceCents: values.discountPriceCents ?? null,
        available: values.available,
        categoryId: category?.id ?? null,
      };
      const product = id
        ? await tx.product.update({
            where: { storeId_id: { storeId: context.storeId, id } },
            data: fields,
          })
        : await tx.product.create({ data: { ...fields, storeId: context.storeId } });
      const currentVariants = await tx.productVariant.findMany({
        where: { storeId: context.storeId, productId: product.id },
      });

      for (const variant of values.variants) {
        if (variant.id && !currentVariants.some((item) => item.id === variant.id))
          throw new AppError(422, "VARIANT", "Variante inválida para este produto.");
      }

      await tx.productImage.deleteMany({
        where: { storeId: context.storeId, productId: product.id },
      });
      await tx.productVariant.deleteMany({
        where: { storeId: context.storeId, productId: product.id },
      });
      await tx.productOption.deleteMany({
        where: { storeId: context.storeId, productId: product.id },
      });
      await tx.productImage.createMany({
        data: values.assetIds.map((assetId, position) => ({
          storeId: context.storeId,
          productId: product.id,
          assetId,
          position,
        })),
      });
      const optionValues = new Map<string, { optionId: string; valueId: string }>();
      const optionNames = Object.keys(values.variants[0]?.options ?? {});

      for (const name of optionNames) {
        const option = await tx.productOption.create({
          data: { storeId: context.storeId, productId: product.id, name },
        });
        const uniqueValues = new Set(
          values.variants
            .map((variant) => variant.options[name])
            .filter((value): value is string => value !== undefined)
        );

        for (const value of uniqueValues) {
          const saved = await tx.productOptionValue.create({
            data: { storeId: context.storeId, productId: product.id, optionId: option.id, value },
          });

          optionValues.set(JSON.stringify([name, value]), {
            optionId: option.id,
            valueId: saved.id,
          });
        }
      }

      for (const variant of values.variants) {
        const variantId = variant.id ?? randomUUID();

        await tx.productVariant.create({
          data: {
            id: variantId,
            storeId: context.storeId,
            productId: product.id,
            label: variantLabel(variant.options),
            combinationKey: JSON.stringify(
              Object.entries(variant.options).sort(([a], [b]) => a.localeCompare(b))
            ),
            priceCents: variant.priceCents,
            discountPriceCents: variant.discountPriceCents ?? null,
            available: variant.available,
          },
        });

        for (const entry of Object.entries(variant.options)) {
          const selection = optionValues.get(JSON.stringify(entry));

          if (!selection) throw new AppError(422, "VARIANT", "Opção inválida.");

          await tx.variantOptionValue.create({
            data: { storeId: context.storeId, productId: product.id, variantId, ...selection },
          });
        }
      }

      if (!store.onboardingCompletedAt)
        await tx.store.update({
          where: { id: store.id },
          data: { status: "ACTIVE", onboardingCompletedAt: new Date() },
        });

      if (idempotencyKey)
        await tx.idempotency.create({
          data: {
            storeId: context.storeId,
            key: idempotencyKey,
            requestHash,
            productId: product.id,
          },
        });

      return toProductDTO(
        await tx.product.findUniqueOrThrow({ where: { id: product.id }, include: productInclude })
      );
    });
  } catch (error) {
    if (
      idempotencyKey &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const saved = await db.idempotency.findUnique({
        where: { storeId_key: { storeId: context.storeId, key: idempotencyKey } },
      });

      if (saved?.requestHash === requestHash) return getProduct(context, saved.productId);
    }

    throw error;
  }
}

export async function archiveProduct(context: StoreContext, id: string): Promise<void> {
  await getProduct(context, id);
  await db.product.update({
    where: { storeId_id: { storeId: context.storeId, id } },
    data: { archivedAt: new Date(), available: false },
  });
}

export async function selectPublishedProducts(
  context: StoreContext,
  productIds: string[]
): Promise<void> {
  const ids = z
    .array(z.string().uuid())
    .max(1000)
    .parse([...new Set(productIds)]);
  const entitlements = await getEntitlements(context);

  if (ids.length > entitlements.productLimit)
    throw new AppError(
      422,
      "PRODUCT_LIMIT",
      `Selecione no máximo ${entitlements.productLimit} produtos para publicar.`
    );

  const count = await db.product.count({
    where: { storeId: context.storeId, id: { in: ids }, archivedAt: null },
  });

  if (count !== ids.length)
    throw new AppError(404, "NOT_FOUND", "Um ou mais produtos não foram encontrados.");

  await db.$transaction([
    db.product.updateMany({
      where: { storeId: context.storeId, archivedAt: null, published: true },
      data: { published: false },
    }),
    db.product.updateMany({
      where: { storeId: context.storeId, id: { in: ids }, archivedAt: null },
      data: { published: true },
    }),
  ]);
}

export async function listPublicationChoices(
  context: StoreContext
): Promise<{ id: string; name: string; published: boolean }[]> {
  return db.product.findMany({
    where: { storeId: context.storeId, archivedAt: null },
    select: { id: true, name: true, published: true },
    orderBy: [{ published: "desc" }, { createdAt: "desc" }],
    take: 1000,
  });
}
