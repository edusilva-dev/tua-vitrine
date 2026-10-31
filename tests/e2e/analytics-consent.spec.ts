import { expect, test } from "@playwright/test";
import { fixtures, testDatabase } from "../setup/e2e-fixtures";

const preferenceKey = "tua-vitrine:analytics-consent";

declare global {
  interface Window {
    analyticsConsentProbe: typeof import("../fixtures/analytics-consent-browser");
  }
}

test("aceita, persiste e revoga pelas preferências acessíveis", async ({
  page,
  context,
}, testInfo) => {
  const telemetryRequests: string[] = [];

  await context.route(/https?:\/\/[^/]*posthog\.com\//, async (route) => {
    telemetryRequests.push(route.request().url());
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  await page.goto("/privacidade/cookies", { waitUntil: "domcontentloaded" });
  const banner = page.getByRole("region", { name: "Sua escolha de privacidade" });

  await expect(banner).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  );
  await page.screenshot({ path: testInfo.outputPath("consent-banner.png"), fullPage: true });
  const accept = banner.getByRole("button", { name: "Aceitar análises" });
  const reject = banner.getByRole("button", { name: "Rejeitar análises" });

  expect(await accept.getAttribute("class")).toBe(await reject.getAttribute("class"));
  await expect(accept).toBeEnabled();
  await accept.focus();
  await page.keyboard.press("Enter");
  await expect(banner).toHaveCount(0);
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), preferenceKey))
    .toBe('{"version":1,"status":"accepted"}');
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(banner).toHaveCount(0);
  const preferences = page.getByRole("button", { name: "Preferências de privacidade" });

  await preferences.click();
  const dialog = page.getByRole("dialog", { name: "Preferências de privacidade" });

  await expect(dialog.getByRole("status")).toHaveText("Escolha atual: aceita.");
  await page.screenshot({ path: testInfo.outputPath("consent-settings.png") });
  await dialog.getByRole("button", { name: "Rejeitar análises" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(preferences).toBeFocused();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(banner).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), preferenceKey)).toBe(
    '{"version":1,"status":"rejected"}'
  );
  expect(await context.cookies()).toEqual([]);
  expect(
    await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("ph_")))
  ).toEqual([]);
  expect(telemetryRequests).toEqual([]);
});

