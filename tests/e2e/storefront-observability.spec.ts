import { gunzipSync } from "node:zlib";
import { expect, test } from "@playwright/test";
import { fixtures, testDatabase } from "../setup/e2e-fixtures";

interface CapturedEvent {
  event: string;
  properties: Record<string, unknown>;
}

test.skip(process.env.E2E_OBSERVABILITY !== "1", "Executar com E2E_OBSERVABILITY=1.");

test("vitrine captura catálogo, detalhe e as quatro origens de WhatsApp sem capturar a prévia", async ({
  page,
  context,
}) => {
  const requests: string[] = [];
  const captured = () =>
    requests.flatMap((body) => (JSON.parse(body) as { batch: CapturedEvent[] }).batch);

  await context.route("https://posthog.invalid/**", async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataBuffer();

      if (body) requests.push(gunzipSync(body).toString("utf8"));
    }

    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  await context.route("https://wa.me/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<title>WhatsApp</title>" })
  );
  await page.addInitScript(() => {
    localStorage.setItem("tua-vitrine:analytics-consent", '{"version":1,"status":"accepted"}');
    Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false });
    Object.defineProperty(Navigator.prototype, "userAgentData", { get: () => undefined });
  });

  const initialDatabase = testDatabase();
  const initialStoreViews = await initialDatabase.metricEvent.count({
    where: { storeId: fixtures.firstStore, type: "STORE_VIEW" },
  });

  await initialDatabase.$disconnect();

  const catalogRequest = page.waitForRequest(
    (request) => request.url().startsWith("https://posthog.invalid/") && request.method() === "POST"
  );

  await page.goto(`/${fixtures.firstSlug}`);
  await catalogRequest;
  expect(requests.join(" ")).toContain('"event":"catalog_viewed"');

  const catalog = captured().find((event) => event.event === "catalog_viewed");

  expect(catalog?.properties).toMatchObject({
    store_id: fixtures.firstStore,
    plan: "FREE",
    $screen_name: `/${fixtures.firstSlug}`,
  });
  expect(captured().filter((event) => event.event === "catalog_viewed")).toHaveLength(1);

  await page.getByRole("link", { name: /Conversar com a loja/ }).click();
  await expect
    .poll(() => captured().find((event) => event.properties.location === "store_hero"))
    .toMatchObject({
      event: "whatsapp_clicked",
      properties: { store_id: fixtures.firstStore, location: "store_hero" },
    });

  await page.getByRole("button", { name: "Ver Cookie com chocolate" }).click();
  await expect
    .poll(() => captured().find((event) => event.event === "product_viewed"))
    .toMatchObject({
      properties: {
        store_id: fixtures.firstStore,
        product_id: fixtures.product,
        $screen_name: `/${fixtures.firstSlug}`,
      },
    });
  await page.getByRole("combobox", { name: "Escolha uma opção" }).click();
  await page.getByRole("option", { name: /Dupla/ }).click();
  await page.getByRole("link", { name: "Perguntar no WhatsApp" }).click();
  await expect
    .poll(() => captured().find((event) => event.properties.location === "product_detail"))
    .toMatchObject({
      properties: {
        store_id: fixtures.firstStore,
        location: "product_detail",
        product_id: fixtures.product,
      },
    });

  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await page.getByRole("button", { name: /Abrir carrinho, 1 itens/ }).click();
  await page.getByRole("button", { name: "Falar com vendedor" }).click();
  await page.waitForURL(/^https:\/\/wa\.me\//);
  await expect
    .poll(() => captured().find((event) => event.properties.location === "cart"))
    .toMatchObject({
      properties: { store_id: fixtures.firstStore, location: "cart", cart_size: 1 },
    });

  const whatsapp = captured().filter((event) => event.event === "whatsapp_clicked");

  expect(whatsapp).toHaveLength(3);

  for (const event of whatsapp) {
    expect(event.properties.$screen_name).toBe(`/${fixtures.firstSlug}`);
    expect(event.properties).not.toHaveProperty("phone");
    expect(event.properties).not.toHaveProperty("message");
    expect(event.properties).not.toHaveProperty("price");
    expect(event.properties).not.toHaveProperty("cart");
  }

  await page.goto(`/${fixtures.secondSlug}`);
  await page.getByRole("button", { name: "Perguntar sobre Caneca artesanal no WhatsApp" }).click();
  await expect
    .poll(() => captured().find((event) => event.properties.location === "product_card"))
    .toMatchObject({
      properties: {
        store_id: fixtures.secondStore,
        location: "product_card",
        product_id: fixtures.secondProduct,
      },
    });

  await context.addCookies([
    {
      name: "tv-local-store",
      value: fixtures.firstStore,
      url: "http://localhost:3100",
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  const beforePreview = captured().filter((event) =>
    ["catalog_viewed", "product_viewed", "whatsapp_clicked"].includes(event.event)
  ).length;

  await page.goto("/admin/preview");
  await page.getByRole("button", { name: "Ver Cookie com chocolate" }).click();
  await expect(page.getByRole("heading", { name: /Cookie com chocolate/ })).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(
    captured().filter((event) =>
      ["catalog_viewed", "product_viewed", "whatsapp_clicked"].includes(event.event)
    )
  ).toHaveLength(beforePreview);

  const db = testDatabase();

  try {
    expect(
      await db.metricEvent.count({ where: { storeId: fixtures.firstStore, type: "STORE_VIEW" } })
    ).toBe(initialStoreViews + 1);
  } finally {
    await db.$disconnect();
  }

  const beforeNavigation = captured().filter((event) => event.event === "catalog_viewed").length;

  await page.goto("/privacidade/cookies?referrer=referrer-sentinel");
  await page.goto(`/${fixtures.firstSlug}?q=search-sentinel`);
  await expect
    .poll(() => captured().filter((event) => event.event === "catalog_viewed").length)
    .toBeGreaterThan(beforeNavigation);
  expect(requests.join(" ")).not.toContain("referrer-sentinel");
  expect(requests.join(" ")).not.toContain("search-sentinel");
});
