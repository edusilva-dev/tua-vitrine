import { describe, expect, test } from "bun:test";
import { supportRequestSchema } from "@/modules/support/contracts";

describe("supportRequestSchema", () => {
  test("aceita uma solicitação completa", () => {
    expect(
      supportRequestSchema.parse({
        category: "TECHNICAL",
        subject: "Produto não publica",
        message: "Ao salvar o produto, ele continua aparecendo como rascunho.",
      })
    ).toMatchObject({ category: "TECHNICAL" });
  });

  test("rejeita assunto em múltiplas linhas e mensagem sem contexto", () => {
    expect(
      supportRequestSchema.safeParse({
        category: "QUESTION",
        subject: "Linha 1\nLinha 2",
        message: "Não funciona.",
      }).success
    ).toBe(false);
  });
});
