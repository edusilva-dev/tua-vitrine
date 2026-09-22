import { expect, test } from "@playwright/test";

test.describe("vitrine pública", () => {
  test("seleciona variante e preserva o carrinho ao recarregar", async ({ page }) => {
    await page.goto("/cafe-do-bairro");

    await expect(
      page.getByRole("heading", { name: "Café fresco e boas conversas." })
    ).toBeVisible();
    await page.getByRole("button", { name: "Ver Cookie com chocolate" }).click();
    await expect(page.getByRole("heading", { name: "Cookie com chocolate" })).toBeVisible();

    await page.getByRole("combobox", { name: "Escolha uma opção" }).click();
    await page.getByRole("option", { name: /Dupla/ }).click();
    await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();

    const cart = page.getByRole("button", { name: /Abrir carrinho, 1 itens/ });

    await expect(cart).toBeVisible();
    await page.reload();
    await expect(cart).toBeVisible();

    await cart.click();
    await expect(page.getByRole("heading", { name: "Seu carrinho" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cookie com chocolate" })).toBeVisible();
  });

  test("se mantém utilizável no celular", async ({ page }) => {
    await page.goto("/cafe-do-bairro");

    await expect(page.getByRole("button", { name: /Abrir carrinho/ })).toBeVisible();
    await page.getByRole("button", { name: "Ver Bolo caseiro de laranja" }).click();
    await expect(page.getByRole("button", { name: "Adicionar ao carrinho" })).toBeVisible();
  });
});
