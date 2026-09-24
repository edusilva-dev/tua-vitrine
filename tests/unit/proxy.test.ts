import { afterEach, describe, expect, test } from "bun:test";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

const originalAuthMode = process.env.AUTH_MODE;

afterEach(() => {
  if (originalAuthMode === undefined) {
    delete process.env.AUTH_MODE;

    return;
  }

  process.env.AUTH_MODE = originalAuthMode;
});

describe("proxy do painel", () => {
  test("mantém o acesso local sem exigir cookie", () => {
    process.env.AUTH_MODE = "local";

    const response = proxy(new NextRequest("http://localhost:3000/admin/products"));

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  test("redireciona navegação sem sessão e preserva somente o destino interno", () => {
    process.env.AUTH_MODE = "session";

    const response = proxy(
      new NextRequest("https://tuavitrine.com.br/admin/products?page=2&next=https://evil.example")
    );
    const location = new URL(response.headers.get("location") ?? "");

    expect(response.status).toBe(307);
    expect(location.origin).toBe("https://tuavitrine.com.br");
    expect(location.pathname).toBe("/entrar");
    expect(location.searchParams.get("callbackURL")).toBe(
      "/admin/products?page=2&next=https://evil.example"
    );
  });

  test("permite a antecipação quando o cookie de sessão está presente", () => {
    process.env.AUTH_MODE = "session";

    const response = proxy(
      new NextRequest("https://tuavitrine.com.br/admin", {
        headers: { cookie: "__Secure-better-auth.session_token=opaque-session-token" },
      })
    );

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