test("rejeita sem bloquear navegação e solicita uma versão antiga novamente", async ({ page }) => {
  await page.addInitScript((key) => {
    localStorage.setItem(key, '{"version":0,"status":"accepted"}');
  }, preferenceKey);
  await page.goto("/privacidade/cookies");
  const banner = page.getByRole("region", { name: "Sua escolha de privacidade" });

  await expect(banner).toBeVisible();
  await banner.getByRole("button", { name: "Rejeitar análises" }).click();
  await expect(banner).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Voltar para tua vitrine" })).toBeEnabled();
  await page.getByRole("button", { name: "Preferências de privacidade" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("escolha desconhecida mantém o menu do painel e os controles acessíveis", async ({
  page,
  context,
}, testInfo) => {
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
  const banner = page.getByRole("region", { name: "Sua escolha de privacidade" });

  await expect(banner).toBeVisible();
  await banner.getByRole("button", { name: "Aceitar análises" }).click({ trial: true });
  await page
    .getByRole("navigation", { name: "Menu principal" })
    .getByRole("link", {
      name: "Meus produtos",
      exact: true,
    })
    .click({ trial: true });
  await page.screenshot({ path: testInfo.outputPath("consent-admin.png") });
  // Onboarding can render without AppShell. The offset must follow the actual
  // sidebar, including its removal, rather than the current administrative URL.
  await page.locator(".admin-sidebar").evaluate((sidebar) => sidebar.remove());
  await expect(banner).toHaveCSS("margin-left", "0px");
  await banner.getByRole("button", { name: "Rejeitar análises" }).click();
  await expect(page.getByRole("heading", { name: /^Meus produtos/ })).toBeVisible();
  await page.getByRole("button", { name: "Preferências de privacidade" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("página de cookies preserva a vitrine com slug privacidade", async ({ page }) => {
  const db = testDatabase();

  try {
    await db.store.update({ where: { id: fixtures.firstStore }, data: { slug: "privacidade" } });
    await page.goto("/privacidade");
    await expect(
      page.getByRole("heading", { name: "Privacidade e cookies", exact: true })
    ).toHaveCount(0);
    await expect(page.getByText("Café de teste", { exact: true }).first()).toBeVisible();
    await page.getByRole("link", { name: "Detalhes de privacidade e cookies" }).click();
    await expect(page).toHaveURL("/privacidade/cookies");
    await expect(
      page.getByRole("heading", { name: "Privacidade e cookies", exact: true })
    ).toBeVisible();
  } finally {
    await db.store.update({
      where: { id: fixtures.firstStore },
      data: { slug: fixtures.firstSlug },
    });
    await db.$disconnect();
  }
});

for (const scenario of [
  "success",
  "rejected_retry",
  "reaccepted_retry",
  "shutdown_retry",
] as const) {
  test(`SDK real bloqueia captura e retries revogados: ${scenario}`, async ({ page, context }) => {
    // A separate browser bundle exercises the production adapters with a fake staging
    // project. Every request is fulfilled locally, never sent to PostHog.
    const bundle = await Bun.build({
      entrypoints: ["tests/fixtures/analytics-consent-browser.ts"],
      target: "browser",
      format: "esm",
      define: {
        "process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN": '"phc_consent_test_only"',
        "process.env.NEXT_PUBLIC_POSTHOG_HOST": '"https://posthog.invalid"',
        "process.env.NEXT_PUBLIC_APP_ENV": '"staging"',
        "process.env.NEXT_PUBLIC_POSTHOG_DISABLED": '"0"',
        "process.env.NODE_ENV": '"development"',
      },
    });
    const output = bundle.outputs[0];

    if (!bundle.success || !output) throw new Error("Falha ao preparar o SDK de teste.");

    const requests: string[] = [];
    let firstPost = true;

    await context.route("https://posthog.invalid/**", async (route) => {
      requests.push(route.request().url());
      const failingPost =
        scenario !== "success" && firstPost && route.request().method() === "POST";

      if (route.request().method() === "POST") firstPost = false;

      await route.fulfill({
        status: failingPost ? 503 : 200,
        contentType: "application/json",
        body: "{}",
      });
    });
    // The SDK deliberately drops automated-browser events. Simulate a normal visitor
    // only inside this isolated test; production bot filtering stays enabled.
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false });
      Object.defineProperty(Navigator.prototype, "userAgentData", { get: () => undefined });
    });
    await page.goto("/privacidade/cookies");
    await page.evaluate(
      async (source) => {
        const moduleUrl = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));

        try {
          window.analyticsConsentProbe = await import(moduleUrl);
          window.analyticsConsentProbe.initializeBrowserAnalyticsConsent();
        } finally {
          URL.revokeObjectURL(moduleUrl);
        }
      },
      await output.text()
    );
    await page.evaluate(() => {
      window.analyticsConsentProbe.analytics.catalogViewed({
        storeId: "22222222-2222-4222-8222-222222222222",
        plan: "FREE",
      });
    });
    expect(requests).toEqual([]);
    await page.evaluate(() =>
      window.analyticsConsentProbe.browserAnalyticsConsent.choose("rejected")
    );
    expect(requests).toEqual([]);
    await page.clock.install();
    await page.evaluate(() =>
      window.analyticsConsentProbe.browserAnalyticsConsent.choose("accepted")
    );
    expect(
      await page.evaluate(() => window.analyticsConsentProbe.browserAnalyticsConsent.hasConsent())
    ).toBe(true);
    const eventRequest = page.waitForRequest(
      (request) =>
        request.url().startsWith("https://posthog.invalid/") && request.method() === "POST"
    );
    const eventResponse = page.waitForResponse(
      (response) =>
        response.url().startsWith("https://posthog.invalid/") &&
        response.request().method() === "POST"
    );

    await page.evaluate(() => {
      window.analyticsConsentProbe.analytics.catalogViewed({
        storeId: "22222222-2222-4222-8222-222222222222",
        plan: "FREE",
      });
    });
    await eventRequest;

    const response = await eventResponse;

    expect(response.status()).toBe(scenario === "success" ? 200 : 503);
    await response.finished();
    await page.evaluate(() => Promise.resolve());

    if (scenario === "success")
      await page.evaluate(() => {
        const probe = window.analyticsConsentProbe;

        probe.analyticsIdentity.identify("aB3dE5fG7hJ9kL2mN4pQ6rS8tV1xY3zW");
        probe.analyticsIdentity.reset();
      });

    expect(
      await page.evaluate(() => window.analyticsConsentProbe.browserAnalyticsConsent.hasConsent())
    ).toBe(true);
    await page.evaluate(() =>
      window.analyticsConsentProbe.browserAnalyticsConsent.choose("rejected")
    );
    const requestsAtRevocation = requests.length;

    if (scenario === "reaccepted_retry") {
      await page.evaluate(() =>
        window.analyticsConsentProbe.browserAnalyticsConsent.choose("accepted")
      );
    }

    if (scenario === "shutdown_retry") {
      await page.evaluate(() => window.analyticsConsentProbe.shutdownBrowserAnalyticsProbe());
    }

    await page.clock.fastForward(10000);
    expect(requests).toHaveLength(requestsAtRevocation);
    await page.evaluate(() =>
      window.analyticsConsentProbe.browserAnalyticsConsent.choose("rejected")
    );
    await page.evaluate(() => {
      const probe = window.analyticsConsentProbe;

      probe.analytics.catalogViewed({
        storeId: "22222222-2222-4222-8222-222222222222",
        plan: "FREE",
      });
      probe.analyticsIdentity.identify("Z9yX7wV5tS3rQ1pN8mL6kJ4hG2fE0dCb");
    });
    await page.clock.fastForward(10000);
    expect(requests).toHaveLength(requestsAtRevocation);
    expect(
      await page.evaluate(() => Object.keys(localStorage).filter((key) => /^(ph_|__ph_)/.test(key)))
    ).toEqual([]);
    expect(await context.cookies()).toEqual([]);

    if (scenario === "shutdown_retry") return;

    const freshEvent = page.waitForRequest(
      (request) =>
        request.url().startsWith("https://posthog.invalid/") && request.method() === "POST"
    );

    await page.evaluate(() => {
      const probe = window.analyticsConsentProbe;

      probe.browserAnalyticsConsent.choose("accepted");
      probe.analytics.catalogViewed({
        storeId: "22222222-2222-4222-8222-222222222222",
        plan: "FREE",
      });
    });
    expect((await freshEvent).url()).not.toContain("retry_count");
  });
}
