import { expect, test } from "@playwright/test";
import { fixtures, testDatabase } from "../setup/e2e-fixtures";

test("cadastra fotos e combinações estruturadas com preços próprios", async ({
  context,
  page,
}, testInfo) => {
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

    await dialog.getByLabel("Este produto tem opções, como cor ou tamanho?").click();
    await dialog.getByRole("button", { name: "Cor", exact: true }).click();
    await dialog.getByLabel("Novo valor de Cor").fill("Azul");
    await dialog.getByLabel("Novo valor de Cor").press("Enter");
    await dialog.getByLabel("Novo valor de Cor").fill("Verde");
    await dialog.getByLabel("Novo valor de Cor").press("Enter");

    await dialog.getByRole("button", { name: "Tamanho", exact: true }).click();
    await dialog.getByLabel("Novo valor de Tamanho").fill("P");
    await dialog.getByLabel("Novo valor de Tamanho").press("Enter");
    await dialog.getByLabel("Novo valor de Tamanho").fill("M");
    await dialog.getByLabel("Novo valor de Tamanho").press("Enter");
    await dialog.getByRole("button", { name: "Atualizar combinações" }).click();

    await expect(dialog.getByText("Azul / P", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Verde / M", { exact: true })).toBeVisible();
    await dialog.locator("#variant-price-3").fill("2500");
    await dialog.locator("#variant-discount-price-3").fill("2200");
    await dialog.getByRole("button", { name: "Remover variação 2" }).click();
    await expect(dialog.getByText("Combinações removidas (1)")).toBeVisible();
    await dialog.getByRole("button", { name: "Adicionar produto", exact: true }).click();

    await expect(page.getByText("Produto adicionado à vitrine.")).toBeVisible();
    const saved = await db.product.findFirstOrThrow({
      where: { storeId: fixtures.firstStore, name: productName },
      include: { variants: true },
    });

    expect(saved.variants).toHaveLength(3);
    const adjusted = saved.variants.find((variant) => variant.label === "Verde / M");

    expect(adjusted?.priceCents).toBe(2500);
    expect(adjusted?.discountPriceCents).toBe(2200);
    expect(saved.variants.some((variant) => variant.label === "Azul / M")).toBe(false);
  } finally {
    await db.product.deleteMany({ where: { storeId: fixtures.firstStore, name: productName } });
    await db.$disconnect();
  }
});
