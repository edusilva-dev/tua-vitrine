import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { fixtures, testDatabase } from "../setup/e2e-fixtures";

test("cadastra fotos e variações como descrições simples", async ({ context, page }, testInfo) => {
  const db = testDatabase();
  const productName = `Hidratação/nutrição/restauração ${testInfo.project.name}`;

  try {
    await db.store.update({
      where: { id: fixtures.firstStore },
      data: { trialStartedAt: new Date() },
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
    await expect(dialog.getByLabel("Escolher fotos da galeria")).toHaveAttribute("multiple", "");
    const firstImage = await sharp({
      create: { width: 24, height: 24, channels: 3, background: "#355e3b" },
    })
      .jpeg()
      .toBuffer();
    const secondImage = await sharp({
      create: { width: 24, height: 24, channels: 3, background: "#d5e9bc" },
    })
      .png()
      .toBuffer();

    await dialog.getByLabel("Escolher fotos da galeria").setInputFiles([
      { name: "produto-1.jpg", mimeType: "image/jpeg", buffer: firstImage },
      { name: "produto-2.png", mimeType: "image/png", buffer: secondImage },
    ]);
    await expect(dialog.getByAltText("Foto 1")).toBeVisible();
    await expect(dialog.getByAltText("Foto 2")).toBeVisible();
    await dialog.getByLabel("O preço começa no valor informado").check();

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
      include: { variants: true, images: true },
    });

    expect(saved.variations).toEqual(["Tamanho: P, M, G e GG", "Cor: Azul, Preto e Branco"]);
    expect(saved.variants).toHaveLength(0);
    expect(saved.images).toHaveLength(2);
    expect(saved.priceStartsAt).toBe(true);

    await page.goto(`/${fixtures.firstSlug}`);
    const card = page.locator("article").filter({ hasText: productName });
    const listingGallery = card.getByTestId("product-gallery");

    await expect(card).toBeVisible();
    expect(
      await listingGallery.evaluate((element) => element.scrollWidth > element.clientWidth)
    ).toBe(true);
    await listingGallery.evaluate((element) => element.scrollTo({ left: element.scrollWidth }));
    await expect
      .poll(() => listingGallery.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(0);

    await card.getByRole("button", { name: productName, exact: true }).click();
    const details = page.getByRole("dialog", { name: productName });
    const detailGallery = details.getByTestId("product-gallery");

    await expect(details).toBeVisible();
    expect(
      await detailGallery.evaluate((element) => element.scrollWidth > element.clientWidth)
    ).toBe(true);
    expect(await details.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true
    );
  } finally {
    await db.product.deleteMany({ where: { storeId: fixtures.firstStore, name: productName } });
    await db.$disconnect();
  }
});
