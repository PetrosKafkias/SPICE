export class ApiError extends Error {
  status: number;
  code: string;
  fieldErrors?: Record<string, string>;

  constructor(message: string, status: number, code = 'SERVER_ERROR', fieldErrors?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      'Accept-Language': document.documentElement.lang || 'en',
      ...options.headers,
    },
  });

  let payload: any = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) payload = await response.json();

  if (!response.ok) {
    throw new ApiError(
      payload?.error || `Request failed with status ${response.status}.`,
      response.status,
      payload?.code || 'SERVER_ERROR',
      payload?.fieldErrors,
    );
  }

  return payload as T;
}

export function jsonBody(value: unknown): string {
  return JSON.stringify(value);
}
