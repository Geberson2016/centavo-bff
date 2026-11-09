import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.ts';
import { TEST_SESSION_KEY } from './helpers.ts';

const base = { SESSION_KEY: TEST_SESSION_KEY };

describe('loadConfig', () => {
  it('aplica os padrões quando só a chave de sessão é informada', () => {
    expect(loadConfig(base)).toMatchObject({
      NODE_ENV: 'development',
      HOST: '127.0.0.1',
      PORT: 3000,
      LOG_LEVEL: 'info',
      BACKEND_URL: 'http://localhost:8090',
      BACKEND_TIMEOUT_MS: 10000,
      SESSION_COOKIE_SECURE: false,
    });
  });

  it('converte PORT de string para número', () => {
    expect(loadConfig({ ...base, PORT: '4000' }).PORT).toBe(4000);
  });

  it('exige SESSION_KEY: segredo não tem padrão no código', () => {
    expect(() => loadConfig({})).toThrow(/SESSION_KEY/);
    expect(() => loadConfig({ SESSION_KEY: 'curta' })).toThrow(/SESSION_KEY/);
  });

  it('cookie Secure liga sozinho em produção e pode ser forçado', () => {
    expect(
      loadConfig({ ...base, NODE_ENV: 'production' }).SESSION_COOKIE_SECURE
    ).toBe(true);
    expect(
      loadConfig({ ...base, SESSION_COOKIE_SECURE: 'true' })
        .SESSION_COOKIE_SECURE
    ).toBe(true);
    expect(
      loadConfig({
        ...base,
        NODE_ENV: 'production',
        SESSION_COOKIE_SECURE: 'false',
      }).SESSION_COOKIE_SECURE
    ).toBe(false);
  });

  it('falha no boot com config inválida, listando os campos', () => {
    expect(() =>
      loadConfig({ ...base, PORT: 'abc', BACKEND_URL: 'nao-e-url' })
    ).toThrow(/PORT[\s\S]*BACKEND_URL|BACKEND_URL[\s\S]*PORT/);
  });
});
