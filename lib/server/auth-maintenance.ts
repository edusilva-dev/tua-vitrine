import "server-only";
import { db } from "./db";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const AUTH_RETENTION_DAYS = {
  sessionsAfterExpiry: 7,
  verificationsAfterExpiry: 7,
  rateLimitsAfterLastRequest: 7,
} as const;

type CleanupAuthOptions = {
  apply?: boolean;
  limit?: number;
  now?: Date;
};

type CleanupTableResult = {
  candidates: string[];
  deleted: number;
  skipped: number;
};

export type CleanupAuthResult = {
  dryRun: boolean;
  cutoffs: {
    sessions: string;
    verifications: string;
    rateLimitsEpochMs: string;
  };
  limitPerTable: number;
  sessions: CleanupTableResult;
  verifications: CleanupTableResult;
  rateLimits: CleanupTableResult;
};

function emptyResult(candidates: string[]): CleanupTableResult {
  return { candidates, deleted: 0, skipped: 0 };
}

/**
 * Removes only stale Better Auth operational records. Users, accounts and store
 * memberships are deliberately outside this maintenance boundary.
 */
export async function cleanupAuth(options: CleanupAuthOptions = {}): Promise<CleanupAuthResult> {
  const limit = options.limit ?? 1000;

  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
    throw new Error("O lote por tabela deve conter entre 1 e 1000 registros.");
  }

  const now = options.now ?? new Date();

  if (Number.isNaN(now.getTime())) throw new Error("A data de referência é inválida.");

  const sessionCutoff = new Date(
    now.getTime() - AUTH_RETENTION_DAYS.sessionsAfterExpiry * DAY_IN_MS
  );
  const verificationCutoff = new Date(
    now.getTime() - AUTH_RETENTION_DAYS.verificationsAfterExpiry * DAY_IN_MS
  );
  const rateLimitCutoff = BigInt(
    now.getTime() - AUTH_RETENTION_DAYS.rateLimitsAfterLastRequest * DAY_IN_MS
  );
  const [sessions, verifications, rateLimits] = await Promise.all([
    db.session.findMany({
      where: { expiresAt: { lte: sessionCutoff } },
      orderBy: [{ expiresAt: "asc" }, { id: "asc" }],
      take: limit,
      select: { id: true },
    }),
    db.verification.findMany({
      where: { expiresAt: { lte: verificationCutoff } },
      orderBy: [{ expiresAt: "asc" }, { id: "asc" }],
      take: limit,
      select: { id: true },
    }),
    db.rateLimit.findMany({
      where: { lastRequest: { lte: rateLimitCutoff } },
      orderBy: [{ lastRequest: "asc" }, { id: "asc" }],
      take: limit,
      select: { id: true },
    }),
  ]);
  const result: CleanupAuthResult = {
    dryRun: !options.apply,
    cutoffs: {
      sessions: sessionCutoff.toISOString(),
      verifications: verificationCutoff.toISOString(),
      rateLimitsEpochMs: rateLimitCutoff.toString(),
    },
    limitPerTable: limit,
    sessions: emptyResult(sessions.map(({ id }) => id)),
    verifications: emptyResult(verifications.map(({ id }) => id)),
    rateLimits: emptyResult(rateLimits.map(({ id }) => id)),
  };

  if (!options.apply) return result;

  const [deletedSessions, deletedVerifications, deletedRateLimits] = await db.$transaction([
    db.session.deleteMany({
      where: { id: { in: result.sessions.candidates }, expiresAt: { lte: sessionCutoff } },
    }),
    db.verification.deleteMany({
      where: {
        id: { in: result.verifications.candidates },
        expiresAt: { lte: verificationCutoff },
      },
    }),
    db.rateLimit.deleteMany({
      where: { id: { in: result.rateLimits.candidates }, lastRequest: { lte: rateLimitCutoff } },
    }),
  ]);

  result.sessions.deleted = deletedSessions.count;
  result.sessions.skipped = result.sessions.candidates.length - deletedSessions.count;
  result.verifications.deleted = deletedVerifications.count;
  result.verifications.skipped =
    result.verifications.candidates.length - deletedVerifications.count;
  result.rateLimits.deleted = deletedRateLimits.count;
  result.rateLimits.skipped = result.rateLimits.candidates.length - deletedRateLimits.count;

  return result;
}
