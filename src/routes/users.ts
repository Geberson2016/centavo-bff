import type { FastifyPluginAsync } from 'fastify';
import type { AuthRequest, UserRequest } from '../contract/types.ts';
import { unwrap } from '../http/upstream.ts';

// Rotas públicas: não repassam Authorization.
export const userRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: UserRequest }>(
    '/bff/users/register',
    async (request, reply) => {
      const data = unwrap(
        await app.backend.POST('/api/v1/users/register', { body: request.body })
      );
      return reply.code(201).send(data);
    }
  );

  // Provisório até o C16, quando o login passa a abrir a sessão em cookie.
  app.post<{ Body: AuthRequest }>('/bff/users/login', async (request) =>
    unwrap(
      await app.backend.POST('/api/v1/users/login', { body: request.body })
    )
  );
};
