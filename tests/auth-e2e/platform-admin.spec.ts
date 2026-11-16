import { randomUUID } from "node:crypto";
import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { PrismaClient } from "../../generated/prisma/client";

const origin = "http://localhost:3200";
const runId = randomUUID().slice(0, 8);
const password = "Platform-admin-test-2026!";
const ids = {
  adminUser: `platform-e2e-admin-${runId}`,
  commonUser: `platform-e2e-common-${runId}`,
  revokedUser: `platform-e2e-revoked-${runId}`,
};
const emails = {
  admin: `platform-admin.${runId}@example.test`,
  common: `platform-common.${runId}@example.test`,
  revoked: `platform-revoked.${runId}@example.test`,
};
let adminGrantId = "";
let storeId = "";
let supportRequestId = "";

function database() {
  const url = process.env.E2E_DATABASE_URL;

  if (!url || new URL(url).pathname !== "/tuavitrine_test") throw new Error("Banco inválido.");

  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

async function createUser(
  db: ReturnType<typeof database>,
  input: { id: string; name: string; email: string; passwordHash: string }
) {
  return db.user.create({
    data: {
      id: input.id,
      name: input.name,
      email: input.email,
      emailVerified: true,
      accounts: {
        create: {
          id: randomUUID(),
          accountId: input.id,
          providerId: "credential",
          password: input.passwordHash,
        },
      },
    },
  });
}

async function signIn(context: BrowserContext, email: string) {
  const response = await context.request.post("/api/auth/sign-in/email", {
    headers: { origin },
    data: { email, password },
  });

  expect(response.status()).toBe(200);
}

async function expectDenied(context: BrowserContext) {
  expect((await context.request.get("/api/super-admin/session")).status()).toBe(404);
  expect((await context.request.get("/api/super-admin/stores")).status()).toBe(404);
  expect((await context.request.get(`/api/super-admin/stores/${storeId}`)).status()).toBe(404);
  expect(
    (
      await context.request.post(`/api/super-admin/stores/${storeId}/actions/block`, {
        headers: { origin },
        data: {
          reason: "Tentativa sem autorização suficiente",
          confirmed: true,
        },
      })
    ).status()
  ).toBe(404);
}

async function expectNotFound(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Essa vitrine não está por aqui." })
  ).toBeVisible();
}

test.beforeAll(async () => {
  const db = database();
  const passwordHash = await hashPassword(password);

  try {
    await db.rateLimit.deleteMany();
    await createUser(db, {
      id: ids.adminUser,
      name: "Administrador E2E",
      email: emails.admin,
      passwordHash,
    });
    await createUser(db, {
      id: ids.commonUser,
      name: "Lojista comum E2E",
      email: emails.common,
      passwordHash,
    });
    await createUser(db, {
      id: ids.revokedUser,
      name: "Administrador revogado E2E",
      email: emails.revoked,
      passwordHash,
    });
    const admin = await db.platformAdmin.create({ data: { userId: ids.adminUser } });

    await db.platformAdmin.create({
      data: { userId: ids.revokedUser, revokedAt: new Date() },
    });
    const store = await db.store.create({
      data: {
        name: `Loja operacional ${runId}`,
        slug: `platform-e2e-${runId}`,
        whatsapp: "+5511999999999",
        status: "ACTIVE",
        onboardingCompletedAt: new Date(),
        members: { create: { userId: ids.commonUser, role: "OWNER" } },
        products: {
          create: {
            name: "Produto operacional E2E",
            description: "Produto usado na validação do Super Admin.",
            priceCents: 2500,
          },
        },
      },
    });
    const support = await db.supportRequest.create({
      data: {
        storeId: store.id,
        requesterId: ids.commonUser,
        requesterName: "Lojista comum E2E",
        replyEmail: emails.common,
        category: "TECHNICAL",
        subject: `Chamado operacional ${runId}`,
        message: "Preciso de ajuda para validar o fluxo operacional.",
        notificationStatus: "FAILED",
        notificationAttemptedAt: new Date(),
        notificationErrorCode: "TEST_DELIVERY_FAILURE",
      },
    });

    adminGrantId = admin.id;
    storeId = store.id;
    supportRequestId = support.id;
  } finally {
    await db.$disconnect();
  }
});

test.afterAll(async () => {
  const db = database();

  try {
    await db.adminAuditEvent.deleteMany({ where: { platformAdminId: adminGrantId } });
    await db.store.deleteMany({ where: { id: storeId } });
    await db.platformAdmin.deleteMany({
      where: { userId: { in: [ids.adminUser, ids.revokedUser] } },
    });
    await db.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
  } finally {
    await db.$disconnect();
  }
});

