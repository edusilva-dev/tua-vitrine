import { expect, test } from "@playwright/test";
import { fixtures, testDatabase } from "../setup/e2e-fixtures";

test("cadastra fotos e variações como descrições simples", async ({ context, page }, testInfo) => {
  const db = testDatabase();
  const productName = `Camiseta com opções ${testInfo.project.name}`;

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
    await page.getByRole("button", { name: "Adicionar produto", exact: true }).first().click();

    const dialog = page.getByRole("dialog", { name: "Um novo produto na vitrine" });

    await dialog.getByLabel("Nome do produto").fill(productName);
    await dialog.getByLabel("Preço normal (R$)", { exact: true }).fill("2000");
    await expect(dialog.getByRole("button", { name: "Tirar foto" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Escolher da galeria" })).toBeVisible();
    await expect(dialog.getByLabel("Tirar foto do produto")).toHaveAttribute(
      "capture",
      "environment"
    );

    await dialog
      .getByRole("textbox", { name: "Variação 1", exact: true })
      .fill("Tamanho: P, M, G e GG");
    await dialog.getByRole("button", { name: "Adicionar variação" }).click();
    await dialog
      .getByRole("textbox", { name: "Variação 2", exact: true })
      .fill("Cor: Azul, Preto e Branco");
    await dialog.getByRole("button", { name: "Adicionar produto", exact: true }).click();

    await expect(page.getByText("Produto adicionado à vitrine.")).toBeVisible();
    const saved = await db.product.findFirstOrThrow({
      where: { storeId: fixtures.firstStore, name: productName },
      include: { variants: true },
    });

    expect(saved.variations).toEqual(["Tamanho: P, M, G e GG", "Cor: Azul, Preto e Branco"]);
    expect(saved.variants).toHaveLength(0);
  } finally {
    await db.product.deleteMany({ where: { storeId: fixtures.firstStore, name: productName } });
    await db.$disconnect();
  }
});
