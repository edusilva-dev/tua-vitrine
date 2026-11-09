import { describe, expect, it } from "bun:test";
import { describeLegacyVariants } from "@/modules/catalog/variations";

describe("describeLegacyVariants", () => {
  it("converts structured combinations into simple readable descriptions", () => {
    expect(
      describeLegacyVariants([
        { options: { Tamanho: "P", Cor: "Azul" } },
        { options: { Tamanho: "M", Cor: "Azul" } },
        { options: { Tamanho: "P", Cor: "Preto" } },
      ])
    ).toEqual(["Tamanho: P, M", "Cor: Azul, Preto"]);
  });
});
