import { describe, expect, test } from "bun:test";
import { supportUpdateSchema } from "@/modules/platform-admin/contracts/support";
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

test("tratamento do suporte exige motivo e confirmação explícita", () => {
  const values = {
    status: "IN_PROGRESS",
    internalNote: "Contato iniciado.",
    reason: "Chamado assumido pela equipe de suporte",
  };

  expect(supportUpdateSchema.safeParse(values).success).toBe(false);
  expect(supportUpdateSchema.safeParse({ ...values, confirmed: false }).success).toBe(false);
  expect(supportUpdateSchema.safeParse({ ...values, confirmed: true }).success).toBe(true);
});
