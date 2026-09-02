export const UNAUTHORIZED_EVENT = "aampere:unauthorized";

interface ApiErrorBody {
  message?: string | string[];
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function getErrorMessage(response: Response) {
  const body = (await response.json().catch(() => null)) as ApiErrorBody | null;

  if (Array.isArray(body?.message)) return body.message.join(" ");
  if (body?.message) return body.message;
  return `Request failed (${response.status})`;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers, ...requestOptions } = options;

  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...requestOptions,
      headers: {
        Accept: "application/json",
        ...(requestOptions.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new ApiError("Unable to reach the server. Please try again.", 0);
  }

  if (!response.ok) {
    if (response.status === 401 && token) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }

    throw new ApiError(await getErrorMessage(response), response.status);
  }

  return (await response.json()) as T;
}
