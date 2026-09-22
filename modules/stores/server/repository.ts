import "server-only";
import { db } from "@/lib/server/db";
export const storeRepository = {
  find: (id: string) => db.store.findUnique({ where: { id } }),
  bySlug: (slug: string) => db.store.findUnique({ where: { slug } }),
  list: () => db.store.findMany({ orderBy: { createdAt: "asc" } }),
};
