import { z } from "zod";
import type { Entitlements } from "@/modules/billing/contracts";
import { customizationSchema } from "./contracts";

export const DEFAULT_PRIMARY_COLOR = "#2563eb";

export const DEFAULT_BACKGROUND_COLOR = "#f7f7f2";

export const DEFAULT_TEXT_COLOR = "#233c37";

export const DEFAULT_CUSTOMIZATION = {
  version: 1 as const,
  tagline: "",
  backgroundColor: null,
  textColor: null,
  fontPreset: "brand" as const,
  cardRoundness: "default" as const,
};

export type Customization = z.infer<typeof customizationSchema>;

export function normalizeCustomization(value: unknown): Customization {
  const parsed = customizationSchema.safeParse(value);

  return parsed.success ? parsed.data : DEFAULT_CUSTOMIZATION;
}

export function resetAdvancedCustomization(customization: unknown) {
  const current = normalizeCustomization(customization);

  return {
    ...current,
    backgroundColor: null,
    textColor: null,
    fontPreset: "brand" as const,
    cardRoundness: "default" as const,
  };
}

export function resetPaidCustomization() {
  return DEFAULT_CUSTOMIZATION;
}

function channel(value: string) {
  const normalized = Number.parseInt(value, 16) / 255;

  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(color: string) {
  return (
    0.2126 * channel(color.slice(1, 3)) +
    0.7152 * channel(color.slice(3, 5)) +
    0.0722 * channel(color.slice(5, 7))
  );
}

export function contrastRatio(first: string, second: string) {
  const light = Math.max(relativeLuminance(first), relativeLuminance(second));
  const dark = Math.min(relativeLuminance(first), relativeLuminance(second));

  return (light + 0.05) / (dark + 0.05);
}

export function validateCustomizationContrast(customization: Customization) {
  const background = customization.backgroundColor ?? DEFAULT_BACKGROUND_COLOR;
  const text = customization.textColor ?? DEFAULT_TEXT_COLOR;

  if (contrastRatio(background, text) < 4.5) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        path: ["customization", "textColor"],
        message: "Escolha cores com contraste mínimo de 4,5:1.",
      },
    ]);
  }
}

export function resolveAppearance(
  values: {
    primaryColor: string;
    template: "grid" | "list";
    customization: unknown;
  },
  entitlements: Pick<
    Entitlements,
    "canCustomizeColors" | "canUseBasicCustomization" | "canUseFullCustomization"
  >
) {
  const customization = normalizeCustomization(values.customization);

  return {
    primaryColor: entitlements.canCustomizeColors ? values.primaryColor : DEFAULT_PRIMARY_COLOR,
    template:
      entitlements.canUseBasicCustomization && values.template === "list"
        ? ("list" as const)
        : ("grid" as const),
    customization: {
      ...customization,
      tagline: entitlements.canUseBasicCustomization ? customization.tagline : "",
      ...(entitlements.canUseFullCustomization
        ? {}
        : {
            backgroundColor: null,
            textColor: null,
            fontPreset: "brand" as const,
            cardRoundness: "default" as const,
          }),
    },
  };
}

export function resolveStorefrontTokens(appearance: ReturnType<typeof resolveAppearance>) {
  const background = appearance.customization.backgroundColor ?? DEFAULT_BACKGROUND_COLOR;
  const text = appearance.customization.textColor ?? DEFAULT_TEXT_COLOR;
  const primaryLuminance = relativeLuminance(appearance.primaryColor);

  return {
    style: {
      "--primary": appearance.primaryColor,
      "--primary-foreground": primaryLuminance > 0.42 ? DEFAULT_TEXT_COLOR : "#ffffff",
      "--ring": appearance.primaryColor,
      "--background": background,
      "--foreground": text,
      "--card": background,
      "--card-foreground": text,
      "--muted-foreground": text,
      "--store-card-radius":
        appearance.customization.cardRoundness === "square"
          ? "0px"
          : appearance.customization.cardRoundness === "subtle"
            ? "0.625rem"
            : "1rem",
    },
    fontClass: appearance.customization.fontPreset === "simple" ? "font-sans" : "",
  };
}
