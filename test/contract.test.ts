import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance, HTTPMethods } from 'fastify';
import { parse } from 'yaml';
import { buildTestApp } from './helpers.ts';

interface Spec {
  paths: Record<string, Record<string, unknown>>;
}

const METHODS = new Set(['get', 'post', 'put', 'patch', 'delete']);
const spec = parse(
  readFileSync(new URL('../openapi.yaml', import.meta.url), 'utf8')
) as Spec;

const operations = Object.entries(spec.paths).flatMap(([path, item]) =>
  Object.keys(item)
    .filter((method) => METHODS.has(method))
    .map((method) => ({ path, method: method.toUpperCase() as HTTPMethods }))
);

// Contract-first: toda operação do openapi.yaml precisa de uma rota registrada.
describe('openapi.yaml × rotas registradas', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
    await app.ready();
  });

  afterAll(() => app.close());

  it('o contrato tem operações', () => {
    expect(operations.length).toBeGreaterThan(0);
  });

  it.each(operations)('$method $path está implementada', ({ path, method }) => {
    expect(
      app.hasRoute({ url: path.replace(/\{(\w+)\}/g, ':$1'), method })
    ).toBe(true);
  });
});
