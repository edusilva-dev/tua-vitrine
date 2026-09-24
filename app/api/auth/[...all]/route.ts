import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/server/auth";
import { getEnv } from "@/lib/server/env";

export const runtime = "nodejs";

export const maxDuration = 30;

async function handler(request: Request) {
  if (getEnv().AUTH_MODE !== "session") return new Response(null, { status: 404 });

  const path = new URL(request.url).pathname;
  const emailRequired = [
    "/api/auth/sign-up/email",
    "/api/auth/request-password-reset",
    "/api/auth/send-verification-email",
  ].includes(path);

  if (emailRequired && getEnv().MAIL_TRANSPORT === "disabled") {
    return Response.json(
      {
        error: {
          code: "EMAIL_UNAVAILABLE",
          message: "Cadastro e recuperação estarão disponíveis após a configuração do e-mail.",
        },
      },
      { status: 503 }
    );
  }

  const handlers = toNextJsHandler(getAuth());

  const response = await (request.method === "GET"
    ? handlers.GET(request)
    : handlers.POST(request));

  if (
    response.status < 400 &&
    ["/api/auth/sign-in/email", "/api/auth/sign-out", "/api/auth/verify-email"].includes(path)
  ) {
    response.headers.append(
      "set-cookie",
      `tv-store=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict${getEnv().APP_URL.startsWith("https:") ? "; Secure" : ""}`
    );
  }

  response.headers.set("Cache-Control", "no-store");

  return response;
}

export const GET = handler;

export const POST = handler;
