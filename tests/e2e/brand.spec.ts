import { expect, test } from "@playwright/test";

test("mantém a marca acessível no cabeçalho e na autenticação, inclusive no celular", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const brand = page.locator("header").getByRole("link", { name: "tua vitrine" });

  await expect(brand).toBeVisible();
  await expect(brand.getByRole("img", { name: "tua vitrine" })).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(brand).toBeFocused();
  await expect(page).toHaveTitle("tua vitrine");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerWidth)
  );

  await page.screenshot({ path: testInfo.outputPath("home.png"), fullPage: true });

  const icon = page.locator('link[rel="icon"][type="image/svg+xml"]');
  const iconUrl = await icon.getAttribute("href");

  expect(iconUrl).toBeTruthy();
  const response = await page.request.get(iconUrl ?? "/icon.svg");

  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/svg+xml");

  await page.goto("/recuperar-senha");
  await expect(page.getByRole("link", { name: "tua vitrine" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("auth.png"), fullPage: true });
  await expect(page.getByText("Seu negócio mais perto", { exact: false })).toHaveCount(0);
});
