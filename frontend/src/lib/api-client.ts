import { env } from './env';

type ApiErrorBody = { message?: string | string[] };

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

function csrfToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  return document.cookie.split('; ').find((entry) => entry.startsWith('ff_csrf='))?.split('=')[1];
}

export async function apiClient<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set('Content-Type', 'application/json');
  const csrf = csrfToken();
  if (csrf && !['GET', 'HEAD'].includes(options.method ?? 'GET')) headers.set('x-csrf-token', decodeURIComponent(csrf));

  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    const message = Array.isArray(body.message) ? body.message[0] : body.message;
    throw new ApiError(response.status, message ?? 'Não foi possível concluir a solicitação.');
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