test("aplica a matriz de autorização nas páginas e APIs", async ({ browser }) => {
  const anonymous = await browser.newContext({ baseURL: origin });
  const common = await browser.newContext({ baseURL: origin });
  const revoked = await browser.newContext({ baseURL: origin });
  const admin = await browser.newContext({ baseURL: origin });

  try {
    const anonymousPage = await anonymous.newPage();
    const response = await anonymousPage.goto("/super-admin");

    expect(response?.status()).toBe(200);
    await expect(anonymousPage).toHaveURL(/\/entrar\?callbackURL=%2Fsuper-admin$/);
    await expectDenied(anonymous);

    await signIn(common, emails.common);
    await expectDenied(common);
    const commonPage = await common.newPage();

    await commonPage.goto("/super-admin");
    await expectNotFound(commonPage);

    await signIn(revoked, emails.revoked);
    await expectDenied(revoked);
    const revokedPage = await revoked.newPage();

    await revokedPage.goto("/super-admin/audit");
    await expectNotFound(revokedPage);

    await signIn(admin, emails.admin);
    expect((await admin.request.get("/api/super-admin/session")).status()).toBe(200);
    expect((await admin.request.get(`/api/super-admin/stores?q=${runId}`)).status()).toBe(200);
    expect((await admin.request.get(`/api/super-admin/stores/${storeId}`)).status()).toBe(200);
    expect((await admin.request.get(`/api/super-admin/stores/${randomUUID()}`)).status()).toBe(404);

    const invalidAction = await admin.request.post(
      `/api/super-admin/stores/${storeId}/actions/block`,
      {
        headers: { origin },
        data: { reason: "Bloqueio operacional para teste", confirmed: false },
      }
    );

    expect(invalidAction.status()).toBe(422);
  } finally {
    await Promise.all([anonymous.close(), common.close(), revoked.close(), admin.close()]);
  }
});

test("percorre busca, detalhe, suporte, ação crítica e auditoria por teclado", async ({
  browser,
}) => {
  const admin = await browser.newContext({ baseURL: origin });
  const page = await admin.newPage();

  try {
    await signIn(admin, emails.admin);
    await page.goto(`/super-admin?q=${runId}`);
    await expect(page.getByRole("heading", { name: "Lojas", level: 1 })).toBeVisible();
    await page.getByRole("link", { name: `Loja operacional ${runId}` }).click();
    await expect(page).toHaveURL(`/super-admin/stores/${storeId}`);
    await expect(page.getByText("Publicados", { exact: true })).toBeVisible();

    const blockButton = page.getByRole("button", { name: "Bloquear painel" });

    await blockButton.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Bloquear acesso administrativo" });

    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Motivo").fill("Bloqueio operacional validado por teste E2E");
    await dialog.getByText("Confirmo que desejo bloquear o painel").click();
    await dialog.getByRole("button", { name: "Bloquear painel" }).click();
    await expect(page.getByText("Ação concluída.")).toBeVisible();
    await expect(page.getByText("Acesso bloqueado")).toBeVisible();

    await page.goto(`/super-admin/support/${supportRequestId}`);
    await expect(page.getByText("Falha no e-mail")).toBeVisible();
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "Em atendimento" }).click();
    await page
      .getByRole("textbox", { name: "Nota interna", exact: true })
      .fill("Contato iniciado pela equipe de suporte.");
    await page.getByLabel("Motivo da alteração").fill("Chamado assumido para investigação técnica");
    await page.getByText("Confirmo o estado, a nota interna e o motivo desta alteração").click();
    await page.getByRole("button", { name: "Salvar tratamento" }).click();
    await expect(page.getByText("Chamado atualizado.")).toBeVisible();

    await page.goto(`/super-admin/audit?storeId=${storeId}`);
    await expect(page.locator("article").filter({ hasText: "Bloqueio da loja" })).toBeVisible();
    await expect(
      page.locator("article").filter({ hasText: "Atualização do suporte" })
    ).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("heading", { name: "Auditoria" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390
    );
  } finally {
    await admin.close();
  }
});

test("revoga o acesso imediatamente para sessão já autenticada", async ({ browser }) => {
  const admin = await browser.newContext({ baseURL: origin });
  const page = await admin.newPage();
  const db = database();

  try {
    await signIn(admin, emails.admin);
    expect((await admin.request.get("/api/super-admin/session")).status()).toBe(200);
    await db.platformAdmin.update({
      where: { id: adminGrantId },
      data: { revokedAt: new Date() },
    });
    await expectDenied(admin);
    await page.goto("/super-admin");
    await expectNotFound(page);
  } finally {
    await db.$disconnect();
    await admin.close();
  }
});
