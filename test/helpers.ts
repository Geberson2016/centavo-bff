import Fastify, { type FastifyInstance } from 'fastify';
import type { AddressInfo } from 'node:net';
import { buildApp } from '../src/app.ts';
import { loadConfig } from '../src/config.ts';
import { SESSION_COOKIE } from '../src/http/session.ts';

export const TEST_SESSION_KEY = 'a'.repeat(64);
export const PROBLEM_JSON = 'application/problem+json';

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
  return buildApp(
    loadConfig({ NODE_ENV: 'test', SESSION_KEY: TEST_SESSION_KEY, ...env })
  );
}

// JWT com o formato do Spring (só o payload importa para o BFF; a assinatura é
// validada pelo Spring, que aqui é falso).
export function fakeJwt(expiresInSeconds: number, subject = 'a@a.com'): string {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: subject, exp })}.assinatura`;
}

// Faz login no BFF e devolve o header Cookie pronto para as próximas requests.
export async function loginCookie(app: FastifyInstance): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/bff/session',
    payload: { email: 'a@a.com', password: '123456' },
  });
  const cookie = res.cookies.find((c) => c.name === SESSION_COOKIE);
  if (res.statusCode !== 200 || !cookie) {
    throw new Error(`login falhou: ${res.statusCode} ${res.body}`);
  }
  // res.cookies traz o valor decodificado; no header ele volta codificado.
  return `${SESSION_COOKIE}=${encodeURIComponent(cookie.value)}`;
}
