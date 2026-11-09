import Fastify, { type FastifyServerOptions } from 'fastify';
import type { Config } from './config.ts';
import { healthRoutes } from './routes/health.ts';

declare module 'fastify' {
  interface FastifyInstance {
    config: Config;
  }
}

// Monta a aplicação sem dar listen, para os testes usarem app.inject().
export async function buildApp(config: Config) {
  const app = Fastify({ logger: loggerOptions(config) });

  app.decorate('config', config);
  await app.register(healthRoutes);

  return app;
}

function loggerOptions(config: Config): FastifyServerOptions['logger'] {
  if (config.NODE_ENV === 'test') return false;
  if (config.NODE_ENV === 'development') {
    return {
      level: config.LOG_LEVEL,
      transport: {
        target: 'pino-pretty',
        options: { translateTime: 'SYS:HH:MM:ss' },
      },
    };
  }
  // Produção: JSON estruturado (pino), pronto para agregador de logs.
  return { level: config.LOG_LEVEL };
}
