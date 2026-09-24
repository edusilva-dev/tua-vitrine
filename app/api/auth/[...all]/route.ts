import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/server/auth";
import { getEnv } from "@/lib/server/env";

export const runtime = "nodejs";
export const maxDuration = 30;

async function handler(request: Request) {
  if (getEnv().AUTH_MODE !== "session") return new Response(null, { status: 404 });

  const handlers = toNextJsHandler(getAuth());

  const response = await (request.method === "GET"
    ? handlers.GET(request)
    : handlers.POST(request));
  const path = new URL(request.url).pathname;

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
