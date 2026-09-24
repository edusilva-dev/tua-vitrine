import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

export const fixtures = {
  firstStore: "e2000000-0000-4000-8000-000000000001",
  secondStore: "e2000000-0000-4000-8000-000000000002",
  product: "e2000000-0000-4000-8000-000000000003",
  variant: "e2000000-0000-4000-8000-000000000004",
  secondProduct: "e2000000-0000-4000-8000-000000000005",
  firstSlug: "e2e-cafe",
  secondSlug: "e2e-atelie",
} as const;

export function testDatabase() {
  const url = process.env.E2E_DATABASE_URL;

  if (!url || new URL(url).pathname !== "/tuavitrine_test") {
    throw new Error("E2E_DATABASE_URL deve apontar exclusivamente para tuavitrine_test.");
  }

  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

export async function cleanFixtures(db: ReturnType<typeof testDatabase>) {
  const storeIds = [fixtures.firstStore, fixtures.secondStore];
  const sessions = await db.anonymousSession.findMany({
    where: {
      OR: [
        { events: { some: { storeId: { in: storeIds } } } },
        { likes: { some: { storeId: { in: storeIds } } } },
      ],
    },
    select: { id: true },
  });

  await db.store.deleteMany({ where: { id: { in: storeIds } } });
  await db.anonymousSession.deleteMany({
    where: {
      id: { in: sessions.map((session) => session.id) },
      events: { none: {} },
      likes: { none: {} },
    },
  });
}

export default async function setup() {
  const ready = await fetch("http://localhost:3100/api/health/ready", {
    signal: AbortSignal.timeout(60000),
  });

  if (!ready.ok) throw new Error("O servidor E2E não está pronto para acessar o banco.");

  const db = testDatabase();

  try {
    await cleanFixtures(db);
    await db.store.createMany({
      data: [
        {
          id: fixtures.firstStore,
          slug: fixtures.firstSlug,
          name: "Café de teste",
          whatsapp: "+5511999999999",
          status: "ACTIVE",
          onboardingCompletedAt: new Date(),
          customization: { version: 1, tagline: "Café fresco e boas conversas." },
        },
        {
          id: fixtures.secondStore,
          slug: fixtures.secondSlug,
          name: "Ateliê de teste",
          whatsapp: "+5511999999999",
          status: "ACTIVE",
          onboardingCompletedAt: new Date(),
        },
      ],
    });
    await db.product.create({
      data: {
        id: fixtures.product,
        storeId: fixtures.firstStore,
        name: "Cookie com chocolate",
        description: "Cookie artesanal para testes.",
        priceCents: 900,
        variants: {
          create: {
            id: fixtures.variant,
            label: "Dupla",
            combinationKey: JSON.stringify([["Embalagem", "Dupla"]]),
            priceCents: 1800,
            available: true,
          },
        },
      },
    });
    await db.product.create({
      data: {
        id: fixtures.secondProduct,
        storeId: fixtures.secondStore,
        name: "Caneca artesanal",
        description: "Caneca de teste.",
        priceCents: 3500,
      },
    });
  } finally {
    await db.$disconnect();
  }
}
