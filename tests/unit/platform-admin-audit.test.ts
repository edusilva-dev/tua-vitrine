import { expect, test } from "bun:test";
import { adminAuditListInputSchema } from "@/modules/platform-admin/contracts/audit";
import { sanitizeAuditSnapshot } from "@/modules/platform-admin/server/audit";

test("mantém somente campos operacionais permitidos nos snapshots", () => {
  expect(
    sanitizeAuditSnapshot({
      status: "ACTIVE",
      plan: "PROFESSIONAL",
      password: "segredo",
      token: "token",
      message: "conteúdo do chamado",
      internalNote: "nota privada",
    })
  ).toEqual({ status: "ACTIVE", plan: "PROFESSIONAL" });
});

test("valida filtros e rejeita intervalo invertido", () => {
  expect(
    adminAuditListInputSchema.parse({
      action: "STORE_BLOCK",
      result: "SUCCESS",
      from: "2026-11-01",
      to: "2026-11-30",
    })
  ).toMatchObject({ action: "STORE_BLOCK", page: 1 });

  expect(() => adminAuditListInputSchema.parse({ from: "2026-12-01", to: "2026-11-01" })).toThrow();
});
