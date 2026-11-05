import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { expect, test } from "@playwright/test";
import { fixtures } from "../setup/e2e-fixtures";

test.skip(process.env.E2E_OBSERVABILITY !== "1", "Executar com E2E_OBSERVABILITY=1.");

test("replay exige aceite, mascara dados e para na prévia e após revogação", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  const payloads: string[] = [];

  await context.route("https://posthog.invalid/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (request.method() === "POST") {
      const body = request.postDataBuffer();

      if (body) {
        payloads.push(
          body[0] === 0x1f && body[1] === 0x8b ? gunzipSync(body).toString() : body.toString()
        );
      }

      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });

      return;
    }

    if (pathname.endsWith("/config.js")) {
      await route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: `window._POSTHOG_REMOTE_CONFIG = { phc_e2e_test_only: { config: { sessionRecording: { sampleRate: "1" }, hasFeatureFlags: false } } };`,
      });

      return;
    }

    if (pathname.endsWith(".js")) {
      const filename = pathname.split("/").at(-1);

      if (filename && /^[a-z0-9-]+\.js$/.test(filename)) {
        await route.fulfill({
          status: 200,
          contentType: "application/javascript",
          path: resolve("node_modules/posthog-js/dist", filename),
        });

        return;
      }
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ sessionRecording: { sampleRate: "1" }, capturePerformance: false }),
    });
  });

  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false });
    Object.defineProperty(Navigator.prototype, "userAgentData", { get: () => undefined });
  });
  await page.goto(`/${fixtures.firstSlug}?q=url-sentinel`);
  await expect(page.getByRole("region", { name: "Sua escolha de privacidade" })).toBeVisible();
  expect(payloads.join(" ")).not.toContain('"$snapshot"');

  await page.getByRole("button", { name: "Eu concordo" }).click();
  await page.evaluate(() => {
    const sensitive = document.createElement("div");

    sensitive.textContent = "visible-sentinel";
    sensitive.setAttribute("data-secret", "attribute-sentinel");
    document.body.append(sensitive);

    const hidden = document.createElement("input");

    hidden.type = "hidden";
    hidden.value = "hidden-sentinel";
    document.body.append(hidden);
  });
  await page.mouse.click(100, 200);
  await expect.poll(() => payloads.join(" "), { timeout: 20000 }).toContain('"$snapshot"');
  expect(payloads.join(" ")).not.toContain("url-sentinel");
  expect(payloads.join(" ")).not.toContain("visible-sentinel");
  expect(payloads.join(" ")).not.toContain("attribute-sentinel");
  expect(payloads.join(" ")).not.toContain("hidden-sentinel");

  await context.addCookies([
    {
      name: "tv-local-store",
      value: fixtures.firstStore,
      url: "http://localhost:3100",
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  await page.goto("/admin/preview");
  await expect(page.getByRole("button", { name: "Ver Cookie com chocolate" })).toBeVisible();
  const beforePreview = payloads.join(" ");

  await page.getByRole("button", { name: "Ver Cookie com chocolate" }).click();
  await page.waitForTimeout(1500);
  expect(payloads.join(" ")).toBe(beforePreview);

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Preferências de privacidade" }).click();
  await page.getByRole("button", { name: "Revogar consentimento" }).click();
  const afterRevocation = payloads.join(" ");

  await page.goto(`/${fixtures.firstSlug}`);
  await page.waitForTimeout(1500);
  expect(payloads.join(" ")).toBe(afterRevocation);
});
