import type { FastifyPluginAsync } from 'fastify';
import type { UserRequest } from '../contract/types.ts';
import { unwrap } from '../http/upstream.ts';

// Cadastro é público. O login fica em /bff/session (routes/session.ts).
export const userRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: UserRequest }>(
    '/bff/users/register',
    async (request, reply) => {
      const data = unwrap(
        await app.backend.POST('/api/v1/users/register', {
          body: request.body,
        })
      );
      return reply.code(201).send(data);
    }
  );
};
