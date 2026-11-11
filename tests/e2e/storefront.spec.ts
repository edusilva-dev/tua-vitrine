import { expect, test } from "@playwright/test";
import { fixtures, testDatabase } from "../setup/e2e-fixtures";

test.describe("vitrine pública", () => {
  test("seleciona variante e preserva o carrinho ao recarregar", async ({ page }) => {
    await page.goto(`/${fixtures.firstSlug}`);

    await expect(
      page.getByRole("heading", { name: "Café fresco e boas conversas." })
    ).toBeVisible();
    await page.getByRole("button", { name: "Ver Cookie com chocolate" }).click();
    await expect(page.getByRole("heading", { name: /Cookie com chocolate/ })).toBeVisible();
    await expect(page.getByRole("dialog")).toBeFocused();
    await expect(page.getByLabel("Quantidade")).not.toBeFocused();

    await page.getByRole("combobox", { name: "Escolha uma opção" }).click();
    await page.getByRole("option", { name: /Dupla/ }).click();
    await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();

    const cart = page.getByRole("button", { name: /Abrir carrinho, 1 itens/ });

    await expect(cart).toBeVisible();
    await page.reload();
    await expect(cart).toBeVisible();

    await cart.click();
    await expect(page.getByRole("heading", { name: "Seu carrinho" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cookie com chocolate · Dupla" })).toBeVisible();
  });

  test("se mantém utilizável no celular", async ({ page }) => {
    await page.goto(`/${fixtures.firstSlug}`);

    await expect(page.getByRole("button", { name: /Abrir carrinho/ })).toBeVisible();
    await page.getByRole("button", { name: "Ver Cookie com chocolate" }).click();
    await expect(page.getByRole("button", { name: "Adicionar ao carrinho" })).toBeVisible();
  });

  test("lista e placeholder do carrinho cabem no celular", async ({ page }) => {
    const db = testDatabase();
    const store = await db.store.findUniqueOrThrow({
      where: { id: fixtures.firstStore },
      select: { template: true, trialStartedAt: true },
    });

    try {
      await db.store.update({
        where: { id: fixtures.firstStore },
        data: { template: "list", trialStartedAt: new Date() },
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/${fixtures.firstSlug}`);

      const productButton = page.getByRole("button", {
        name: "Ver Cookie com chocolate",
        exact: true,
      });
      const card = page.getByRole("article").filter({ has: productButton });

      await expect(card).toBeVisible();
      expect(await card.evaluate((element) => getComputedStyle(element).flexDirection)).toBe("row");
      const cardBox = await card.boundingBox();

      expect(cardBox).not.toBeNull();
      expect(cardBox?.x).toBeGreaterThanOrEqual(0);
      expect((cardBox?.x ?? 0) + (cardBox?.width ?? 0)).toBeLessThanOrEqual(390);
      expect(await card.evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(
        await card.evaluate((element) => element.clientWidth)
      );
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        390
      );

      const detailsBox = await card.getByRole("button", { name: "Ver detalhes" }).boundingBox();

      expect(detailsBox).not.toBeNull();
      expect(detailsBox?.x).toBeGreaterThanOrEqual(cardBox?.x ?? 0);
      expect((detailsBox?.x ?? 0) + (detailsBox?.width ?? 0)).toBeLessThanOrEqual(
        (cardBox?.x ?? 0) + (cardBox?.width ?? 0)
      );

      await productButton.click();
      await page.getByRole("combobox", { name: "Escolha uma opção" }).click();
      await page.getByRole("option", { name: /Dupla/ }).click();
      await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
      await page.getByRole("button", { name: /Abrir carrinho, 1 itens/ }).click();

      const cart = page.getByRole("dialog", { name: "Seu carrinho" });
      const thumbnail = cart.getByTestId("product-image");
      const placeholderIcon = cart.getByTestId("product-image-placeholder-icon");
      const [thumbnailBox, placeholderIconBox] = await Promise.all([
        thumbnail.boundingBox(),
        placeholderIcon.boundingBox(),
      ]);

      expect(thumbnailBox).not.toBeNull();
      expect(placeholderIconBox).not.toBeNull();
      expect(placeholderIconBox?.x).toBeGreaterThanOrEqual(thumbnailBox?.x ?? 0);
      expect(placeholderIconBox?.y).toBeGreaterThanOrEqual(thumbnailBox?.y ?? 0);
      expect((placeholderIconBox?.x ?? 0) + (placeholderIconBox?.width ?? 0)).toBeLessThanOrEqual(
        (thumbnailBox?.x ?? 0) + (thumbnailBox?.width ?? 0)
      );
      expect((placeholderIconBox?.y ?? 0) + (placeholderIconBox?.height ?? 0)).toBeLessThanOrEqual(
        (thumbnailBox?.y ?? 0) + (thumbnailBox?.height ?? 0)
      );
    } finally {
      await db.store.update({
        where: { id: fixtures.firstStore },
        data: { template: store.template, trialStartedAt: store.trialStartedAt },
      });
      await db.$disconnect();
    }
  });

  test("favoritos persistem e escolhas não vazam entre lojas", async ({ page }) => {
    await page.goto(`/${fixtures.firstSlug}`);
    await page.getByRole("button", { name: "Curtir Cookie com chocolate", exact: true }).click();
    await page.getByRole("button", { name: "Ver Cookie com chocolate", exact: true }).click();
    await page.getByRole("combobox", { name: "Escolha uma opção" }).click();
    await page.getByRole("option", { name: /Dupla/ }).click();
    await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
    await expect(page.getByRole("button", { name: /Abrir carrinho, 1 itens/ })).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Descurtir Cookie com chocolate", exact: true })
    ).toHaveAttribute("aria-pressed", "true");
    await page.goto(`/${fixtures.secondSlug}`);
    await expect(page.getByRole("button", { name: /Abrir carrinho, 0 itens/ })).toBeVisible();
    await page.getByRole("button", { name: "Ver favoritos" }).click();
    await expect(page.getByRole("heading", { name: "Seus favoritos aparecem aqui" })).toBeVisible();
    await page.goto(`/${fixtures.firstSlug}`);
    await expect(page.getByRole("button", { name: /Abrir carrinho, 1 itens/ })).toBeVisible();
    await page.getByRole("button", { name: "Descurtir Cookie com chocolate", exact: true }).click();
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Curtir Cookie com chocolate", exact: true })
    ).toHaveAttribute("aria-pressed", "false");
  });

  test("variante indisponível impede envio do carrinho", async ({ page }) => {
    const db = testDatabase();

    try {
      await page.goto(`/${fixtures.firstSlug}`);
      await page.getByRole("button", { name: "Ver Cookie com chocolate", exact: true }).click();
      await page.getByRole("combobox", { name: "Escolha uma opção" }).click();
      await page.getByRole("option", { name: /Dupla/ }).click();
      await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
      await db.productVariant.update({
        where: { id: fixtures.variant },
        data: { available: false },
      });
      await page.getByRole("button", { name: /Abrir carrinho, 1 itens/ }).click();
      await expect(
        page.getByText("Indisponível. Remova este item ou escolha outra opção.")
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Falar com vendedor" })).toBeDisabled();
      await page.reload();
      await page.getByRole("button", { name: /Abrir carrinho, 1 itens/ }).click();
      await expect(page.getByRole("button", { name: "Falar com vendedor" })).toBeDisabled();
    } finally {
      await db.productVariant.update({
        where: { id: fixtures.variant },
        data: { available: true },
      });
      await db.$disconnect();
    }
  });

  test("preview não registra visitas nem curtidas", async ({ page, context }) => {
    const db = testDatabase();
    const analyticsRequests: string[] = [];

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
      const before = await Promise.all([
        db.metricEvent.count({ where: { storeId: fixtures.firstStore } }),
        db.productLike.count({ where: { storeId: fixtures.firstStore } }),
      ]);

      page.on("request", (request) => {
        if (/\/events$|\/like$/.test(request.url())) analyticsRequests.push(request.url());
      });
      await page.goto("/admin/preview");
      await page.getByRole("button", { name: "Curtir Cookie com chocolate", exact: true }).click();
      await page.getByRole("button", { name: "Ver Cookie com chocolate", exact: true }).click();
      await expect(page.getByRole("button", { name: "Adicionar ao carrinho" })).toBeVisible();
      await page.reload();
      await expect(
        page.getByRole("button", { name: "Descurtir Cookie com chocolate", exact: true })
      ).toBeVisible();
      const after = await Promise.all([
        db.metricEvent.count({ where: { storeId: fixtures.firstStore } }),
        db.productLike.count({ where: { storeId: fixtures.firstStore } }),
      ]);

      expect(analyticsRequests).toEqual([]);
      expect(after).toEqual(before);
    } finally {
      await db.$disconnect();
    }
  });

  test("envia uma avaliação da vitrine sem dados pessoais", async ({ page }, testInfo) => {
    const db = testDatabase();
    const message = `Feedback da vitrine ${testInfo.project.name}`;

    try {
      await page.goto(`/${fixtures.firstSlug}`);
      await page.getByRole("button", { name: "Avaliar experiência" }).click();
      await page.getByRole("radio", { name: "Encontrei o que procurava", exact: true }).click();
      await page.getByRole("radio", { name: "5 estrelas" }).click();
      await page.getByLabel("Comentário opcional").fill(message);
      await page.getByRole("button", { name: "Enviar opinião" }).click();

      await expect(page.getByText("Obrigado! Sua opinião foi enviada para a loja.")).toBeVisible();
      await expect.poll(() => db.feedback.count({ where: { message } })).toBe(1);
    } finally {
      await db.feedback.deleteMany({ where: { message } });
      await db.$disconnect();
    }
  });
});
