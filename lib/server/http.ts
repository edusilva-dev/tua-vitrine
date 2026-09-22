import "server-only";
import { ZodError } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { logger } from "./logger";

export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

export async function jsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError(400, "INVALID_JSON", "O corpo da solicitação não é JSON válido.");
  }
}

export async function handle(action: () => Promise<Response>): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof ZodError)
      return Response.json(
        {
          error: {
            code: "VALIDATION",
            message: "Confira os campos informados.",
            fieldErrors: error.flatten().fieldErrors,
          },
        },
        { status: 422 }
      );

    if (error instanceof AppError)
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status }
      );

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      return Response.json(
        {
          error: {
            code: "CONFLICT",
            message: "Este cadastro já existe. Verifique o endereço da loja.",
          },
        },
        { status: 409 }
      );

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025")
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Registro não encontrado." } },
        { status: 404 }
      );

    logger.error({ err: error }, "Unhandled request error");

    return Response.json(
      {
        error: {
          code: "INTERNAL",
          message: "Não foi possível concluir a operação. Tente novamente.",
        },
      },
      { status: 500 }
    );
  }
}
