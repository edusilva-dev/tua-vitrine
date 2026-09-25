import { describe, expect, test } from "bun:test";
import { isAllowedAdminRequest } from "@/lib/server/request-origin";

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
});
