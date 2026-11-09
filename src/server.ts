import { buildApp } from './app.ts';
import { loadConfig } from './config.ts';

const config = loadConfig();
const app = await buildApp(config);

// Encerramento gracioso: para de aceitar conexões e termina as requests em curso.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    app.log.info({ signal }, 'encerrando o BFF');
    app.close().then(
      () => process.exit(0),
      (err: unknown) => {
        app.log.error(err, 'falha ao encerrar');
        process.exit(1);
      }
    );
  });
}

try {
  await app.listen({ host: config.HOST, port: config.PORT });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
