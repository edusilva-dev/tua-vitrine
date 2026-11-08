export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fieldErrors?: Record<string, string[]>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, {
      ...init,
      headers: {
        ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(
      "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
      0
    );
  }

  const text = await response.text();
  let body: { data?: T; error?: { message?: string; fieldErrors?: Record<string, string[]> } } = {};

  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    if (response.ok)
      throw new ApiError(
        "O servidor retornou uma resposta inválida. Tente novamente.",
        response.status
      );
  }

  if (!response.ok) {
    throw new ApiError(
      body.error?.message ??
        (response.status === 413
          ? "O arquivo enviado excede o limite permitido. Escolha um arquivo menor."
          : "Não foi possível concluir. Tente novamente."),
      response.status,
      body.error?.fieldErrors
    );
  }

  return body.data as T;
}
