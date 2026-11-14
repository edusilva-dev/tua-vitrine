import { expect, test } from "bun:test";
import { Prisma } from "@/generated/prisma/client";
import { resolvePlatformAdmin } from "@/modules/platform-admin/server/access";

function prismaError(code: string, modelName: string) {
  return new Prisma.PrismaClientKnownRequestError("Database error", {
    code,
    clientVersion: "7.10.0",
    meta: { modelName },
  });
}

test("mantém o painel comum acessível enquanto a tabela de Super Admin ainda não existe", async () => {
  const identity = await resolvePlatformAdmin("user-id", async () => {
    throw prismaError("P2021", "PlatformAdmin");
  });

  expect(identity).toBeNull();
});

test("não oculta falhas de banco sem relação com a tabela de Super Admin", async () => {
  const failure = prismaError("P2021", "Store");

  expect(
    resolvePlatformAdmin("user-id", async () => {
      throw failure;
    })
  ).rejects.toBe(failure);
});
