import { describe, expect, test } from "bun:test";
import {
  buildCombinations,
  combinationKey,
  reconstructOptions,
  type VariantDraft,
} from "@/modules/catalog/variant-builder";

const defaults = { priceCents: 1000, discountPriceCents: 800 };

describe("structured variant builder", () => {
  test("generates the cartesian product with inherited prices and unique trimmed values", () => {
    const variants = buildCombinations(
      [
        { name: "Cor", values: [" Azul ", "Azul", "Verde"] },
        { name: "Tamanho", values: ["P", "M"] },
      ],
      [],
      defaults
    );

    expect(variants).toHaveLength(4);
    expect(variants[0]).toEqual({
      options: { Cor: "Azul", Tamanho: "P" },
      ...defaults,
      available: true,
    });
    expect(new Set(variants.map((variant) => combinationKey(variant.options))).size).toBe(4);
  });

  test("reconstructs definitions and preserves identity and overrides regardless of option order", () => {
    const existing: VariantDraft = {
      id: "variant-id",
      options: { Tamanho: "M", Cor: "Azul" },
      priceCents: 2500,
      discountPriceCents: 2000,
      available: false,
    };

    expect(reconstructOptions([existing])).toEqual([
      { name: "Tamanho", values: ["M"] },
      { name: "Cor", values: ["Azul"] },
    ]);
    const generated = buildCombinations(
      [
        { name: "Cor", values: ["Azul", "Verde"] },
        { name: "Tamanho", values: ["M"] },
      ],
      [existing],
      defaults
    );

    expect(generated[0]).toEqual(existing);
    expect(generated[1]).toMatchObject({ ...defaults, available: true });
  });

  test("accepts 100 combinations and rejects overflow before generating", () => {
    const values = Array.from({ length: 10 }, (_, index) => String(index));

    expect(
      buildCombinations(
        [
          { name: "Cor", values },
          { name: "Tamanho", values },
        ],
        [],
        defaults
      )
    ).toHaveLength(100);
    expect(() =>
      buildCombinations(
        [
          { name: "Cor", values: [...values, "extra"] },
          { name: "Tamanho", values },
        ],
        [],
        defaults
      )
    ).toThrow("100 combinações");
  });

  test("rejects missing values, empty names and duplicate option names", () => {
    expect(() => buildCombinations([], [], defaults)).toThrow();
    expect(() => buildCombinations([{ name: "Cor", values: [] }], [], defaults)).toThrow();
    expect(() => buildCombinations([{ name: " ", values: ["Azul"] }], [], defaults)).toThrow();
    expect(() =>
      buildCombinations(
        [
          { name: "Cor", values: ["Azul"] },
          { name: " cor ", values: ["Verde"] },
        ],
        [],
        defaults
      )
    ).toThrow("nomes diferentes");
  });

  test("a genuinely new option map does not inherit another combination identity", () => {
    const existing: VariantDraft = {
      id: "old-id",
      options: { Cor: "Azul" },
      priceCents: 500,
      available: false,
    };
    const generated = buildCombinations([{ name: "Cor", values: ["Verde"] }], [existing], defaults);

    expect(generated[0]).toEqual({ options: { Cor: "Verde" }, ...defaults, available: true });
  });
});
