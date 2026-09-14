export class AdminApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.details = details;
  }
}

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
};

export type AdminFetchOptions = RequestInit & {
  /** When true, 404 responses return null instead of throwing */
  allowNotFound?: boolean;
};

/**
 * Fetch `/api/*` with credentials. Expects `{ success, data }` envelope.
 * Throws AdminApiError on !success or non-OK responses (unless allowNotFound).
 */
export async function adminFetch<T = unknown>(
  path: string,
  options: AdminFetchOptions = {},
): Promise<T> {
  const { allowNotFound, ...init } = options;
  const url = path.startsWith("/") ? path : `/api/${path}`;
  const headers = new Headers(init.headers);

  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      credentials: "include",
      headers,
    });
  } catch {
    throw new AdminApiError("Network error — could not reach API", 0);
  }

  if (allowNotFound && res.status === 404) {
    return null as T;
  }

  let payload: ApiEnvelope<T> | null = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text) as ApiEnvelope<T>;
    } catch {
      if (!res.ok) {
        throw new AdminApiError(text.slice(0, 200) || res.statusText, res.status);
      }
      throw new AdminApiError("Invalid JSON response", res.status);
    }
  }

  if (!res.ok || !payload?.success) {
    const message = payload?.error || res.statusText || "Request failed";
    throw new AdminApiError(message, res.status, payload?.details);
  }

  return payload.data as T;
}

export function parseCommaList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
