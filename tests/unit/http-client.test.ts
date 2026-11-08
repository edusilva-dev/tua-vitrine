import { describe, expect, spyOn, test } from "bun:test";
import { ApiError, api } from "@/lib/client/http";

describe("cliente HTTP", () => {
  test("traduz falha de transporte sem expor a mensagem interna do navegador", async () => {
    const fetchMock = spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new TypeError("Failed to fetch")
    );

    try {
      await expect(api("/api/admin/assets", { method: "POST" })).rejects.toMatchObject({
        name: "ApiError",
        status: 0,
        message: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
      });
    } finally {
      fetchMock.mockRestore();
    }
  });

  test("explica 413 da infraestrutura mesmo quando a resposta não é JSON", async () => {
    const fetchMock = spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Payload Too Large", { status: 413 })
    );

    try {
      await expect(api("/api/admin/assets", { method: "POST" })).rejects.toEqual(
        new ApiError("O arquivo enviado excede o limite permitido. Escolha um arquivo menor.", 413)
      );
    } finally {
      fetchMock.mockRestore();
    }
  });
});
