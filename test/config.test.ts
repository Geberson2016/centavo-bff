import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.ts';

describe('loadConfig', () => {
  it('aplica os padrões quando o env está vazio', () => {
    const config = loadConfig({});

    expect(config).toMatchObject({
      NODE_ENV: 'development',
      HOST: '127.0.0.1',
      PORT: 3000,
      LOG_LEVEL: 'info',
      BACKEND_URL: 'http://localhost:8090',
    });
  });

  it('converte PORT de string para número', () => {
    expect(loadConfig({ PORT: '4000' }).PORT).toBe(4000);
  });

  it('falha no boot com config inválida, listando os campos', () => {
    expect(() => loadConfig({ PORT: 'abc', BACKEND_URL: 'nao-e-url' })).toThrow(
      /PORT[\s\S]*BACKEND_URL|BACKEND_URL[\s\S]*PORT/
    );
  });
});
