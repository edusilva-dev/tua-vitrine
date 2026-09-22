import { describe, expect, test } from "bun:test";
import { productInputSchema } from "@/modules/catalog/contracts";
import { cartSchema, resolveCart, selectionKeys } from "@/modules/storefront/selection";
import { cartMessage, whatsappLink } from "@/modules/storefront/whatsapp";
import { normalizeSlug, storeIdentitySchema, whatsappSchema } from "@/modules/stores/contracts";

const input = {
  name: "Caneca artesanal",
  description: "",
  categoryName: "",
  priceCents: 1990,
  available: true,
  assetIds: [],
  variants: [],
};

describe("contratos", () => {
  test("slug normaliza acentos e recusa nomes reservados", () => {
    expect(normalizeSlug("Ateliê da Clara")).toBe("atelie-da-clara");
    expect(storeIdentitySchema.safeParse({ name: "Teste", slug: "admin" }).success).toBe(false);
  });
  test("WhatsApp requer DDI e normaliza máscara", () => {
    expect(whatsappSchema.parse({ whatsapp: "+55 (11) 99999-9999" }).whatsapp).toBe(
      "+5511999999999"
    );
    expect(whatsappSchema.safeParse({ whatsapp: "11999999999" }).success).toBe(false);
  });
  test("preço deve ser centavos inteiros e combinações únicas", () => {
    expect(productInputSchema.safeParse({ ...input, priceCents: 19.9 }).success).toBe(false);
    const variant = { label: "Azul", options: { Cor: "Azul" }, priceCents: 1990, available: true };

    expect(productInputSchema.safeParse({ ...input, variants: [variant, variant] }).success).toBe(
      false
    );
    expect(
      productInputSchema.safeParse({
        ...input,
        variants: [variant, { ...variant, options: { Tamanho: "P" } }],
      }).success
    ).toBe(false);
  });
});
describe("seleções e WhatsApp", () => {
  const productId = "11111111-1111-4111-8111-111111111111";

  test("localStorage é isolado pelo ID, e dados inválidos são rejeitados", () => {
    expect(selectionKeys("a").cart).not.toBe(selectionKeys("b").cart);
    expect(cartSchema.safeParse([{ productId, quantity: -1 }]).success).toBe(false);
  });
  test("produto removido permanece visível como indisponível", () => {
    const lines = resolveCart([{ productId, variantId: null, name: "Caneca", quantity: 2 }], []);

    expect(lines[0]?.available).toBe(false);
    expect(lines[0]?.label).toBe("Caneca");
  });
  test("mensagem preserva acentos, quantidades e preço", () => {
    const lines = [
      {
        productId,
        variantId: null,
        name: "Caneca",
        quantity: 2,
        product: null,
        label: "Caneca · Azul",
        priceCents: 1990,
        available: true,
      },
    ];
    const message = cartMessage("Ateliê", "http://localhost:3000/atelie", lines);
    const url = new URL(whatsappLink("+55 11 99999-9999", message));

    expect(url.pathname).toBe("/5511999999999");
    expect(url.searchParams.get("text")).toContain("2x Caneca · Azul");
    expect(message).toContain("39,80");
  });
});
