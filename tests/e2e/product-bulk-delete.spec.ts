import { expect, test } from "@playwright/test";
import { fixtures, testDatabase } from "../setup/e2e-fixtures";

test("seleciona e exclui produtos em lote", async ({ context, page }, testInfo) => {
  const db = testDatabase();
  const suffix = testInfo.project.name;
  const firstName = `Produto em lote A ${suffix}`;
  const secondName = `Produto em lote B ${suffix}`;
  const preservedName = `Produto preservado ${suffix}`;
  const created = await db.product.createManyAndReturn({
    data: [
      {
        storeId: fixtures.firstStore,
        name: firstName,
        description: "Produto criado para validar a exclusão em lote.",
        priceCents: 1_500,
      },
      {
        storeId: fixtures.firstStore,
        name: secondName,
        description: "Produto criado para validar a exclusão em lote.",
        priceCents: 2_500,
      },
      {
        storeId: fixtures.firstStore,
        name: preservedName,
        description: "Produto que não deve ser excluído.",
        priceCents: 3_500,
      },
    ],
    select: { id: true },
  });
  const createdIds = created.map((product) => product.id);

  try {
    await context.addCookies([
      {
        name: "tv-local-store",
        value: fixtures.firstStore,
        url: "http://localhost:3100",
        httpOnly: true,
        sameSite: "Strict",
      },
    ]);
    await page.goto("/admin/products");

    await page.getByRole("checkbox", { name: `Selecionar ${firstName}` }).click();
    await expect(page.getByText("1 produto selecionado")).toBeVisible();
    await page.getByRole("checkbox", { name: `Selecionar ${secondName}` }).click();
    await expect(page.getByText("2 produtos selecionados")).toBeVisible();

    await page.getByRole("button", { name: "Excluir", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Excluir 2 produtos?" })).toBeVisible();
    await page.getByRole("button", { name: "Excluir produtos" }).click();

    await expect(page.getByText("2 produtos excluídos.")).toBeVisible();
    await expect(page.getByText(firstName)).toHaveCount(0);
    await expect(page.getByText(secondName)).toHaveCount(0);
    await expect(page.getByText(preservedName)).toBeVisible();

    const records = await db.product.findMany({
      where: { id: { in: createdIds } },
      select: { name: true, archivedAt: true },
    });

    expect(records.find((product) => product.name === firstName)?.archivedAt).not.toBeNull();
    expect(records.find((product) => product.name === secondName)?.archivedAt).not.toBeNull();
    expect(records.find((product) => product.name === preservedName)?.archivedAt).toBeNull();
  } finally {
    await db.product.deleteMany({ where: { id: { in: createdIds } } });
    await db.$disconnect();
  }
});
