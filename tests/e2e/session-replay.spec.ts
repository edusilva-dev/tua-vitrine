import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { expect, test } from "@playwright/test";
import { fixtures } from "../setup/e2e-fixtures";

interface ReplayChunk {
  type: number;
  cv?: string;
  data: unknown;
}

interface CapturedEvent {
  event: string;
  properties: Record<string, unknown>;
}

function replayChunks(payloads: string[]) {
  return payloads.flatMap((payload) => {
    const parsed = JSON.parse(payload) as CapturedEvent & { batch?: CapturedEvent[] };
    const events = parsed.batch ?? [parsed];

    return events.flatMap((event) => {
      const data = event.properties.$snapshot_data;

      return event.event === "$snapshot" && Array.isArray(data) ? (data as ReplayChunk[]) : [];
    });
  });
}

function decodedReplay(chunks: ReplayChunk[]) {
  return chunks
    .map((chunk) => {
      const parts = [JSON.stringify(chunk)];

      if (chunk.cv !== "2024-10") return parts.join(" ");

      if (typeof chunk.data === "string") {
        parts.push(gunzipSync(Buffer.from(chunk.data, "latin1")).toString());

        return parts.join(" ");
      }

      if (chunk.data && typeof chunk.data === "object") {
        for (const [key, value] of Object.entries(chunk.data)) {
          if (
            ["texts", "attributes", "adds", "removes"].includes(key) &&
            typeof value === "string"
          ) {
            parts.push(gunzipSync(Buffer.from(value, "latin1")).toString());
          }
        }
      }

      return parts.join(" ");
    })
    .join(" ");
}

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
  await expect
    .poll(() => replayChunks(payloads).some((chunk) => chunk.type === 2), { timeout: 20000 })
    .toBe(true);
  const mutationsBeforeChange = replayChunks(payloads).filter(
    (chunk) =>
      chunk.type === 3 &&
      typeof chunk.data === "object" &&
      chunk.data !== null &&
      "source" in chunk.data &&
      chunk.data.source === 0
  ).length;

  await page.evaluate(() => {
    const sensitive = document.querySelector("[data-secret]");

    if (!sensitive) throw new Error("Elemento sentinela ausente.");

    sensitive.textContent = "mutation-sentinel";
    sensitive.setAttribute("data-secret", "mutation-attribute-sentinel");
  });
  await page.mouse.click(120, 220);
  await expect
    .poll(
      () =>
        replayChunks(payloads).filter(
          (chunk) =>
            chunk.type === 3 &&
            typeof chunk.data === "object" &&
            chunk.data !== null &&
            "source" in chunk.data &&
            chunk.data.source === 0
        ).length > mutationsBeforeChange,
      { timeout: 20000 }
    )
    .toBe(true);
  const replayPayload = `${payloads.join(" ")} ${decodedReplay(replayChunks(payloads))}`;

  for (const sentinel of [
    "url-sentinel",
    "visible-sentinel",
    "attribute-sentinel",
    "hidden-sentinel",
    "mutation-sentinel",
    "mutation-attribute-sentinel",
  ]) {
    expect(replayPayload).not.toContain(sentinel);
  }

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
