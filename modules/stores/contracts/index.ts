import { z } from "zod";
import type { AssetDTO } from "@/modules/catalog/contracts";

export const reservedSlugs = [
  "admin",
  "api",
  "onboarding",
  "preview",
  "vitrine",
  "storefront",
  "_next",
  "favicon",
  "robots",
  "sitemap",
];
export function normalizeSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
export const storeIdentitySchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z
    .string()
    .transform(normalizeSlug)
    .pipe(
      z
        .string()
        .min(3)
        .max(60)
        .refine((value) => !reservedSlugs.includes(value), "Este endereço é reservado.")
    ),
});
export const whatsappSchema = z.object({
  whatsapp: z
    .string()
    .transform((value) => value.replace(/[^\d+]/g, ""))
    .pipe(
      z
        .string()
        .regex(/^\+[1-9]\d{9,14}$/, "Informe o DDI e o número, por exemplo +55 11 99999-9999.")
    ),
});
export const customizationSchema = z.object({
  version: z.literal(1),
  tagline: z.string().trim().max(160),
});
export const storeSettingsSchema = z.object({
  name: z.string().trim().min(2).max(100),
  whatsapp: whatsappSchema.shape.whatsapp,
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  template: z.enum(["grid", "list"]),
  logoAssetId: z.string().uuid().nullable(),
  customization: customizationSchema,
});
export type StoreDTO = {
  id: string;
  name: string;
  slug: string;
  whatsapp: string | null;
  status: "DRAFT" | "ACTIVE";
  primaryColor: string;
  template: "grid" | "list";
  logo: AssetDTO | null;
  customization: { version: 1; tagline: string };
  onboardingStep: 1 | 2 | 3 | 4;
  url: string;
};
export type StoreSettingsInput = z.infer<typeof storeSettingsSchema>;
