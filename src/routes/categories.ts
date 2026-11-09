import type { FastifyPluginAsync } from 'fastify';
import type { CategoryRequest } from '../contract/types.ts';
import { forwardAuth, unwrap } from '../http/upstream.ts';

export const categoryRoutes: FastifyPluginAsync = async (app) => {
  app.get('/bff/categories', async (request) =>
    unwrap(await app.backend.GET('/api/v1/categories', forwardAuth(request)))
  );

  app.post<{ Body: CategoryRequest }>(
    '/bff/categories',
    async (request, reply) => {
      const data = unwrap(
        await app.backend.POST('/api/v1/categories', {
          ...forwardAuth(request),
          body: request.body,
        })
      );
      return reply.code(201).send(data);
    }
  );
};
