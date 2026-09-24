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
});
