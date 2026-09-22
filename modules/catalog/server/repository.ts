import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { StoreContext } from "@/lib/server/context";
import { db } from "@/lib/server/db";

export const productInclude = {
  category: true,
  images: { orderBy: { position: "asc" as const }, include: { asset: true } },
  variants: {
    orderBy: { label: "asc" as const },
    include: { values: { include: { value: { include: { option: true } } } } },
  },
} satisfies Prisma.ProductInclude;

export type ProductRecord = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

export const catalogRepository = {
  find: (context: StoreContext, id: string) =>
    db.product.findFirst({
      where: { id, storeId: context.storeId, archivedAt: null },
      include: productInclude,
    }),
  categories: (context: StoreContext) =>
    db.category.findMany({
      where: { storeId: context.storeId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
};
