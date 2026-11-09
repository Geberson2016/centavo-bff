import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  PROBLEM_JSON,
  buildTestApp,
  fakeJwt,
  loginCookie,
  startFakeBackend,
} from './helpers.ts';

const JWT = fakeJwt(3600);
const TOKEN = `Bearer ${JWT}`;

const summary = {
  totalBalance: 10,
  creditCardBill: 0,
  monthlySavings: 10,
  totalExpense: 0,
  totalRevenue: 10,
  scheduledRevenue: 0,
  scheduledExpense: 0,
};
const recent = [
  {
    description: 'Feira',
    categoryName: 'Mercado',
    date: '2026-11-08',
    value: 12.5,
    type: 'EXPENSE',
  },
];
const accountSummary = [
  {
    accountId: 1,
    accountName: 'Nubank',
    accountType: 'CREDIT_CARD',
    totalRevenue: 0,
    totalExpense: 12.5,
  },
];

describe('rotas /bff repassando ao Spring', () => {
  let backend: FastifyInstance;
  let app: FastifyInstance;
  let cookie: string;
  const seenAuth: Array<string | undefined> = [];
  let failRecent = false;

  beforeAll(async () => {
    const fake = await startFakeBackend((s) => {
      s.addHook('onRequest', async (req) => {
        seenAuth.push(req.headers.authorization);
      });
      s.get('/api/v1/accounts', async (req, reply) =>
        req.headers.authorization === TOKEN
          ? [{ id: 1, name: 'Nubank', type: 'CREDIT_CARD', userId: 7 }]
          : reply.code(403).send()
      );
      s.post('/api/v1/accounts', async (req, reply) =>
        reply.code(201).send({ id: 2, ...(req.body as object), userId: 7 })
      );
      s.post('/api/v1/transactions', async (_req, reply) =>
        reply
          .code(404)
          .type(PROBLEM_JSON)
          .send(
            JSON.stringify({
              status: 404,
              code: 'CATEGORY_NOT_FOUND',
              title: 'Not Found',
            })
          )
      );
      s.post('/api/v1/users/login', async () => ({
        id: 7,
        name: 'A',
        email: 'a@a.com',
        token: JWT,
      }));
      s.get('/api/v1/dashboard/summary', async () => summary);
      s.get('/api/v1/transactions/recent', async (_req, reply) =>
        failRecent
          ? reply
              .code(500)
              .type(PROBLEM_JSON)
              .send(JSON.stringify({ status: 500, code: 'INTERNAL_ERROR' }))
          : recent
      );
      s.get('/api/v1/accounts/accountSummary', async () => accountSummary);
    });
    backend = fake.server;
    app = await buildTestApp({ BACKEND_URL: fake.url });
    cookie = await loginCookie(app);
  });

  afterAll(async () => {
    await app.close();
    await backend.close();
  });

  it('GET /bff/accounts usa o JWT da sessão e devolve o corpo do Spring', async () => {
    seenAuth.length = 0;
    const res = await app.inject({
      method: 'GET',
      url: '/bff/accounts',
      headers: { cookie },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([
      { id: 1, name: 'Nubank', type: 'CREDIT_CARD', userId: 7 },
    ]);
    expect(seenAuth).toEqual([TOKEN]);
  });

  it('POST /bff/accounts devolve 201 com o corpo criado', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/bff/accounts',
      headers: { cookie },
      payload: { name: 'Caixa', type: 'CASH' },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({
      id: 2,
      name: 'Caixa',
      type: 'CASH',
      userId: 7,
    });
  });

  it('erro RFC 7807 do Spring passa intacto (status, content-type e code)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/bff/transactions',
      headers: { cookie },
      payload: { description: 'x' },
    });

    expect(res.statusCode).toBe(404);
    expect(res.headers['content-type']).toContain(PROBLEM_JSON);
    expect(res.json()).toEqual({
      status: 404,
      code: 'CATEGORY_NOT_FOUND',
      title: 'Not Found',
    });
  });

  it('GET /bff/dashboard agrega as três chamadas', async () => {
    failRecent = false;
    const res = await app.inject({
      method: 'GET',
      url: '/bff/dashboard',
      headers: { cookie },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      summary,
      recentTransactions: recent,
      accounts: accountSummary,
    });
  });

  it('GET /bff/dashboard devolve o erro da chamada que falhou', async () => {
    failRecent = true;
    const res = await app.inject({
      method: 'GET',
      url: '/bff/dashboard',
      headers: { cookie },
    });

    expect(res.statusCode).toBe(500);
    expect(res.json()).toMatchObject({ code: 'INTERNAL_ERROR' });
  });

  it('JSON malformado vira 400 VALIDATION_ERROR no formato RFC 7807', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/bff/accounts',
      headers: { cookie, 'content-type': 'application/json' },
      payload: '{nao-e-json',
    });

    expect(res.statusCode).toBe(400);
    expect(res.headers['content-type']).toContain(PROBLEM_JSON);
    expect(res.json()).toEqual({ status: 400, code: 'VALIDATION_ERROR' });
  });
});

// Usa o cadastro (rota pública) para chegar ao Spring sem precisar de sessão.
describe('Spring indisponível', () => {
  it('conexão recusada vira 502 UPSTREAM_UNAVAILABLE', async () => {
    // Sobe e derruba um servidor para ter uma porta garantidamente fechada.
    const { server, url } = await startFakeBackend(() => {});
    await server.close();
    const app = await buildTestApp({ BACKEND_URL: url });

    const res = await app.inject({
      method: 'POST',
      url: '/bff/users/register',
      payload: { name: 'A', email: 'a@a.com', password: '123456' },
    });
    await app.close();

    expect(res.statusCode).toBe(502);
    expect(res.headers['content-type']).toContain(PROBLEM_JSON);
    expect(res.json()).toMatchObject({
      status: 502,
      code: 'UPSTREAM_UNAVAILABLE',
    });
  });

  it('timeout vira 502 UPSTREAM_UNAVAILABLE', async () => {
    const { server, url } = await startFakeBackend((s) => {
      s.post('/api/v1/users/register', async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { name: 'A' };
      });
    });
    const app = await buildTestApp({
      BACKEND_URL: url,
      BACKEND_TIMEOUT_MS: '50',
    });

    const res = await app.inject({
      method: 'POST',
      url: '/bff/users/register',
      payload: { name: 'A', email: 'a@a.com', password: '123456' },
    });
    await app.close();
    await server.close();

    expect(res.statusCode).toBe(502);
    expect(res.json()).toMatchObject({ code: 'UPSTREAM_UNAVAILABLE' });
  });
});
