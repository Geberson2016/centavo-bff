import type { FastifyRequest } from 'fastify';
import { UpstreamResponseError } from './errors.ts';
import { requireSession } from './session.ts';

interface FetchResult<T> {
  data?: T;
  error?: unknown;
  response: Response;
}

// Devolve o corpo de sucesso ou lança o erro do Spring para o error handler repassar.
export function unwrap<T>(result: FetchResult<T>): T {
  if (!result.response.ok || result.data === undefined) {
    throw new UpstreamResponseError(result.response, result.error);
  }
  return result.data;
}

// Header Authorization para o Spring, montado a partir do JWT guardado na sessão.
// Sem sessão válida lança UnauthenticatedError (401) antes de chamar o Spring.
export function forwardAuth(request: FastifyRequest): {
  headers: Record<string, string>;
} {
  const { token } = requireSession(request);
  return { headers: { Authorization: `Bearer ${token}` } };
}
