import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { SESSION_COOKIE } from '../src/http/session.ts';
import {
  PROBLEM_JSON,
  buildTestApp,
  fakeJwt,
  loginCookie,
  startFakeBackend,
} from './helpers.ts';

describe('sessão em cookie', () => {
  let backend: FastifyInstance;
  let app: FastifyInstance;
  let jwt = fakeJwt(3600);
  let rejectToken = false;
  const seenAuth: Array<string | undefined> = [];

  beforeAll(async () => {
    const fake = await startFakeBackend((s) => {
      s.addHook('onRequest', async (req) => {
        seenAuth.push(req.headers.authorization);
      });
      s.post('/api/v1/users/login', async (req, reply) => {
        const { password } = req.body as { password: string };
        if (password !== '123456') {
          return reply
            .code(401)
            .type(PROBLEM_JSON)
            .send(JSON.stringify({ status: 401, code: 'INVALID_CREDENTIALS' }));
        }
        return { id: 7, name: 'Ana', email: 'a@a.com', token: jwt };
      });
      s.get('/api/v1/accounts', async (_req, reply) =>
        rejectToken ? reply.code(403).send() : []
      );
    });
    backend = fake.server;
    app = await buildTestApp({ BACKEND_URL: fake.url });
  });

  afterAll(async () => {
    await app.close();
    await backend.close();
  });

  it('login abre a sessão: cookie httpOnly/SameSite e sem token no corpo', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/bff/session',
      payload: { email: 'a@a.com', password: '123456' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toMatchObject({ id: 7, name: 'Ana', email: 'a@a.com' });
    expect(Date.parse(body.expiresAt)).toBeGreaterThan(Date.now());
    expect(res.body).not.toContain(jwt);

    const cookie = res.cookies.find((c) => c.name === SESSION_COOKIE);
    expect(cookie).toMatchObject({
      httpOnly: true,
      sameSite: 'Lax',
      path: '/',
    });
    expect(cookie?.maxAge).toBeGreaterThan(3500);
    expect(cookie?.maxAge).toBeLessThanOrEqual(3600);
    // Cifrado: o valor do cookie não expõe o JWT.
    expect(cookie?.value).not.toContain(jwt.split('.')[1]);
  });

  it('credencial inválida repassa 401 INVALID_CREDENTIALS sem abrir sessão', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/bff/session',
      payload: { email: 'a@a.com', password: 'errada' },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(res.cookies.find((c) => c.name === SESSION_COOKIE)).toBeUndefined();
  });

  it('com sessão, o BFF manda o JWT ao Spring como Bearer', async () => {
    const cookie = await loginCookie(app);
    seenAuth.length = 0;

    const res = await app.inject({
      method: 'GET',
      url: '/bff/accounts',
      headers: { cookie },
    });

    expect(res.statusCode).toBe(200);
    expect(seenAuth).toEqual([`Bearer ${jwt}`]);
  });

  it('GET /bff/session devolve o usuário da sessão', async () => {
    const cookie = await loginCookie(app);

    const res = await app.inject({
      method: 'GET',
      url: '/bff/session',
      headers: { cookie },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: 7, name: 'Ana', email: 'a@a.com' });
  });

  it('sem sessão: 401 UNAUTHENTICATED e o Spring nem é chamado', async () => {
    seenAuth.length = 0;

    const res = await app.inject({ method: 'GET', url: '/bff/accounts' });

    expect(res.statusCode).toBe(401);
    expect(res.headers['content-type']).toContain(PROBLEM_JSON);
    expect(res.json()).toEqual({ status: 401, code: 'UNAUTHENTICATED' });
    expect(seenAuth).toEqual([]);
  });

  it('Authorization mandado pela UI é ignorado: só a sessão autentica', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/bff/accounts',
      headers: { authorization: `Bearer ${jwt}` },
    });

    expect(res.statusCode).toBe(401);
  });

  it('cookie adulterado conta como sem sessão', async () => {
    const cookie = await loginCookie(app);
    const tampered = cookie.slice(0, -4) + 'AAAA';

    const res = await app.inject({
      method: 'GET',
      url: '/bff/session',
      headers: { cookie: tampered },
    });

    expect(res.statusCode).toBe(401);
  });

  it('JWT vencido: 401 e o cookie é apagado', async () => {
    jwt = fakeJwt(-10);
    const cookie = await loginCookie(app);
    jwt = fakeJwt(3600);

    const res = await app.inject({
      method: 'GET',
      url: '/bff/accounts',
      headers: { cookie },
    });

    expect(res.statusCode).toBe(401);
    const cleared = res.cookies.find((c) => c.name === SESSION_COOKIE);
    expect(cleared?.value).toBe('');
  });

  it('Spring recusando o token (403) vira 401 e apaga o cookie', async () => {
    const cookie = await loginCookie(app);
    rejectToken = true;

    const res = await app.inject({
      method: 'GET',
      url: '/bff/accounts',
      headers: { cookie },
    });
    rejectToken = false;

    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(res.cookies.find((c) => c.name === SESSION_COOKIE)?.value).toBe('');
  });

  it('logout apaga o cookie e é idempotente', async () => {
    const cookie = await loginCookie(app);

    const res = await app.inject({
      method: 'DELETE',
      url: '/bff/session',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(204);
    expect(res.cookies.find((c) => c.name === SESSION_COOKIE)?.value).toBe('');

    const again = await app.inject({ method: 'DELETE', url: '/bff/session' });
    expect(again.statusCode).toBe(204);
  });

  it('logout aceita Content-Type JSON com corpo vazio', async () => {
    const cookie = await loginCookie(app);

    const res = await app.inject({
      method: 'DELETE',
      url: '/bff/session',
      headers: { cookie, 'content-type': 'application/json' },
    });

    expect(res.statusCode).toBe(204);
    expect(res.cookies.find((c) => c.name === SESSION_COOKIE)?.value).toBe('');
  });

  it('JSON com __proto__ continua barrado pelo parser padrão', async () => {
    const cookie = await loginCookie(app);

    const res = await app.inject({
      method: 'POST',
      url: '/bff/accounts',
      headers: { cookie, 'content-type': 'application/json' },
      payload: '{"name":"x","__proto__":{"admin":true}}',
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('CSRF: escrita com content-type de formulário recebe 415', async () => {
    const cookie = await loginCookie(app);

    for (const contentType of [
      'text/plain',
      'application/x-www-form-urlencoded',
    ]) {
      const res = await app.inject({
        method: 'POST',
        url: '/bff/accounts',
        headers: { cookie, 'content-type': contentType },
        payload: '{"name":"x","type":"CASH"}',
      });
      expect(res.statusCode).toBe(415);
      expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
    }
  });
});
