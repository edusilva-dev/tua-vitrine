import { describe, expect, test } from "bun:test";
import { getTrustedOrigins, isAllowedAdminRequest } from "@/lib/server/request-origin";

describe("proteção de origem do painel", () => {
  test("permite navegação GET após retorno de um provedor externo", () => {
    expect(
      isAllowedAdminRequest({
        mutation: false,
        secFetchSite: "cross-site",
        origin: null,
        appUrl: "https://tua-vitrine.vercel.app",
      })
    ).toBe(true);
  });

  test("bloqueia mutações externas e aceita a origem canônica", () => {
    expect(
      isAllowedAdminRequest({
        mutation: true,
        secFetchSite: "cross-site",
        origin: "https://checkout.stripe.com",
        appUrl: "https://tua-vitrine.vercel.app",
      })
    ).toBe(false);

    expect(
      isAllowedAdminRequest({
        mutation: true,
        secFetchSite: "same-origin",
        origin: "https://tua-vitrine.vercel.app",
        appUrl: "https://tua-vitrine.vercel.app",
      })
    ).toBe(true);
  });

  test("trata localhost e endereços de loopback como a mesma origem local", () => {
    expect(getTrustedOrigins("http://localhost:3000")).toEqual([
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://[::1]:3000",
    ]);

    expect(
      isAllowedAdminRequest({
        mutation: true,
        secFetchSite: "same-site",
        origin: "http://127.0.0.1:3000",
        appUrl: "http://localhost:3000",
      })
    ).toBe(true);
  });

  test("não amplia as origens confiáveis de uma URL pública", () => {
    expect(getTrustedOrigins("https://usetuavitrine.com.br")).toEqual([
      "https://usetuavitrine.com.br",
    ]);

    expect(
      isAllowedAdminRequest({
        mutation: true,
        secFetchSite: "same-site",
        origin: "https://staging.usetuavitrine.com.br",
        appUrl: "https://usetuavitrine.com.br",
      })
    ).toBe(false);
  });
});
