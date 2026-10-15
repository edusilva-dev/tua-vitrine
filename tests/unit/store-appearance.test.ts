import { describe, expect, test } from "bun:test";
import {
  contrastRatio,
  DEFAULT_CUSTOMIZATION,
  normalizeCustomization,
  resolveAppearance,
  validateCustomizationContrast,
} from "@/modules/stores/appearance";

const essential = {
  canCustomizeColors: true,
  canUseBasicCustomization: true,
  canUseFullCustomization: false,
};

describe("aparência da vitrine", () => {
  test("preenche defaults e preserva frase legada", () => {
    expect(normalizeCustomization({ version: 1, tagline: "Café fresco" })).toEqual({
      ...DEFAULT_CUSTOMIZATION,
      tagline: "Café fresco",
    });
  });

  test("Essencial permite o grupo básico e remove os avanços", () => {
    expect(
      resolveAppearance(
        {
          primaryColor: "#ff0000",
          template: "list",
          customization: {
            version: 1,
            tagline: "Olá",
            backgroundColor: "#000000",
            textColor: "#ffffff",
            fontPreset: "simple",
            cardRoundness: "square",
          },
        },
        essential
      )
    ).toMatchObject({
      primaryColor: "#ff0000",
      template: "list",
      customization: { tagline: "Olá", backgroundColor: null, fontPreset: "brand" },
    });
  });

  test("contraste aceita o limiar e rejeita combinação ilegível", () => {
    expect(contrastRatio("#000000", "#767676")).toBeGreaterThanOrEqual(4.5);
    expect(() =>
      validateCustomizationContrast({
        ...DEFAULT_CUSTOMIZATION,
        backgroundColor: "#ffffff",
        textColor: "#ffffff",
      })
    ).toThrow("contraste");
  });
});
