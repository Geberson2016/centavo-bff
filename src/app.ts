import Fastify, { type FastifyServerOptions } from 'fastify';
import type { Config } from './config.ts';
import { createBackendClient, type BackendClient } from './backend/client.ts';
import { registerErrorHandler } from './http/error-handler.ts';
import { registerSession } from './http/session.ts';
import { healthRoutes } from './routes/health.ts';
import { sessionRoutes } from './routes/session.ts';
import { userRoutes } from './routes/users.ts';
import { accountRoutes } from './routes/accounts.ts';
import { categoryRoutes } from './routes/categories.ts';
import { transactionRoutes } from './routes/transactions.ts';
import { dashboardRoutes } from './routes/dashboard.ts';

declare module 'fastify' {
  interface FastifyInstance {
    config: Config;
    backend: BackendClient;
  }
}

// Monta a aplicação sem dar listen, para os testes usarem app.inject().
export async function buildApp(config: Config) {
  const app = Fastify({ logger: loggerOptions(config) });

  app.decorate('config', config);
  app.decorate(
    'backend',
    createBackendClient(config.BACKEND_URL, config.BACKEND_TIMEOUT_MS)
  );
  registerErrorHandler(app);
  await registerSession(app, config);

  // CSRF: só JSON entra. Formulário de outro site (urlencoded, multipart, text/plain)
  // não consegue mandar application/json sem preflight de CORS, e cai em 415.
  app.removeContentTypeParser('text/plain');

  // JSON com corpo vazio (ex.: DELETE /bff/session com Content-Type: application/json)
  // vira body undefined em vez de 400. O resto segue no parser padrão do Fastify,
  // que já protege contra __proto__/constructor poisoning.
  const defaultJsonParser = app.getDefaultJsonParser('error', 'error');
  app.removeContentTypeParser('application/json');
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (request, body, done) => {
      // parseAs: 'string' garante string; o tipo do Fastify ainda admite Buffer.
      const text = body.toString();
      return text === ''
        ? done(null, undefined)
        : defaultJsonParser(request, text, done);
    }
  );

  await app.register(healthRoutes);
  await app.register(sessionRoutes);
  await app.register(userRoutes);
  await app.register(accountRoutes);
  await app.register(categoryRoutes);
  await app.register(transactionRoutes);
  await app.register(dashboardRoutes);

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
