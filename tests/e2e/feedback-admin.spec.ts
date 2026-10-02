import { expect, test } from "@playwright/test";
import { fixtures, testDatabase } from "../setup/e2e-fixtures";

test("lojista acompanha a vitrine e envia feedback da plataforma", async ({
  context,
  page,
}, testInfo) => {
  const db = testDatabase();
  const storefrontMessage = `Problema relatado ${testInfo.project.name}`;
  const platformMessage = `Sugestão do lojista ${testInfo.project.name}`;

  try {
    await db.feedback.create({
      data: {
        storeId: fixtures.firstStore,
        source: "STOREFRONT",
        kind: "PROBLEM",
        rating: 2,
        message: storefrontMessage,
        context: "GENERAL",
      },
    });
    await context.addCookies([
      {
        name: "tv-local-store",
        value: fixtures.firstStore,
        url: "http://localhost:3100",
        httpOnly: true,
        sameSite: "Strict",
      },
    ]);
    await page.goto("/admin/support");

    await expect(page.getByRole("heading", { name: "Feedback da sua vitrine" })).toBeVisible();
    await expect(page.getByText(storefrontMessage)).toBeVisible();
    await page.getByRole("radio", { name: "5 estrelas" }).click();
    await page.getByLabel("Comentário opcional").fill(platformMessage);
    await page.getByRole("button", { name: "Enviar feedback" }).click();

    await expect(page.getByText(/Feedback recebido/)).toBeVisible();
    await expect
      .poll(() => db.feedback.count({ where: { message: platformMessage, source: "PLATFORM" } }))
      .toBe(1);
  } finally {
    await db.feedback.deleteMany({
      where: { message: { in: [storefrontMessage, platformMessage] } },
    });
    await db.$disconnect();
  }
});
