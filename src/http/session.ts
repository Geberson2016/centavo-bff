import type { FastifyInstance, FastifyRequest } from 'fastify';
import secureSession from '@fastify/secure-session';
import type { Config } from '../config.ts';
import type { SessionUser } from '../contract/types.ts';
import { UnauthenticatedError } from './errors.ts';

export const SESSION_COOKIE = 'centavo_session';

// O que fica guardado do usuário; o expiresAt vai à parte.
type SessionIdentity = Omit<SessionUser, 'expiresAt'>;

declare module '@fastify/secure-session' {
  interface SessionData {
    token: string;
    user: SessionIdentity;
    expiresAt: string;
  }
}

// Sessão sem estado no servidor: o JWT do Spring vai cifrado (libsodium) dentro do
// próprio cookie httpOnly. O browser guarda o cookie, mas não consegue ler o token.
export async function registerSession(app: FastifyInstance, config: Config) {
  await app.register(secureSession, {
    key: Buffer.from(config.SESSION_KEY, 'hex'),
    cookieName: SESSION_COOKIE,
    cookie: {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: config.SESSION_COOKIE_SECURE,
    },
  });
}

// Abre a sessão com o JWT recém-emitido. O cookie vive o mesmo tempo que o token.
export function openSession(
  request: FastifyRequest,
  token: string,
  user: SessionIdentity
): SessionUser {
  const expiresAt = jwtExpiry(token);
  request.session.set('token', token);
  request.session.set('user', user);
  request.session.set('expiresAt', expiresAt.toISOString());
  request.session.options({
    maxAge: Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
  });
  return { ...user, expiresAt: expiresAt.toISOString() };
}

// Sessão válida ou 401. Sessão vencida é apagada para o cookie não ficar rodando.
export function requireSession(request: FastifyRequest): {
  token: string;
  user: SessionIdentity;
  expiresAt: string;
} {
  const token = request.session.get('token');
  const user = request.session.get('user');
  const expiresAt = request.session.get('expiresAt');

  if (!token || !user || !expiresAt || Date.parse(expiresAt) <= Date.now()) {
    request.session.delete();
    throw new UnauthenticatedError();
  }
  return { token, user, expiresAt };
}

// Lê o `exp` do JWT do Spring sem validar a assinatura: quem valida o token é o
// Spring, a cada chamada. Aqui ele só define até quando o cookie vale.
function jwtExpiry(token: string): Date {
  const payload = token.split('.')[1];
  const exp: unknown = payload
    ? JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).exp
    : undefined;
  if (typeof exp !== 'number') {
    throw new Error('JWT do backend sem exp');
  }
  return new Date(exp * 1000);
}
