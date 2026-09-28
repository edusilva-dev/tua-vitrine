import { afterEach, describe, expect, test } from "bun:test";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

const originalSecret = process.env.BETTER_AUTH_SECRET;

afterEach(() => {
  if (originalSecret === undefined) {
    delete process.env.BETTER_AUTH_SECRET;

    return;
  }

  process.env.BETTER_AUTH_SECRET = originalSecret;
});

describe("proxy do painel", () => {
  test("mantém o acesso local sem autenticação configurada", () => {
    delete process.env.BETTER_AUTH_SECRET;

    const response = proxy(new NextRequest("http://localhost:3000/admin/products"));

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  test("redireciona navegação sem sessão e preserva somente o destino interno", () => {
    process.env.BETTER_AUTH_SECRET = "test-only-secret-with-more-than-32-characters";

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
    process.env.BETTER_AUTH_SECRET = "test-only-secret-with-more-than-32-characters";

    const response = proxy(
      new NextRequest("https://tuavitrine.com.br/admin", {
        headers: { cookie: "__Secure-better-auth.session_token=opaque-session-token" },
      })
    );

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
