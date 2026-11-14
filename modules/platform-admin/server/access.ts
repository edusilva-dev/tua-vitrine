import "server-only";

import { headers } from "next/headers";
import { cache } from "react";
import { getAuth } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { getEnv } from "@/lib/server/env";
import { AppError } from "@/lib/server/http";
import { isAllowedAdminRequest } from "@/lib/server/request-origin";

export type PlatformAdminIdentity = {
  grantId: string;
  userId: string;
  name: string;
  email: string;
};

export async function resolvePlatformAdmin(userId: string): Promise<PlatformAdminIdentity | null> {
  const grant = await db.platformAdmin.findFirst({
    where: { userId, revokedAt: null, user: { emailVerified: true } },
    select: {
      id: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (!grant) return null;

  return {
    grantId: grant.id,
    userId: grant.user.id,
    name: grant.user.name,
    email: grant.user.email,
  };
}

export const getOptionalPlatformAdminIdentity = cache(
  async (): Promise<PlatformAdminIdentity | null> => {
    const env = getEnv();

    if (!env.AUTH_ENABLED) return null;

    const session = await getAuth().api.getSession({ headers: await headers() });

    if (!session?.user.emailVerified) return null;

    return resolvePlatformAdmin(session.user.id);
  }
);

export async function requirePlatformAdmin(mutation = false): Promise<PlatformAdminIdentity> {
  const identity = await getOptionalPlatformAdminIdentity();

  if (!identity) throw new AppError(404, "NOT_FOUND", "Página não encontrada.");

  if (!mutation) return identity;

  const values = await headers();
  const env = getEnv();

  if (
    !isAllowedAdminRequest({
      mutation,
      secFetchSite: values.get("sec-fetch-site"),
      origin: values.get("origin"),
      appUrl: env.APP_URL,
      additionalOrigins: env.TRUSTED_ORIGINS,
    })
  ) {
    throw new AppError(403, "ORIGIN", "Origem não permitida.");
  }

  return identity;
}
