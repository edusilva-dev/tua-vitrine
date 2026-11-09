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

test("encerra o indicador de navegação ao voltar da prévia", async ({
  context,
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "O fluxo é coberto uma vez no layout desktop.");

  await context.addCookies([
    {
      name: "tv-local-store",
      value: fixtures.firstStore,
      url: "http://localhost:3100",
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  await page.goto("/admin");

  await Promise.all([
    page.waitForURL(/\/admin\/preview$/, { timeout: 30_000 }),
    page.getByRole("link", { name: "Ver minha vitrine" }).click(),
  ]);

  await Promise.all([
    page.waitForURL(/\/admin$/, { timeout: 30_000 }),
    page.getByRole("link", { name: "Voltar ao painel" }).click(),
  ]);
  await expect(page.getByRole("status", { name: "Carregando página" })).toHaveCount(0);
});

test("destaca as notificações por status no topo central", async ({ context, page }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await context.addCookies([
    {
      name: "tv-local-store",
      value: fixtures.firstStore,
      url: "http://localhost:3100",
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  await page.goto("/admin/settings");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Copiar link" }).click();

  const toaster = page.locator("[data-sonner-toaster]");
  const toast = page.locator("[data-sonner-toast][data-type='success']");

  await expect(toast).toBeVisible();
  await expect(toast).toHaveAttribute("data-rich-colors", "true");
  await expect(toaster).toHaveAttribute("data-y-position", "top");
  await expect(toaster).toHaveAttribute("data-x-position", "center");

  const toastStyle = await toast.evaluate((element) => {
    const style = getComputedStyle(element);

    return {
      backgroundColor: style.backgroundColor,
      borderColor: style.borderColor,
      borderWidth: style.borderWidth,
      color: style.color,
    };
  });

  expect(toastStyle).toEqual({
    backgroundColor: "rgb(238, 248, 240)",
    borderColor: "rgb(47, 125, 78)",
    borderWidth: "2px",
    color: "rgb(31, 99, 59)",
  });
});
