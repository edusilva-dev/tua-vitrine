import { expect, test } from "@playwright/test";

const storageKey = "tuavitrine:analytics-consent";

test("permite aceitar, persistir e revogar a preferência de métricas", async ({ page }) => {
  await page.goto("/");

  const consent = page.getByRole("region", { name: "Você escolhe sobre as métricas" });

  await expect(consent).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Revisar preferências de privacidade" })
  ).toBeHidden();

  await page.goto("/admin");
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

  expect(await page.evaluate((key) => window.localStorage.getItem(key), storageKey)).toContain(
    '"state":"accepted"'
  );

  await page.reload();
  await expect(consent).toBeHidden();
  await privacyButton.click();
  await page.getByRole("dialog").getByRole("button", { name: "Recusar métricas" }).click();
  expect(await page.evaluate((key) => window.localStorage.getItem(key), storageKey)).toContain(
    '"state":"rejected"'
  );
});

test("recusar não impede a navegação e a versão antiga solicita nova escolha", async ({ page }) => {
  await page.goto("/admin");
  await page.getByRole("button", { name: "Recusar métricas" }).click();
  await expect(page.getByRole("main")).toBeVisible();

  await page.goto("/privacidade");
  await expect(page).toHaveURL(/\/privacidade$/);
  await expect(
    page.getByRole("heading", { name: "Métricas claras, sob o seu controle" })
  ).toBeVisible();

  await page.evaluate((key) => {
    window.localStorage.setItem(key, JSON.stringify({ version: 0, state: "accepted" }));
  }, storageKey);
  await page.goto("/admin");
  await expect(page.getByRole("region", { name: "Você escolhe sobre as métricas" })).toBeVisible();
});
