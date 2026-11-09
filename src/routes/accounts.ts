import type { FastifyPluginAsync } from 'fastify';
import type { AccountRequest } from '../contract/types.ts';
import { forwardAuth, unwrap } from '../http/upstream.ts';

export const accountRoutes: FastifyPluginAsync = async (app) => {
  app.get('/bff/accounts', async (request) =>
    unwrap(await app.backend.GET('/api/v1/accounts', forwardAuth(request)))
  );

  app.post<{ Body: AccountRequest }>(
    '/bff/accounts',
    async (request, reply) => {
      const data = unwrap(
        await app.backend.POST('/api/v1/accounts', {
          ...forwardAuth(request),
          body: request.body,
        })
      );
      return reply.code(201).send(data);
    }
  );
};
