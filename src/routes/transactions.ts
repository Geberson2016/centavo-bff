import type { FastifyPluginAsync } from 'fastify';
import type { TransactionRequest } from '../contract/types.ts';
import { forwardAuth, unwrap } from '../http/upstream.ts';

export const transactionRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: TransactionRequest }>(
    '/bff/transactions',
    async (request, reply) => {
      const data = unwrap(
        await app.backend.POST('/api/v1/transactions', {
          ...forwardAuth(request),
          body: request.body,
        })
      );
      return reply.code(201).send(data);
    }
  );
};
