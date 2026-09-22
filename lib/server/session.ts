import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { db } from "./db";
import { AppError } from "./http";
export async function assertSameOrigin(): Promise<void> {
  const values = await headers();
  const origin = values.get("origin");
  const host = values.get("host");

  if (!origin || !host || values.get("sec-fetch-site") === "cross-site")
    throw new AppError(403, "ORIGIN", "Origem não permitida.");

  try {
    if (new URL(origin).host !== host) throw new Error("origin");
  } catch {
    throw new AppError(403, "ORIGIN", "Origem não permitida.");
  }
}
export async function anonymousSession(): Promise<string> {
  const jar = await cookies();
  const token = jar.get("tv-visitor")?.value;

  if (token && /^[a-f0-9]{64}$/.test(token)) {
    const hash = createHash("sha256").update(token).digest("hex");
    const session = await db.anonymousSession.findUnique({ where: { tokenHash: hash } });

    if (session && session.expiresAt > new Date()) return session.id;
  }

  const newToken = randomBytes(32).toString("hex");
  const session = await db.anonymousSession.create({
    data: {
      tokenHash: createHash("sha256").update(newToken).digest("hex"),
      expiresAt: new Date(Date.now() + 365 * 86400000),
    },
  });

  jar.set("tv-visitor", newToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.APP_URL?.startsWith("https:") ?? false,
    path: "/",
    maxAge: 365 * 86400,
  });

  return session.id;
}
const requests = new Map<string, { count: number; until: number }>();

export function rateLimit(key: string, maximum = 120): void {
  const now = Date.now();

  if (requests.size > 5000)
    for (const [id, entry] of requests) if (entry.until < now) requests.delete(id);

  const current = requests.get(key);

  if (!current || current.until < now) {
    requests.set(key, { count: 1, until: now + 60000 });

    return;
  }

  if (current.count >= maximum)
    throw new AppError(429, "RATE_LIMIT", "Aguarde um minuto antes de tentar novamente.");

  current.count += 1;
}
