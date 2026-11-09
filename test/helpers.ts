import Fastify, { type FastifyInstance } from 'fastify';
import type { AddressInfo } from 'node:net';
import { buildApp } from '../src/app.ts';
import { loadConfig } from '../src/config.ts';

// Spring falso: um servidor HTTP de verdade numa porta aleatória, para exercitar o
// client gerado, os headers e o tratamento de erro ponta a ponta.
export async function startFakeBackend(
  setup: (server: FastifyInstance) => void
): Promise<{ server: FastifyInstance; url: string }> {
  const server = Fastify();
  setup(server);
  await server.listen({ host: '127.0.0.1', port: 0 });
  const { port } = server.server.address() as AddressInfo;
  return { server, url: `http://127.0.0.1:${port}` };
}

export function buildTestApp(env: Record<string, string> = {}) {
  return buildApp(loadConfig({ NODE_ENV: 'test', ...env }));
}

export const PROBLEM_JSON = 'application/problem+json';
