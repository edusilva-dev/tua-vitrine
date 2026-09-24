import "server-only";
import { db } from "@/lib/server/db";

export const storeRepository = {
  find: (id: string) => db.store.findUnique({ where: { id } }),
  bySlug: (slug: string) => db.store.findUnique({ where: { slug } }),
  list: (userId: string | null) =>
    db.store.findMany({
      where: userId ? { members: { some: { userId, role: "OWNER" } } } : {},
      orderBy: { createdAt: "asc" },
    }),
};
