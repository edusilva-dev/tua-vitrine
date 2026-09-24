import { randomUUID } from "node:crypto";
import { readdir, readFile, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

const origin = "http://localhost:3200";
const runId = randomUUID().slice(0, 8);
const emails = [`auth-e2e-${runId}-owner@example.test`, `auth-e2e-${runId}-other@example.test`];
const slugs = [`auth-e2e-${runId}-owner`, `auth-e2e-${runId}-other`];
const password = "Initial-auth-password-2026!";
const newPassword = "Changed-auth-password-2026!";
const outbox = resolve("work/auth-test-outbox");

function apiUrl(pathname: string) {
  return new URL(pathname, `${origin}/`).toString();
}

async function mailLink(to: string, subject: string) {
  let link = "";

  await expect
    .poll(async () => {
      const files = await readdir(outbox).catch(() => [] as string[]);

      for (const file of files) {
        const message = JSON.parse(await readFile(resolve(outbox, file), "utf8")) as {
          to: string;
          subject: string;
          text: string;
        };

        if (message.to === to && message.subject === subject) {
          link = message.text.match(/https?:\/\/\S+/)?.[0] ?? "";

          return Boolean(link);
        }
      }

      return false;
    })
    .toBe(true);

  return link;
}

async function browserApi<T>(
  page: Page,
  pathname: string,
  method: "POST" | "PUT",
  data: unknown,
  headers: Record<string, string> = {}
) {
  const result = await page.evaluate(
    async ({ url, method: requestMethod, data: requestData, headers: requestHeaders }) => {
      const response = await fetch(url, {
        method: requestMethod,
        headers: { "content-type": "application/json", ...requestHeaders },
        body: JSON.stringify(requestData),
      });

      return {
        body: await response.text(),
        status: response.status,
        statusText: response.statusText,
        url: response.url,
      };
    },
    { url: apiUrl(pathname), method, data, headers }
  );

  expect(
    result.status,
    `${method} ${result.url} retornou ${result.status} ${result.statusText}. ` +
      `Corpo: ${result.body || "<vazio>"}`
  ).toBe(method === "POST" ? 201 : 200);

  return JSON.parse(result.body) as T;
}

async function createCatalog(page: Page, slug: string) {
  const store = await browserApi<{ data: { id: string } }>(
    page,
    "/api/admin/onboarding/store",
    "PUT",
    { name: "Loja de teste autenticada", slug }
  );

  await browserApi(page, "/api/admin/onboarding/whatsapp", "PUT", {
    whatsapp: "+5511999999999",
  });
  const createdProduct = await browserApi<{ data: { id: string } }>(
    page,
    "/api/admin/products",
    "POST",
    {
      name: `Produto ${slug}`,
      description: "Teste de autorização",
      priceCents: 1200,
      available: true,
      categoryName: "Teste",
      assetIds: [],
      variants: [],
    },
    { "idempotency-key": randomUUID() }
  );

  return { storeId: store.data.id, productId: createdProduct.data.id };
}

async function removeFixtureMessages() {
  const files = await readdir(outbox).catch(() => [] as string[]);

  for (const file of files) {
    const path = resolve(outbox, file);

    if (dirname(path) !== outbox) continue;

    try {
      const message = JSON.parse(await readFile(path, "utf8")) as { to?: unknown };

      if (typeof message.to === "string" && emails.includes(message.to)) await unlink(path);
    } catch {
      // Arquivos que não pertencem a esta execução não devem impedir nem ampliar a limpeza.
    }
  }
}

test.afterAll(async () => {
  const url = process.env.E2E_DATABASE_URL;

  if (!url || new URL(url).pathname !== "/tuavitrine_test") throw new Error("Banco inválido.");

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

  try {
    await db.store.deleteMany({ where: { slug: { in: slugs } } });
    await db.user.deleteMany({ where: { email: { in: emails } } });
  } finally {
    await db.$disconnect();
    await removeFixtureMessages();
  }
});

test("conta verificada, isolamento por sessão e recuperação com revogação", async ({
  page,
  browser,
}) => {
  const ownerEmail = emails[0];
  const otherEmail = emails[1];
  const ownerSlug = slugs[0];
  const otherSlug = slugs[1];

  if (!ownerEmail || !otherEmail || !ownerSlug || !otherSlug) throw new Error("Fixtures ausentes.");

  const anonymous = await browser.newContext({ baseURL: origin });

  expect((await anonymous.request.get("/api/admin/products")).status()).toBe(401);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/entrar\?callbackURL=%2Fadmin$/);
  await page.goto("/cadastro");
  await page.screenshot({ path: "work/auth-signup.png", fullPage: true });
  await page.getByLabel("Seu nome").fill("Lojista de teste");
  await page.getByLabel("E-mail", { exact: true }).fill(ownerEmail);
  await page.getByLabel("Nova senha", { exact: true }).fill(password);
  await page.getByLabel("Confirme a senha").fill(password);
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Confira seu e-mail");
  expect((await page.request.get("/api/admin/products")).status()).toBe(401);
  await page.goto(await mailLink(ownerEmail, "Confirme seu e-mail"));
  await expect(page).toHaveURL(/\/admin/);
  const ownerCatalog = await createCatalog(page, ownerSlug);

  await page.goto("/admin");
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  expect((await page.request.get("/api/admin/products")).status()).toBe(401);
  await page.getByLabel("E-mail", { exact: true }).fill(ownerEmail);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/admin/);

  const other = await browser.newContext({ baseURL: origin });
  const signup = await other.request.post("/api/auth/sign-up/email", {
    headers: { origin },
    data: { name: "Outro lojista", email: otherEmail, password, callbackURL: "/admin" },
  });

  expect(signup.ok()).toBe(true);
  const otherPage = await other.newPage();

  await otherPage.goto(await mailLink(otherEmail, "Confirme seu e-mail"));
  await expect(otherPage).toHaveURL(/\/admin/);
  const otherCatalog = await createCatalog(otherPage, otherSlug);

  for (const method of ["get", "patch", "delete"] as const) {
    const result = await other.request[method](`/api/admin/products/${ownerCatalog.productId}`, {
      headers: { origin },
      ...(method === "patch"
        ? {
            data: {
              name: "Produto invadido",
              description: "Teste",
              priceCents: 1,
              available: true,
              categoryName: "",
              assetIds: [],
              variants: [],
            },
          }
        : {}),
    });

    expect(result.status()).toBe(404);
  }

  expect(
    (
      await other.request.put("/api/admin/context", {
        headers: { origin },
        data: { storeId: ownerCatalog.storeId },
      })
    ).status()
  ).toBe(404);
  await other.addCookies([{ name: "tv-local-store", value: ownerCatalog.storeId, url: origin }]);
  expect((await other.request.get(`/api/admin/products/${ownerCatalog.productId}`)).status()).toBe(
    404
  );
  expect((await other.request.get(`/api/admin/products/${otherCatalog.productId}`)).status()).toBe(
    200
  );
  await other.addCookies([{ name: "tv-store", value: ownerCatalog.storeId, url: origin }]);
  expect((await other.request.get("/api/admin/products")).status()).toBe(404);
  await other.addCookies([{ name: "tv-store", value: otherCatalog.storeId, url: origin }]);
  expect(
    (
      await other.request.patch("/api/admin/store", {
        headers: { origin: "https://attacker.example" },
        data: {},
      })
    ).status()
  ).toBe(403);

  const previousSession = await page.context().storageState();
  const recovery = await anonymous.newPage();

  await recovery.goto("/recuperar-senha");
  await recovery.getByLabel("E-mail", { exact: true }).fill(ownerEmail);
  await recovery.getByRole("button", { name: "Enviar instruções" }).click();
  await expect(recovery.getByRole("status")).toContainText("Se houver uma conta elegível");
  await recovery.goto(await mailLink(ownerEmail, "Redefina sua senha"));
  await expect(recovery).toHaveURL(/\/redefinir-senha\?token=/);
  const token = new URL(recovery.url()).searchParams.get("token");

  expect(token).toBeTruthy();
  await recovery.getByLabel("Nova senha", { exact: true }).fill(newPassword);
  await recovery.getByLabel("Confirme a senha").fill(newPassword);
  await recovery.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(recovery.getByRole("status")).toContainText("Senha alterada");
  const stale = await browser.newContext({ baseURL: origin, storageState: previousSession });

  expect((await stale.request.get("/api/admin/products")).status()).toBe(401);
  expect(
    (
      await anonymous.request.post("/api/auth/reset-password", {
        headers: { origin },
        data: { token, newPassword: password },
      })
    ).ok()
  ).toBe(false);
  await recovery.getByRole("link", { name: "Voltar para entrar" }).click();
  await recovery.getByLabel("E-mail", { exact: true }).fill(ownerEmail);
  await recovery.getByLabel("Senha", { exact: true }).fill(newPassword);
  await recovery.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(recovery).toHaveURL(/\/admin/);
  await recovery.getByRole("button", { name: "Sair da conta" }).click();
  await expect(recovery).toHaveURL(/\/entrar$/);
  await recovery.getByLabel("E-mail", { exact: true }).fill(otherEmail);
  await recovery.getByLabel("Senha", { exact: true }).fill(password);
  await recovery.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(recovery).toHaveURL(/\/admin/);
  expect(
    (await recovery.request.get(`/api/admin/products/${otherCatalog.productId}`)).status()
  ).toBe(200);
  expect(
    (await recovery.request.get(`/api/admin/products/${ownerCatalog.productId}`)).status()
  ).toBe(404);
  const url = process.env.E2E_DATABASE_URL;

  if (!url || new URL(url).pathname !== "/tuavitrine_test") throw new Error("Banco inválido.");

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

  try {
    await db.session.updateMany({
      where: { user: { email: otherEmail } },
      data: { expiresAt: new Date(Date.now() - 60000) },
    });
    expect((await recovery.request.get("/api/admin/products")).status()).toBe(401);
  } finally {
    await db.$disconnect();
  }

  await Promise.all([anonymous.close(), other.close(), stale.close()]);
});
