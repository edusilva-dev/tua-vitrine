import { expect, test } from "@playwright/test";
import { fixtures } from "../setup/e2e-fixtures";

test("oferece navegação adequada ao tamanho da tela", async ({ context, page }, testInfo) => {
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

  const menuTrigger = page.getByRole("button", { name: "Abrir menu principal" });
  const desktopNavigation = page.locator("aside").getByRole("navigation", {
    name: "Menu principal",
  });

  if (testInfo.project.name === "mobile") {
    await expect(menuTrigger).toBeVisible();
    await expect(desktopNavigation).toBeHidden();

    const triggerBox = await menuTrigger.boundingBox();

    expect(triggerBox?.width).toBeGreaterThanOrEqual(44);
    expect(triggerBox?.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      await page.evaluate(() => window.innerWidth)
    );

    await menuTrigger.click();
    const dialog = page.getByRole("dialog");

    await expect(dialog).toBeVisible();

    const mobileNavigation = dialog.getByRole("navigation", { name: "Menu principal" });
    const links = mobileNavigation.getByRole("link");

    await expect(links).toHaveCount(7);
    await expect(mobileNavigation.getByRole("link", { name: "Suporte" })).toHaveAttribute(
      "aria-current",
      "page"
    );

    for (const link of await links.all()) {
      const linkBox = await link.boundingBox();

      expect(linkBox?.height).toBeGreaterThanOrEqual(44);
    }

    await expect(dialog.getByRole("link", { name: "Ver minha vitrine" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(menuTrigger).toBeFocused();

    await menuTrigger.click();
    await dialog.getByRole("link", { name: "Meus produtos" }).click();
    await expect(page).toHaveURL(/\/admin\/products$/);
    await expect(dialog).toBeHidden();

    return;
  }

  await expect(menuTrigger).toBeHidden();
  await expect(desktopNavigation).toBeVisible();
  await expect(desktopNavigation.getByRole("link", { name: "Suporte" })).toHaveAttribute(
    "aria-current",
    "page"
  );
  await expect(page.getByText("Painel do lojista")).toBeVisible();
});
