import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildTestApp } from './helpers.ts';

describe('GET /health', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(() => app.close());

  it('responde 200 com status ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });
});
