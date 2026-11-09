import createClient from 'openapi-fetch';
import type { paths } from './schema.ts';
import { UpstreamUnavailableError } from '../http/errors.ts';

export type BackendClient = ReturnType<typeof createBackendClient>;

// Client tipado do Spring, gerado a partir de contracts/backend.openapi.yaml.
// Falha de rede ou timeout vira UpstreamUnavailableError (502 para a UI); resposta
// de erro do Spring NÃO é exceção aqui — quem decide é o unwrap().
export function createBackendClient(baseUrl: string, timeoutMs: number) {
  return createClient<paths>({
    baseUrl,
    fetch: async (request) => {
      try {
        return await fetch(request, { signal: AbortSignal.timeout(timeoutMs) });
      } catch (cause) {
        throw new UpstreamUnavailableError(cause);
      }
    },
  });
}
