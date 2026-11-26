import { expect, test } from "@playwright/test";

const storageKey = "tuavitrine:analytics-consent";

test("permite aceitar, persistir e revogar a preferência de métricas", async ({ page }) => {
  await page.goto("/");

  const consent = page.getByRole("region", { name: "Você escolhe sobre as métricas" });

  await expect(consent).toBeVisible();
  await expect(consent.getByRole("button", { name: "Aceitar métricas" })).toBeVisible();
  await expect(consent.getByRole("button", { name: "Recusar métricas" })).toBeVisible();

  await consent.getByRole("button", { name: "Aceitar métricas" }).click();
  await expect(consent).toBeHidden();
  const privacyButton = page.getByRole("button", {
    name: "Revisar preferências de privacidade",
  });

  await expect(privacyButton).toBeVisible();
  expect(
    await privacyButton.evaluate((button) => getComputedStyle(button).backgroundColor)
  ).not.toBe("rgba(0, 0, 0, 0)");

  await page.locator("footer").scrollIntoViewIfNeeded();
  await expect(privacyButton).toBeHidden();
  expect(await page.evaluate((key) => window.localStorage.getItem(key), storageKey)).toContain(
    '"state":"accepted"'
  );

  await page.reload();
  await expect(consent).toBeHidden();
  await page.evaluate(() => window.scrollTo(0, 0));
  await privacyButton.click();
  await page.getByRole("dialog").getByRole("button", { name: "Recusar métricas" }).click();
  expect(await page.evaluate((key) => window.localStorage.getItem(key), storageKey)).toContain(
    '"state":"rejected"'
  );
});

test("recusar não impede a navegação e a versão antiga solicita nova escolha", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Recusar métricas" }).click();
  await page.getByRole("link", { name: "Privacidade", exact: true }).last().click();
  await expect(page).toHaveURL(/\/privacidade$/);
  await expect(
    page.getByRole("heading", { name: "Métricas claras, sob o seu controle" })
  ).toBeVisible();

  await page.evaluate((key) => {
    window.localStorage.setItem(key, JSON.stringify({ version: 0, state: "accepted" }));
  }, storageKey);
  await page.reload();
  await expect(page.getByRole("region", { name: "Você escolhe sobre as métricas" })).toBeVisible();
});
