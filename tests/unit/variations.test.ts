import { describe, expect, it } from "bun:test";
import { describeLegacyVariants } from "@/modules/catalog/variations";

describe("describeLegacyVariants", () => {
  it("converts structured combinations into simple readable descriptions", () => {
    expect(
      describeLegacyVariants([
        { available: true, options: { Tamanho: "P", Cor: "Azul" } },
        { available: true, options: { Tamanho: "M", Cor: "Azul" } },
        { available: true, options: { Tamanho: "P", Cor: "Preto" } },
      ])
    ).toEqual(["Tamanho: P, M", "Cor: Azul, Preto"]);
  });

  it("omits values that only exist in unavailable combinations", () => {
    expect(
      describeLegacyVariants([
        { available: true, options: { Cor: "Azul" } },
        { available: false, options: { Cor: "Esgotada" } },
      ])
    ).toEqual(["Cor: Azul"]);
  });
});
