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
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });
  const body = await response.json();

  if (!response.ok) {
    throw new ApiError(
      body.error?.message ?? "Não foi possível concluir. Tente novamente.",
      response.status,
      body.error?.fieldErrors
    );
  }

  return body.data as T;
}
