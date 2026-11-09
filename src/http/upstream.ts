import type { FastifyRequest } from 'fastify';
import { UpstreamResponseError } from './errors.ts';

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

// Provisório até o C16: repassa o Bearer que a UI mandou. Depois o token sai da
// sessão em cookie e o browser nunca mais o vê.
export function forwardAuth(request: FastifyRequest): {
  headers: Record<string, string>;
} {
  const authorization = request.headers.authorization;
  return { headers: authorization ? { Authorization: authorization } : {} };
}
