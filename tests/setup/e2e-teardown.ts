import { cleanFixtures, testDatabase } from "./e2e-fixtures";

export default async function teardown() {
  const db = testDatabase();

  try {
    await cleanFixtures(db);
  } finally {
    await db.$disconnect();
  }
}
