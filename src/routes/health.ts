import type { FastifyPluginAsync } from 'fastify';

// Liveness: responde enquanto o processo estiver de pé. Não consulta o Spring de
// propósito — se o backend cair, o BFF não deve ser reiniciado por isso.
export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/health',
    {
      logLevel: 'warn',
      schema: {
        response: {
          200: {
            type: 'object',
            required: ['status'],
            properties: { status: { type: 'string', enum: ['ok'] } },
          },
        },
      },
    },
    async () => ({ status: 'ok' as const })
  );
};
