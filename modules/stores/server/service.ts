import { cache } from "react";
import type { Store } from "@/generated/prisma/client";
import {
  assertAdminAccess,
  getAdminContext,
  getAdminIdentity,
  type StoreContext,
} from "@/lib/server/context";
import { db } from "@/lib/server/db";
import { AppError } from "@/lib/server/http";
import { getEntitlements } from "@/modules/billing/server/entitlements";
import "server-only";
import { assetUrl } from "@/lib/server/storage-adapter";
import {
  customizationSchema,
  type StoreDTO,
  storeIdentitySchema,
  storeSettingsSchema,
  whatsappSchema,
} from "../contracts";
import { storeRepository } from "./repository";

export async function toStoreDTO(store: Store): Promise<StoreDTO> {
  const logo = store.logoAssetId
    ? await db.asset.findFirst({ where: { id: store.logoAssetId, storeId: store.id } })
    : null;
  const customization = customizationSchema.safeParse(store.customization);

  return {
    id: store.id,
    name: store.name,
    slug: store.slug,
    whatsapp: store.whatsapp,
    status: store.status,
    primaryColor: store.primaryColor,
    template: store.template === "list" ? "list" : "grid",
    logo: logo
      ? { id: logo.id, url: assetUrl(logo), width: logo.width, height: logo.height }
      : null,
    customization: customization.success ? customization.data : { version: 1, tagline: "" },
    onboardingStep: store.onboardingCompletedAt ? 4 : store.whatsapp ? 3 : 2,
    url: `${(process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/${store.slug}`,
  };
}

export const getCurrentStore = cache(async (): Promise<StoreDTO | null> => {
  try {
    const context = await getAdminContext();
    const store = await storeRepository.find(context.storeId);

    return store ? toStoreDTO(store) : null;
  } catch (error) {
    if (error instanceof AppError && error.code === "NO_STORE") return null;

    throw error;
  }
});

export async function listAccessibleStores(): Promise<StoreDTO[]> {
  await assertAdminAccess();
  const { userId } = await getAdminIdentity();

  return Promise.all((await storeRepository.list(userId)).map(toStoreDTO));
}

export async function getStoreBySlug(slug: string): Promise<StoreDTO | null> {
  const store = await storeRepository.bySlug(slug);

  return store?.status === "ACTIVE" ? toStoreDTO(store) : null;
}

export async function createStore(input: unknown, ownerId?: string): Promise<StoreDTO> {
  const values = storeIdentitySchema.parse(input);

  if (ownerId && (await db.storeMember.findFirst({ where: { userId: ownerId } })))
    throw new AppError(409, "STORE_LIMIT", "Sua conta já possui uma vitrine.");

  return toStoreDTO(
    await db.store.create({
      data: {
        ...values,
        ...(ownerId ? { members: { create: { userId: ownerId, role: "OWNER" } } } : {}),
      },
    })
  );
}

export async function saveIdentity(
  context: StoreContext | null,
  input: unknown,
  ownerId?: string
): Promise<StoreDTO> {
  const values = storeIdentitySchema.parse(input);

  if (!context) {
    const existing = await storeRepository.bySlug(values.slug);

    if (existing?.status === "DRAFT" && existing.name === values.name) {
      const member = ownerId
        ? await db.storeMember.findUnique({
            where: { storeId_userId: { storeId: existing.id, userId: ownerId } },
          })
        : null;

      if (!ownerId || member?.role === "OWNER") return toStoreDTO(existing);
    }

    if (ownerId && (await db.storeMember.findFirst({ where: { userId: ownerId } })))
      throw new AppError(409, "STORE_LIMIT", "Sua conta já possui uma vitrine.");

    return createStore(values, ownerId);
  }

  const store = await storeRepository.find(context.storeId);

  if (!store) throw new AppError(404, "NOT_FOUND", "Loja não encontrada.");

  if (store.status === "ACTIVE" && store.slug !== values.slug)
    throw new AppError(
      409,
      "SLUG_LOCKED",
      "O endereço de uma loja publicada não pode ser alterado."
    );

  return toStoreDTO(await db.store.update({ where: { id: context.storeId }, data: values }));
}

export async function saveWhatsapp(context: StoreContext, input: unknown): Promise<StoreDTO> {
  return toStoreDTO(
    await db.store.update({ where: { id: context.storeId }, data: whatsappSchema.parse(input) })
  );
}

export async function saveSettings(context: StoreContext, input: unknown): Promise<StoreDTO> {
  const values = storeSettingsSchema.parse(input);
  const [entitlements, current] = await Promise.all([
    getEntitlements(context),
    db.store.findUniqueOrThrow({ where: { id: context.storeId } }),
  ]);

  if (!entitlements.canCustomizeColors && values.primaryColor !== current.primaryColor)
    throw new AppError(403, "PLAN_REQUIRED", "As cores estão disponíveis no plano Essencial.");

  if (
    !entitlements.canUseFullCustomization &&
    (values.template !== current.template ||
      JSON.stringify(values.customization) !== JSON.stringify(current.customization))
  )
    throw new AppError(
      403,
      "PLAN_REQUIRED",
      "Temas e textos personalizados estão disponíveis no plano Profissional."
    );

  if (
    values.logoAssetId &&
    !(await db.asset.findFirst({ where: { id: values.logoAssetId, storeId: context.storeId } }))
  )
    throw new AppError(422, "ASSET", "Logotipo inválido.");

  return toStoreDTO(await db.store.update({ where: { id: context.storeId }, data: values }));
}
