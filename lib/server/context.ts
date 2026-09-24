import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { z } from "zod";
import { getAuth } from "./auth";
import { db } from "./db";
import { getEnv } from "./env";
import { AppError } from "./http";

export type StoreContext = { storeId: string };

export const getOptionalAdminIdentity = cache(
  async (): Promise<{ userId: string | null } | null> => {
    const env = getEnv();
    const values = await headers();

    if (env.AUTH_MODE === "local") {
      if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(values.get("host") ?? "")) {
        throw new AppError(
          403,
          "LOCAL_ONLY",
          "O painel de demonstração funciona apenas em localhost."
        );
      }

      return { userId: null };
    }

    const session = await getAuth().api.getSession({ headers: values });

    if (!session?.user.emailVerified) return null;

    return { userId: session.user.id };
  }
);

export async function getAdminIdentity(): Promise<{ userId: string | null }> {
  const identity = await getOptionalAdminIdentity();

  if (!identity) throw new AppError(401, "UNAUTHENTICATED", "Entre na sua conta para continuar.");

  return identity;
}

export async function assertAdminAccess(mutation = false): Promise<void> {
  await getAdminIdentity();
  const values = await headers();

  if (values.get("sec-fetch-site") === "cross-site") {
    throw new AppError(403, "ORIGIN", "Origem não permitida.");
  }

  if (!mutation) return;

  if (values.get("origin") !== new URL(getEnv().APP_URL).origin) {
    throw new AppError(403, "ORIGIN", "Origem não permitida.");
  }
}

export async function resolveMemberStore(userId: string, selected?: string): Promise<StoreContext> {
  if (selected && !z.string().uuid().safeParse(selected).success) {
    throw new AppError(404, "NOT_FOUND", "Loja não encontrada.");
  }

  const membership = await db.storeMember.findFirst({
    where: { userId, role: "OWNER", ...(selected ? { storeId: selected } : {}) },
    orderBy: { createdAt: "asc" },
    select: { storeId: true },
  });

  if (!membership) {
    throw new AppError(404, selected ? "NOT_FOUND" : "NO_STORE", "Loja não encontrada.");
  }

  return { storeId: membership.storeId };
}

export async function getAdminContext(): Promise<StoreContext> {
  await assertAdminAccess();
  const identity = await getAdminIdentity();
  const jar = await cookies();
  const selected = jar.get(identity.userId ? "tv-store" : "tv-local-store")?.value;

  if (identity.userId) return resolveMemberStore(identity.userId, selected);

  if (selected && z.string().uuid().safeParse(selected).success) {
    const store = await db.store.findUnique({ where: { id: selected }, select: { id: true } });

    if (store) return { storeId: store.id };
  }

  const first = await db.store.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });

  if (!first) throw new AppError(404, "NO_STORE", "Crie sua primeira loja.");

  return { storeId: first.id };
}

export async function setAdminContext(storeId: string): Promise<void> {
  await assertAdminAccess(true);
  const identity = await getAdminIdentity();

  z.string().uuid().parse(storeId);

  if (identity.userId) await resolveMemberStore(identity.userId, storeId);

  if (!identity.userId && !(await db.store.findUnique({ where: { id: storeId } }))) {
    throw new AppError(404, "NOT_FOUND", "Loja não encontrada.");
  }

  (await cookies()).set(identity.userId ? "tv-store" : "tv-local-store", storeId, {
    httpOnly: true,
    sameSite: "strict",
    secure: getEnv().APP_URL.startsWith("https:"),
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
