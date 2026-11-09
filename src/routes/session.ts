import type { FastifyPluginAsync } from 'fastify';
import type { AuthRequest, SessionUser } from '../contract/types.ts';
import { unwrap } from '../http/upstream.ts';
import { openSession, requireSession } from '../http/session.ts';

export const sessionRoutes: FastifyPluginAsync = async (app) => {
  // Login: troca as credenciais pelo JWT do Spring e guarda o token só no cookie
  // cifrado. O corpo da resposta não traz o token.
  app.post<{ Body: AuthRequest }>('/bff/session', async (request) => {
    const { id, name, email, token } = unwrap(
      await app.backend.POST('/api/v1/users/login', { body: request.body })
    );
    return openSession(request, token, { id, name, email });
  });

  app.get('/bff/session', async (request): Promise<SessionUser> => {
    const { user, expiresAt } = requireSession(request);
    return { ...user, expiresAt };
  });

  // Logout idempotente: com ou sem sessão, o cookie sai zerado.
  app.delete('/bff/session', async (request, reply) => {
    request.session.delete();
    return reply.code(204).send();
  });
};
