import "server-only";

import { headers } from "next/headers";
import { cache } from "react";
import { Prisma } from "@/generated/prisma/client";
import { getAuth } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { getEnv } from "@/lib/server/env";
import { AppError } from "@/lib/server/http";
import { logger } from "@/lib/server/logger";
import { isAllowedAdminRequest } from "@/lib/server/request-origin";

export type PlatformAdminIdentity = {
  grantId: string;
  userId: string;
  name: string;
  email: string;
};

type PlatformAdminGrant = {
  id: string;
  user: { id: string; name: string; email: string };
};

type FindPlatformAdminGrant = (userId: string) => Promise<PlatformAdminGrant | null>;

const findPlatformAdminGrant: FindPlatformAdminGrant = (userId) =>
  db.platformAdmin.findFirst({
    where: { userId, revokedAt: null, user: { emailVerified: true } },
    select: {
      id: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

export async function resolvePlatformAdmin(
  userId: string,
  findGrant: FindPlatformAdminGrant = findPlatformAdminGrant
): Promise<PlatformAdminIdentity | null> {
  let grant: PlatformAdminGrant | null;

  try {
    grant = await findGrant(userId);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2021" &&
      error.meta?.modelName === "PlatformAdmin"
    ) {
      logger.warn(
        { code: error.code, model: "PlatformAdmin" },
        "Platform Admin ainda não está disponível neste banco."
      );

      return null;
    }

    throw error;
  }

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
