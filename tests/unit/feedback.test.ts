import { describe, expect, test } from "bun:test";
import { platformFeedbackSchema, storefrontFeedbackSchema } from "@/modules/feedback/contracts";

describe("contratos de feedback", () => {
  test("aceita feedbacks válidos da plataforma e da vitrine", () => {
    expect(
      platformFeedbackSchema.parse({
        kind: "SUGGESTION",
        rating: 5,
        message: "Seria útil duplicar um produto.",
        context: "/admin/support",
      })
    ).toMatchObject({ kind: "SUGGESTION", rating: 5 });
    expect(
      storefrontFeedbackSchema.parse({
        kind: "NOT_FOUND",
        rating: 3,
        message: "Procurei uma camiseta verde.",
        context: "SEARCH_EMPTY",
      })
    ).toMatchObject({ kind: "NOT_FOUND", context: "SEARCH_EMPTY" });
  });

  test("rejeita nota fora da escala e contexto público arbitrário", () => {
    expect(
      storefrontFeedbackSchema.safeParse({
        kind: "FOUND",
        rating: 6,
        context: "https://example.com",
      }).success
    ).toBe(false);
  });
});
