import { randomUUID } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import sharp, { type Sharp } from "sharp";
import { fixtures, testDatabase } from "../setup/e2e-fixtures";

const origin = "http://localhost:3100";

test("hidrata e preserva o WhatsApp ao salvar outra configuração", async ({ context, page }) => {
  const db = testDatabase();
  const original = await db.store.findUniqueOrThrow({
    where: { id: fixtures.firstStore },
    select: { name: true, whatsapp: true },
  });

  try {
    await context.addCookies([
      {
        name: "tv-local-store",
        value: fixtures.firstStore,
        url: origin,
        httpOnly: true,
        sameSite: "Strict",
      },
    ]);
    await page.goto("/admin/settings");

    const whatsapp = page.getByLabel("WhatsApp de atendimento");

    await expect(whatsapp).toHaveValue("+55 (11) 99999-9999");
    await page.getByLabel("Nome da loja").fill(`${original.name} atualizada`);
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page.getByText("Sua vitrine ganhou um novo visual.")).toBeVisible();
    await expect
      .poll(async () =>
        db.store.findUniqueOrThrow({
          where: { id: fixtures.firstStore },
          select: { whatsapp: true },
        })
      )
      .toEqual({ whatsapp: original.whatsapp });
  } finally {
    await db.store.update({ where: { id: fixtures.firstStore }, data: { name: original.name } });
    await db.$disconnect();
  }
});

test("mantém o slug sincronizado até o lojista personalizá-lo", async ({ context, page }) => {
  const db = testDatabase();
  const storeId = randomUUID();
  const suffix = storeId.slice(0, 8);
  const initialName = `Loja Inicial ${suffix}`;
  const initialSlug = `loja-inicial-${suffix}`;

  try {
    await db.store.create({
      data: { id: storeId, name: initialName, slug: initialSlug },
    });
    await context.addCookies([
      {
        name: "tv-local-store",
        value: storeId,
        url: origin,
        httpOnly: true,
        sameSite: "Strict",
      },
    ]);
    await page.goto("/admin/onboarding");
    await page.getByRole("button", { name: "Voltar" }).click();

    const name = page.getByLabel("Nome da loja");
    const slug = page.getByLabel("Endereço da vitrine");

    await name.fill(`Loja Atualizada ${suffix}`);
    await expect(slug).toHaveValue(`loja-atualizada-${suffix}`);
    await slug.fill("endereco-personalizado");
    await name.fill("Outro Nome");
    await expect(slug).toHaveValue("endereco-personalizado");
  } finally {
    await db.store.deleteMany({ where: { id: storeId } });
    await db.$disconnect();
  }
});

test("processa JPEG, PNG e WebP válidos antes de persistir no storage local", async ({
  context,
  page,
}) => {
  const db = testDatabase();
  const createdIds: string[] = [];
  const storageKeys: string[] = [];
  const formats = [
    { extension: "jpg", mime: "image/jpeg", encode: (image: Sharp) => image.jpeg() },
    { extension: "png", mime: "image/png", encode: (image: Sharp) => image.png() },
    { extension: "webp", mime: "image/webp", encode: (image: Sharp) => image.webp() },
  ];

  try {
    await context.addCookies([
      {
        name: "tv-local-store",
        value: fixtures.firstStore,
        url: origin,
        httpOnly: true,
        sameSite: "Strict",
      },
    ]);

    for (const format of formats) {
      const image = sharp({
        create: {
          width: 1254,
          height: 1254,
          channels: 3,
          background: { r: 36, g: 92, b: 96 },
        },
      });
      const buffer = await format.encode(image).toBuffer();
      const response = await page.request.post("/api/admin/assets", {
        headers: { origin },
        multipart: {
          file: {
            name: `imagem-valida.${format.extension}`,
            mimeType: format.mime,
            buffer,
          },
        },
      });

      const responseText = await response.text();

      expect(response.status(), responseText).toBe(201);
      const body = JSON.parse(responseText) as { data: { id: string } };
      const asset = await db.asset.findUniqueOrThrow({ where: { id: body.data.id } });
      const stored = await readFile(resolve("work/test-storage", asset.storageKey));
      const metadata = await sharp(stored).metadata();

      createdIds.push(asset.id);
      storageKeys.push(asset.storageKey);
      expect(asset.storeId).toBe(fixtures.firstStore);
      expect(asset.mime).toBe("image/webp");
      expect(metadata.format).toBe("webp");
      expect(metadata.width).toBe(1254);
      expect(metadata.height).toBe(1254);
    }
  } finally {
    await db.asset.deleteMany({ where: { id: { in: createdIds } } });

    for (const key of storageKeys) {
      await unlink(resolve("work/test-storage", key)).catch(() => undefined);
    }

    await db.$disconnect();
  }
});
