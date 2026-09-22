import "server-only";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { db } from "./db";
import { AppError } from "./http";
export type StoreContext = { storeId: string };
export async function assertLocalAdmin(mutation = false): Promise<void> {
  const values = await headers();
  const host = values.get("host") ?? "";
  const appEnv = process.env.APP_ENV ?? "development";

  if (
    process.env.LOCAL_ONLY !== "true" ||
    !["development", "local", "test"].includes(appEnv) ||
    !/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)
  )
    throw new AppError(
      403,
      "LOCAL_ONLY",
      "O painel sem autenticação funciona apenas em localhost."
    );

  if (values.get("sec-fetch-site") === "cross-site")
    throw new AppError(403, "ORIGIN", "Origem não permitida.");

  if (!mutation) return;

  const origin = values.get("origin");

  if (!origin) throw new AppError(403, "ORIGIN", "Origem obrigatória.");

  try {
    if (new URL(origin).host !== host) throw new Error("origin");
  } catch {
    throw new AppError(403, "ORIGIN", "Origem não permitida.");
  }
}
export async function getAdminContext(): Promise<StoreContext> {
  await assertLocalAdmin();
  const jar = await cookies();
  const selected = jar.get("tv-local-store")?.value;

  if (selected && z.string().uuid().safeParse(selected).success) {
    const store = await db.store.findUnique({ where: { id: selected }, select: { id: true } });

    if (store) return { storeId: store.id };
  }

  const first = await db.store.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });

  if (!first) throw new AppError(404, "NO_STORE", "Crie sua primeira loja.");

  return { storeId: first.id };
}
export async function setAdminContext(storeId: string): Promise<void> {
  await assertLocalAdmin(true);
  z.string().uuid().parse(storeId);

  if (!(await db.store.findUnique({ where: { id: storeId } })))
    throw new AppError(404, "NOT_FOUND", "Loja não encontrada.");

  (await cookies()).set("tv-local-store", storeId, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.APP_URL?.startsWith("https:") ?? false,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
